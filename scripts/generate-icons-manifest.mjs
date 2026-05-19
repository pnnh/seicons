import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(import.meta.url);
const iconsDir = path.join(root, "node_modules/react-icons");

const SKIP_PACKAGES = new Set(["lib"]);

const packages = fs
  .readdirSync(iconsDir)
  .filter((name) => {
    if (SKIP_PACKAGES.has(name)) return false;
    const pkgPath = path.join(iconsDir, name);
    return fs.statSync(pkgPath).isDirectory() && fs.existsSync(path.join(pkgPath, "index.js"));
  })
  .sort();

/** @type {{ p: string; n: string }[]} */
const manifest = [];

for (const pkg of packages) {
  const mod = require(path.join(iconsDir, pkg));
  for (const name of Object.keys(mod)) {
    if (typeof mod[name] !== "function") continue;
    if (!/^[A-Z]/.test(name)) continue;
    manifest.push({ p: pkg, n: name });
  }
}

manifest.sort((a, b) => a.n.localeCompare(b.n) || a.p.localeCompare(b.p));

const outPath = path.join(root, "src/data/icons-manifest.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest));

console.log(`Wrote ${manifest.length} icons to ${outPath}`);
