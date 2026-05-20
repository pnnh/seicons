import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import initSqlJs from "sql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(import.meta.url);
const outDb = path.join(root, "src/data/icons.db");

const LIB_REACT_ICONS = "react-icons";
const LIB_MUI = "mui";

const RI_OUTLINED_PACKS = new Set([
  "bi", "cg", "ci", "di", "fi", "go", "gr", "hi", "hi2", "io5", "lu", "pi", "ri", "tb", "ti", "vsc",
]);
const RI_ROUNDED_PACKS = new Set(["bs"]);

function reactIconsStyle(pkg) {
  if (RI_OUTLINED_PACKS.has(pkg)) return "outlined";
  if (RI_ROUNDED_PACKS.has(pkg)) return "rounded";
  return "filled";
}

function muiStyle(name) {
  if (name.endsWith("Outlined")) return "outlined";
  if (name.endsWith("Rounded")) return "rounded";
  if (name.endsWith("Sharp")) return "sharp";
  if (name.endsWith("TwoTone")) return "two-tone";
  return "filled";
}

function collectReactIcons() {
  const iconsDir = path.join(root, "node_modules/react-icons");
  const skip = new Set(["lib"]);
  const packages = fs
    .readdirSync(iconsDir)
    .filter((name) => {
      if (skip.has(name)) return false;
      const pkgPath = path.join(iconsDir, name);
      return fs.statSync(pkgPath).isDirectory() && fs.existsSync(path.join(pkgPath, "index.js"));
    });

  const rows = [];
  for (const pkg of packages) {
    const mod = require(path.join(iconsDir, pkg));
    const style = reactIconsStyle(pkg);
    for (const name of Object.keys(mod)) {
      if (typeof mod[name] !== "function") continue;
      if (!/^[A-Z]/.test(name)) continue;
      rows.push([LIB_REACT_ICONS, pkg, name, style]);
    }
  }
  return rows;
}

function collectMuiIcons() {
  const dir = path.join(root, "node_modules/@mui/icons-material");
  const skip = new Set(["index.js", "utils.js"]);
  const rows = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".js") || skip.has(file)) continue;
    const name = file.replace(/\.js$/, "");
    if (!/^[A-Z]/.test(name)) continue;
    rows.push([LIB_MUI, "mui", name, muiStyle(name)]);
  }
  return rows;
}


function writeMuiLoaders(muiNames) {
  const outDir = path.join(root, "src/lib/mui-loaders");
  fs.mkdirSync(outDir, { recursive: true });

  const byLetter = new Map();
  for (const name of muiNames) {
    const letter = name[0];
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter).push(name);
  }

  const letters = [...byLetter.keys()].sort();
  for (const letter of letters) {
    const names = byLetter.get(letter).sort();
    const lines = [
      'import type { SvgIconComponent } from "@mui/icons-material";',
      "",
      `export const muiIconLoaders${letter}: Record<string, () => Promise<{ default: SvgIconComponent }>> = {`,
    ];
    for (const name of names) {
      lines.push(`  ${JSON.stringify(name)}: () => import("@mui/icons-material/${name}"),`);
    }
    lines.push("};");
    lines.push("");
    fs.writeFileSync(path.join(outDir, `${letter}.ts`), lines.join("\n"));
  }

  const indexLines = [
    'import type { SvgIconComponent } from "@mui/icons-material";',
    "",
  ];
  for (const letter of letters) {
    indexLines.push(`import { muiIconLoaders${letter} } from "./${letter}";`);
  }
  indexLines.push("");
  indexLines.push("const loaderGroups: Record<string, Record<string, () => Promise<{ default: SvgIconComponent }>>> = {");
  for (const letter of letters) {
    indexLines.push(`  ${JSON.stringify(letter)}: muiIconLoaders${letter},`);
  }
  indexLines.push("};");
  indexLines.push("");
  indexLines.push("export async function loadMuiIcon(name: string): Promise<SvgIconComponent | null> {");
  indexLines.push("  const group = loaderGroups[name[0]];");
  indexLines.push("  if (!group) return null;");
  indexLines.push("  const loader = group[name];");
  indexLines.push("  if (!loader) return null;");
  indexLines.push("  try {");
  indexLines.push("    const mod = await loader();");
  indexLines.push("    return mod.default ?? null;");
  indexLines.push("  } catch {");
  indexLines.push("    return null;");
  indexLines.push("  }");
  indexLines.push("}");
  indexLines.push("");

  fs.writeFileSync(path.join(outDir, "index.ts"), indexLines.join("\n"));
  fs.rmSync(path.join(root, "src/lib/mui-icon-loaders.ts"), { force: true });
  console.log(`Wrote MUI loaders in ${outDir} (${letters.length} groups, ${muiNames.length} icons)`);
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE icons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lib TEXT NOT NULL,
      p TEXT NOT NULL,
      n TEXT NOT NULL,
      s TEXT NOT NULL
    );
    CREATE INDEX idx_icons_lib ON icons(lib);
    CREATE INDEX idx_icons_style ON icons(s);
    CREATE INDEX idx_icons_name ON icons(n);
    CREATE INDEX idx_icons_pack ON icons(p);
  `);

  const insert = db.prepare("INSERT INTO icons (lib, p, n, s) VALUES (?, ?, ?, ?)");
  const reactRows = collectReactIcons();
  const muiRows = collectMuiIcons();
  const all = [...reactRows, ...muiRows].sort((a, b) => a[2].localeCompare(b[2]));

  for (const row of all) insert.run(row);
  insert.free();

  writeMuiLoaders(muiRows.map((r) => r[2]));

  fs.mkdirSync(path.dirname(outDb), { recursive: true });
  fs.writeFileSync(outDb, Buffer.from(db.export()));
  db.close();

  console.log(`Wrote ${all.length} icons to ${outDb}`);
  console.log(`  react-icons: ${reactRows.length}`);
  console.log(`  mui: ${muiRows.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
