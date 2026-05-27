/**
 * scripts/upload-icons-r2.mjs
 *
 * One-time (or incremental) upload of all SVG files from public/icons/ to
 * a Cloudflare R2 bucket.  Files are uploaded preserving the path structure
 * icons/{lib}/{pkg}/{name}.svg, matching the local Next.js static serving path.
 *
 * Authentication (in order of precedence):
 *   1. CLOUDFLARE_API_TOKEN  env var
 *   2. CF_API_TOKEN          env var
 *   3. OAuth token from ~/.config/.wrangler/config/default.toml  (wrangler login)
 *
 * Required env vars / config:
 *   R2_BUCKET_NAME           — name of the R2 bucket (default: "seicons-icons")
 *   CLOUDFLARE_ACCOUNT_ID    — or CF_ACCOUNT_ID, or auto-detected
 *
 * Options:
 *   --force    Re-upload files that already exist in the bucket
 *   --dry-run  Print what would be uploaded without uploading
 *
 * Run:
 *   node scripts/upload-icons-r2.mjs
 *   node scripts/upload-icons-r2.mjs --force
 *   node scripts/upload-icons-r2.mjs --dry-run
 */

import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "public/icons");

const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENCY = 20;
const BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "seicons-icons";

// ── Auth ──────────────────────────────────────────────────────────────────

function getAuthToken() {
    if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
    if (process.env.CF_API_TOKEN) return process.env.CF_API_TOKEN;

    const configPath = path.join(os.homedir(), ".config", ".wrangler", "config", "default.toml");
    if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf8");
        const match = content.match(/oauth_token\s*=\s*"([^"]+)"/);
        if (match) return match[1];
    }
    return null;
}

async function getAccountId(token) {
    if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
    if (process.env.CF_ACCOUNT_ID) return process.env.CF_ACCOUNT_ID;

    const res = await fetch("https://api.cloudflare.com/client/v4/accounts?per_page=1", {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const id = data?.result?.[0]?.id;
    if (!id) throw new Error(`Could not get account ID: ${JSON.stringify(data?.errors)}`);
    return id;
}

// ── R2 helpers ────────────────────────────────────────────────────────────

async function r2Head(accountId, bucket, key, token) {
    const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects/${encodeURIComponent(key)}`,
        { method: "HEAD", headers: { Authorization: `Bearer ${token}` } },
    );
    return res.ok;
}

async function r2Put(accountId, bucket, key, body, token) {
    const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects/${encodeURIComponent(key)}`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "image/svg+xml",
            },
            body,
        },
    );
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`R2 PUT ${key} failed (${res.status}): ${text}`);
    }
}

// ── File discovery ────────────────────────────────────────────────────────

function collectSvgFiles(dir, base = "") {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            files.push(...collectSvgFiles(path.join(dir, entry.name), rel));
        } else if (entry.name.endsWith(".svg")) {
            files.push({ abs: path.join(dir, entry.name), key: `icons/${rel}` });
        }
    }
    return files;
}

// ── Concurrency pool ──────────────────────────────────────────────────────

async function runPool(items, concurrency, fn) {
    let idx = 0;
    let completed = 0;
    const total = items.length;

    async function worker() {
        while (idx < total) {
            const i = idx++;
            await fn(items[i], i);
            completed++;
            if (completed % 500 === 0 || completed === total) {
                process.stdout.write(`  ${completed}/${total}\r`);
            }
        }
    }

    await Promise.all(Array.from({ length: concurrency }, worker));
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
    if (!fs.existsSync(iconsDir)) {
        console.error(`public/icons/ not found. Run \`pnpm generate:icons\` first.`);
        process.exit(1);
    }

    const token = getAuthToken();
    if (!token) {
        console.error("No Cloudflare auth found. Run `wrangler login` or set CLOUDFLARE_API_TOKEN.");
        process.exit(1);
    }

    console.log("Getting account ID…");
    const accountId = await getAccountId(token);
    console.log(`  account: ${accountId}`);
    console.log(`  bucket:  ${BUCKET_NAME}`);

    const files = collectSvgFiles(iconsDir);
    console.log(`Found ${files.length} SVG files in ${iconsDir}`);

    if (DRY_RUN) {
        console.log("[dry-run] First 5 keys that would be uploaded:");
        files.slice(0, 5).forEach((f) => console.log(`  ${f.key}`));
        console.log("[dry-run] Done.");
        return;
    }

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    await runPool(files, CONCURRENCY, async ({ abs, key }) => {
        try {
            if (!FORCE) {
                const exists = await r2Head(accountId, BUCKET_NAME, key, token);
                if (exists) {
                    skipped++;
                    return;
                }
            }
            const body = fs.readFileSync(abs);
            await r2Put(accountId, BUCKET_NAME, key, body, token);
            uploaded++;
        } catch (err) {
            failed++;
            console.error(`\n  FAILED ${key}: ${err.message}`);
        }
    });

    console.log(`\nDone.`);
    console.log(`  uploaded: ${uploaded}`);
    console.log(`  skipped (already exists): ${skipped}`);
    if (failed) console.log(`  failed: ${failed}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
