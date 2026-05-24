/**
 * scripts/seed-d1-large.mjs
 *
 * Inserts rows whose SVG data exceeds D1's 100 KB SQL statement limit using the
 * Cloudflare D1 REST API with parameterized queries.  Unlike wrangler d1 execute
 * --file, parameterized queries pass the SVG as a value (not SQL text), so the
 * 100 KB limit does not apply.
 *
 * Authentication (in order of precedence):
 *   1. CLOUDFLARE_API_TOKEN  env var
 *   2. CF_API_TOKEN          env var
 *   3. OAuth token from ~/.config/.wrangler/config/default.toml  (wrangler login)
 *
 * Account ID (in order of precedence):
 *   1. CLOUDFLARE_ACCOUNT_ID env var
 *   2. Detected via GET /client/v4/accounts
 *
 * Database ID is read from wrangler.jsonc automatically.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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

function getDatabaseId() {
  const content = fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
  const json = content.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const config = JSON.parse(json);
  const id = config.d1_databases?.[0]?.database_id;
  if (!id || id === "<DATABASE_ID>") throw new Error("database_id not set in wrangler.jsonc");
  return id;
}

// ── D1 REST API ──────────────────────────────────────────────────────────

async function d1Query(accountId, dbId, token, sql, params) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    },
  );
  const data = await res.json();
  if (!data.success) {
    throw new Error(`D1 query error: ${JSON.stringify(data.errors)}`);
  }
  return data;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const token = getAuthToken();
  if (!token) {
    console.error("No Cloudflare auth found. Run `wrangler login` or set CLOUDFLARE_API_TOKEN.");
    process.exit(1);
  }

  const dbPath = path.join(root, "src/data/icons.db");
  if (!fs.existsSync(dbPath)) {
    console.error(`icons.db not found at ${dbPath}. Run pnpm generate:icons first.`);
    process.exit(1);
  }

  console.log("Getting account ID…");
  const accountId = await getAccountId(token);
  console.log(`  account: ${accountId}`);

  const databaseId = getDatabaseId();
  console.log(`  database: ${databaseId}`);

  console.log("Loading icons.db…");
  const { default: initSqlJs } = await import("sql.js");
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Must exactly match export-d1-sql.mjs: rows are skipped when the full
  // INSERT statement (raw SVG SQL-escaped + ~300 bytes of statement overhead)
  // exceeds 99_000 bytes.  We approximate that on the SQLite side: if the raw
  // SVG is longer than 98_700 bytes the escaped form is guaranteed to push the
  // statement over the limit.  Using 98_700 keeps us tightly aligned with the
  // export script and prevents the overlap that caused duplicate rows.
  const result = db.exec(
    "SELECT lib, p, n, s, svg FROM icons WHERE LENGTH(svg) > 98700 ORDER BY lib, p, n",
  );
  const rows = result[0]?.values ?? [];
  db.close();

  if (rows.length === 0) {
    console.log("No oversized rows found — nothing to do.");
    return;
  }

  console.log(`Inserting ${rows.length} oversized rows via D1 REST API…`);
  let ok = 0;
  let failed = 0;

  for (const [lib, p, n, s, svg] of rows) {
    try {
      await d1Query(
        accountId,
        databaseId,
        token,
        "INSERT OR REPLACE INTO icons (lib,p,n,s,svg) VALUES (?,?,?,?,?)",
        [lib, p, n, s, svg],
      );
      ok++;
      process.stdout.write(`  ${ok}/${rows.length} (${lib}/${p}/${n})\r`);
    } catch (err) {
      failed++;
      console.error(`\n  FAILED ${lib}/${p}/${n}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${ok} inserted, ${failed} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
