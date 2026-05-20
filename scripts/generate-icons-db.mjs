import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import initSqlJs from "sql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(import.meta.url);
const outDb = path.join(root, "src/data/icons.db");
const muiLoadersDir = path.join(root, "src/lib/mui-loaders");

const LIB_REACT_ICONS = "react-icons";
const LIB_MUI = "mui";
const PREVIEW_SIZE = 24;
const ICON_COLOR = "#000000";

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

function normalizeSvgMarkup(raw) {
  const match = String(raw).match(/<svg[\s\S]*<\/svg>/i);
  if (!match) return null;

  let svg = match[0];
  svg = svg.replace(/currentColor/g, ICON_COLOR);
  svg = svg.replace(/\sclass="[^"]*"/g, "");
  svg = svg.replace(/\sdata-testid="[^"]*"/g, "");
  svg = svg.replace(/\sfocusable="[^"]*"/g, "");
  svg = svg.replace(/\saria-hidden="[^"]*"/g, "");
  svg = svg.replace(/\scolor="[^"]*"/g, "");

  if (!/xmlns=/.test(svg)) {
    svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  svg = svg.replace(/<svg([^>]*)>/, (_, attrs) => {
    const withoutSize = attrs
      .replace(/\swidth="[^"]*"/g, "")
      .replace(/\sheight="[^"]*"/g, "");
    return `<svg${withoutSize} width="${PREVIEW_SIZE}" height="${PREVIEW_SIZE}">`;
  });

  return svg;
}

function renderReactIconSvg(pkg, name) {
  try {
    const mod = require(path.join(root, "node_modules/react-icons", pkg));
    const Comp = mod[name];
    if (typeof Comp !== "function") return null;
    const html = renderToStaticMarkup(
      createElement(Comp, { size: PREVIEW_SIZE, color: ICON_COLOR }),
    );
    return normalizeSvgMarkup(html);
  } catch {
    return null;
  }
}

function renderMuiIconSvg(name) {
  try {
    const mod = require(path.join(root, "node_modules/@mui/icons-material", name));
    const Comp = mod.default;
    if (!Comp) return null;
    const html = renderToStaticMarkup(
      createElement(Comp, { sx: { fontSize: PREVIEW_SIZE }, htmlColor: ICON_COLOR }),
    );
    return normalizeSvgMarkup(html);
  } catch {
    return null;
  }
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
    const style = reactIconsStyle(pkg);
    const mod = require(path.join(iconsDir, pkg));
    for (const name of Object.keys(mod)) {
      if (typeof mod[name] !== "function") continue;
      if (!/^[A-Z]/.test(name)) continue;
      rows.push({ lib: LIB_REACT_ICONS, p: pkg, n: name, s: style });
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
    rows.push({ lib: LIB_MUI, p: "mui", n: name, s: muiStyle(name) });
  }
  return rows;
}

async function main() {
  if (fs.existsSync(muiLoadersDir)) {
    fs.rmSync(muiLoadersDir, { recursive: true, force: true });
    console.log("Removed legacy src/lib/mui-loaders");
  }

  const reactMeta = collectReactIcons();
  const muiMeta = collectMuiIcons();
  const allMeta = [...reactMeta, ...muiMeta].sort((a, b) => a.n.localeCompare(b.n));

  console.log(`Rendering SVG for ${allMeta.length} icons…`);

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE icons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lib TEXT NOT NULL,
      p TEXT NOT NULL,
      n TEXT NOT NULL,
      s TEXT NOT NULL,
      svg TEXT NOT NULL
    );
    CREATE INDEX idx_icons_lib ON icons(lib);
    CREATE INDEX idx_icons_style ON icons(s);
    CREATE INDEX idx_icons_name ON icons(n);
    CREATE INDEX idx_icons_pack ON icons(p);
  `);

  const insert = db.prepare(
    "INSERT INTO icons (lib, p, n, s, svg) VALUES (?, ?, ?, ?, ?)",
  );

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < allMeta.length; i++) {
    const { lib, p, n, s } = allMeta[i];
    const svg =
      lib === LIB_MUI ? renderMuiIconSvg(n) : renderReactIconSvg(p, n);

    if (!svg) {
      failed++;
      continue;
    }

    insert.run([lib, p, n, s, svg]);
    ok++;

    if ((i + 1) % 500 === 0 || i + 1 === allMeta.length) {
      console.log(`  ${i + 1}/${allMeta.length} (${ok} ok, ${failed} skipped)`);
    }
  }

  insert.free();

  fs.mkdirSync(path.dirname(outDb), { recursive: true });
  fs.writeFileSync(outDb, Buffer.from(db.export()));
  db.close();

  const sizeMb = (fs.statSync(outDb).size / 1024 / 1024).toFixed(2);
  console.log(`Wrote ${ok} icons to ${outDb} (${sizeMb} MB)`);
  if (failed) console.log(`  skipped ${failed} icons (render failed)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
