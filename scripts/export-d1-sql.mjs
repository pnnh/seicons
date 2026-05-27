/**
 * scripts/export-d1-sql.mjs
 *
 * Fast SQL dump from the existing src/data/icons.db for Cloudflare D1 import.
 * Uses 1 row per INSERT statement to stay within D1's SQLITE_TOOBIG limit.
 *
 * Run:  node scripts/export-d1-sql.mjs
 * Then: pnpm d1:seed  (remote) or  pnpm d1:seed:local
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dbPath = path.join(root, "src/data/icons.db");
const sqlPath = path.join(root, "src/data/icons.sql");

async function main() {
  if (!fs.existsSync(dbPath)) {
    console.error(`icons.db not found at ${dbPath}. Run pnpm generate:icons first.`);
    process.exit(1);
  }

  console.log(`Reading ${dbPath}…`);
  const { default: initSqlJs } = await import("sql.js");
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  const result = db.exec("SELECT lib, p, n, s FROM icons ORDER BY rowid");
  const rows = result[0]?.values ?? [];
  console.log(`  ${rows.length} icons found`);

  const esc = (s) => `'${String(s).replace(/'/g, "''")}'`;

  console.log(`Writing ${sqlPath}…`);
  const ws = fs.createWriteStream(sqlPath, { encoding: "utf8" });

  ws.write("DROP TABLE IF EXISTS icons;\n");
  ws.write(
    "CREATE TABLE icons (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "lib TEXT NOT NULL, " +
    "p TEXT NOT NULL, " +
    "n TEXT NOT NULL, " +
    "s TEXT NOT NULL" +
    ");\n",
  );
  ws.write("CREATE INDEX idx_icons_lib ON icons(lib);\n");
  ws.write("CREATE INDEX idx_icons_style ON icons(s);\n");
  ws.write("CREATE INDEX idx_icons_name ON icons(n);\n");
  ws.write("CREATE INDEX idx_icons_pack ON icons(p);\n");

  let written = 0;

  for (let i = 0; i < rows.length; i++) {
    const [lib, p, n, s] = rows[i];
    const stmt = `INSERT OR REPLACE INTO icons (lib,p,n,s) VALUES (${[lib, p, n, s].map(esc).join(",")});\n`;
    ws.write(stmt);
    written++;
    if ((i + 1) % 10000 === 0) {
      process.stdout.write(`  ${i + 1}/${rows.length}\r`);
    }
  }

  await new Promise((resolve, reject) => ws.end((err) => (err ? reject(err) : resolve())));
  db.close();

  const sizeMb = (fs.statSync(sqlPath).size / 1024 / 1024).toFixed(2);
  console.log(`\nWrote ${written} rows to ${sqlPath} (${sizeMb} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
