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
const LIB_HEROICONS = "heroicons";
const LIB_LUCIDE = "lucide";
const LIB_TABLER = "tabler";
const LIB_PHOSPHOR = "phosphor";
const LIB_FONTAWESOME = "fontawesome";
const LIB_REMIX = "remix";
const LIB_LINEICONS = "lineicons";
const LIB_SVGMOJI = "svgmoji";

const PHOSPHOR_WEIGHTS = ["thin", "light", "regular", "bold", "fill", "duotone"];
const HEROICON_PATHS = [
  { p: "24/outline", s: "outlined" },
  { p: "24/solid", s: "filled" },
  { p: "20/solid", s: "filled" },
  { p: "16/solid", s: "filled" },
];

let phosphorModule = null;
let lineiconsModule = null;
let svgmojiSets = null;
const svgFetchCache = new Map();

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

function phosphorStyle(weight) {
  if (weight === "duotone") return "two-tone";
  if (weight === "fill" || weight === "bold") return "filled";
  return "outlined";
}

function lineiconsStyle(name) {
  if (name.endsWith("Duotone")) return "two-tone";
  if (name.endsWith("Solid") || name.endsWith("Bulk")) return "filled";
  if (name.endsWith("Outlined") || name.endsWith("Stroke")) return "outlined";
  return "filled";
}

function fontAwesomeStyle(pkg) {
  if (pkg === "regular") return "outlined";
  return "filled";
}


function isIconComponent(Comp) {
  return (
    typeof Comp === "function" ||
    (typeof Comp === "object" && Comp !== null && "$$typeof" in Comp)
  );
}


function normalizeEmojiSvgMarkup(raw) {
  const match = String(raw).match(/<svg[\s\S]*<\/svg>/i);
  if (!match) return null;

  let svg = match[0];
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

async function fetchSvgCached(url, retries = 2) {
  if (svgFetchCache.has(url)) return svgFetchCache.get(url);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (attempt < retries) continue;
        svgFetchCache.set(url, null);
        return null;
      }
      const text = await res.text();
      svgFetchCache.set(url, text);
      return text;
    } catch {
      if (attempt < retries) continue;
      svgFetchCache.set(url, null);
      return null;
    }
  }
  svgFetchCache.set(url, null);
  return null;
}

function spriteFilePath(setName) {
  const direct = path.join(root, "node_modules/@svgmoji", setName, "sprites/all.svg");
  if (fs.existsSync(direct)) return direct;

  const pnpmDir = path.join(root, "node_modules/.pnpm");
  if (fs.existsSync(pnpmDir)) {
    for (const entry of fs.readdirSync(pnpmDir)) {
      if (!entry.startsWith(`@svgmoji+${setName}@`)) continue;
      const candidate = path.join(
        pnpmDir,
        entry,
        "node_modules/@svgmoji",
        setName,
        "sprites/all.svg",
      );
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function extractEmojiFromSprite(sprite, hexcode) {
  const ids = [
    hexcode,
    hexcode.replace(/-FE0F/g, ""),
    hexcode.includes("-") ? hexcode : `${hexcode}-FE0F`,
  ];
  const seen = new Set();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`<svg[^>]*\\bid="${esc}"[^>]*>[\\s\\S]*?<\\/svg>`, "i");
    const match = sprite.match(re);
    if (match) return normalizeEmojiSvgMarkup(match[0]);
  }
  return null;
}

async function loadSpriteSheet(moji, setName) {
  const local = spriteFilePath(setName);
  if (local) return fs.readFileSync(local, "utf8");
  const url = `${moji.cdn}/sprites/all.svg`;
  const raw = await fetchSvgCached(url);
  return raw || "";
}

let svgmojiSprites = null;

async function renderSvgmojiFromSprite(meta) {
  const sprite = svgmojiSprites?.get(meta.p);
  let svg = sprite ? extractEmojiFromSprite(sprite, meta.hexcode) : null;
  if (!svg && meta.url) {
    const raw = await fetchSvgCached(meta.url);
    svg = raw ? normalizeEmojiSvgMarkup(raw) : null;
  }
  return svg;
}

async function renderSvgmojiSvg(meta) {
  return renderSvgmojiFromSprite(meta);
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
  svg = svg.replace(/\sdata-slot="[^"]*"/g, "");
  svg = svg.replace(/\sdata-prefix="[^"]*"/g, "");
  svg = svg.replace(/\sdata-icon="[^"]*"/g, "");
  svg = svg.replace(/\srole="[^"]*"/g, "");
  svg = svg.replace(/\sstyle="[^"]*"/g, "");
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
    if (!isIconComponent(Comp)) return null;
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

function renderHeroiconSvg(pkgPath, name) {
  try {
    const mod = require(path.join(root, "node_modules/@heroicons/react", pkgPath));
    const Comp = mod[name];
    if (!isIconComponent(Comp)) return null;
    const html = renderToStaticMarkup(
      createElement(Comp, { width: PREVIEW_SIZE, height: PREVIEW_SIZE }),
    );
    return normalizeSvgMarkup(html);
  } catch {
    return null;
  }
}

function renderLucideSvg(name) {
  try {
    const mod = require(path.join(root, "node_modules/lucide-react"));
    const Comp = mod[name];
    if (!isIconComponent(Comp)) return null;
    const html = renderToStaticMarkup(
      createElement(Comp, { size: PREVIEW_SIZE, color: ICON_COLOR }),
    );
    return normalizeSvgMarkup(html);
  } catch {
    return null;
  }
}

function renderTablerSvg(name) {
  try {
    const mod = require(path.join(root, "node_modules/@tabler/icons-react"));
    const Comp = mod[name];
    if (!isIconComponent(Comp)) return null;
    const html = renderToStaticMarkup(
      createElement(Comp, { size: PREVIEW_SIZE, color: ICON_COLOR }),
    );
    return normalizeSvgMarkup(html);
  } catch {
    return null;
  }
}

function renderRemixSvg(name) {
  try {
    const mod = require(path.join(root, "node_modules/@remixicon/react"));
    const Comp = mod[name];
    if (!isIconComponent(Comp)) return null;
    const html = renderToStaticMarkup(
      createElement(Comp, { size: PREVIEW_SIZE, color: ICON_COLOR }),
    );
    return normalizeSvgMarkup(html);
  } catch {
    return null;
  }
}

function renderPhosphorSvg(name, weight) {
  try {
    const Comp = phosphorModule[name];
    if (!Comp) return null;
    const html = renderToStaticMarkup(
      createElement(Comp, { size: PREVIEW_SIZE, color: ICON_COLOR, weight }),
    );
    return normalizeSvgMarkup(html);
  } catch {
    return null;
  }
}

function renderFontAwesomeSvg(pkg, exportName) {
  try {
    const packPath =
      pkg === "regular"
        ? "@fortawesome/free-regular-svg-icons"
        : pkg === "brands"
          ? "@fortawesome/free-brands-svg-icons"
          : "@fortawesome/free-solid-svg-icons";
    const iconDef = require(path.join(root, "node_modules", packPath))[exportName];
    if (!iconDef) return null;
    const { FontAwesomeIcon } = require("@fortawesome/react-fontawesome");
    const html = renderToStaticMarkup(
      createElement(FontAwesomeIcon, {
        icon: iconDef,
        style: { fontSize: PREVIEW_SIZE, color: ICON_COLOR },
      }),
    );
    return normalizeSvgMarkup(html);
  } catch {
    return null;
  }
}

function renderLineiconSvg(exportName) {
  try {
    const iconDef = lineiconsModule[exportName];
    if (!iconDef?.svg) return null;
    const inner = String(iconDef.svg).replace(/\{color\}/g, ICON_COLOR);
    const vb = iconDef.viewBox || "0 0 24 24";
    const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${PREVIEW_SIZE}" height="${PREVIEW_SIZE}">${inner}</svg>`;
    return normalizeSvgMarkup(raw);
  } catch {
    return null;
  }
}

async function renderIconSvg(meta) {
  switch (meta.lib) {
    case LIB_REACT_ICONS:
      return renderReactIconSvg(meta.p, meta.n);
    case LIB_MUI:
      return renderMuiIconSvg(meta.n);
    case LIB_HEROICONS:
      return renderHeroiconSvg(meta.p, meta.n);
    case LIB_LUCIDE:
      return renderLucideSvg(meta.n);
    case LIB_TABLER:
      return renderTablerSvg(meta.n);
    case LIB_REMIX:
      return renderRemixSvg(meta.n);
    case LIB_PHOSPHOR:
      return renderPhosphorSvg(meta.n, meta.weight);
    case LIB_FONTAWESOME:
      return renderFontAwesomeSvg(meta.p, meta.n);
    case LIB_LINEICONS:
      return renderLineiconSvg(meta.n);
    case LIB_SVGMOJI:
      return renderSvgmojiSvg(meta);
    default:
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
      if (!isIconComponent(mod[name])) continue;
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

function collectHeroicons() {
  const rows = [];
  for (const { p, s } of HEROICON_PATHS) {
    const mod = require(path.join(root, "node_modules/@heroicons/react", p));
    for (const name of Object.keys(mod)) {
      if (!isIconComponent(mod[name])) continue;
      if (!/^[A-Z]/.test(name)) continue;
      rows.push({ lib: LIB_HEROICONS, p, n: name, s });
    }
  }
  return rows;
}

function collectLucide() {
  const mod = require(path.join(root, "node_modules/lucide-react"));
  const skip = new Set(["createLucideIcon", "default"]);
  const rows = [];
  for (const name of Object.keys(mod)) {
    if (skip.has(name) || !/^[A-Z]/.test(name)) continue;
    if (!isIconComponent(mod[name])) continue;
    rows.push({ lib: LIB_LUCIDE, p: "lucide", n: name, s: "outlined" });
  }
  return rows;
}

function collectTabler() {
  const mod = require(path.join(root, "node_modules/@tabler/icons-react"));
  const rows = [];
  for (const name of Object.keys(mod)) {
    if (!name.startsWith("Icon")) continue;
    if (!isIconComponent(mod[name])) continue;
    rows.push({ lib: LIB_TABLER, p: "tabler", n: name, s: "outlined" });
  }
  return rows;
}

function collectRemix() {
  const mod = require(path.join(root, "node_modules/@remixicon/react"));
  const rows = [];
  for (const name of Object.keys(mod)) {
    if (!name.startsWith("Ri")) continue;
    if (!isIconComponent(mod[name])) continue;
    const s = name.endsWith("Fill") ? "filled" : "outlined";
    rows.push({ lib: LIB_REMIX, p: "remix", n: name, s });
  }
  return rows;
}

function collectPhosphor() {
  const rows = [];
  for (const name of Object.keys(phosphorModule)) {
    if (!/^[A-Z]/.test(name)) continue;
    if (name.endsWith("Icon")) continue;
    const Comp = phosphorModule[name];
    if (typeof Comp !== "function" && typeof Comp !== "object") continue;
    for (const weight of PHOSPHOR_WEIGHTS) {
      rows.push({
        lib: LIB_PHOSPHOR,
        p: weight,
        n: name,
        s: phosphorStyle(weight),
        weight,
      });
    }
  }
  return rows;
}

function collectFontAwesome() {
  const packs = [
    { p: "solid", modPath: "@fortawesome/free-solid-svg-icons" },
    { p: "regular", modPath: "@fortawesome/free-regular-svg-icons" },
    { p: "brands", modPath: "@fortawesome/free-brands-svg-icons" },
  ];
  const rows = [];
  for (const { p, modPath } of packs) {
    const mod = require(path.join(root, "node_modules", modPath));
    const s = fontAwesomeStyle(p);
    for (const exportName of Object.keys(mod)) {
      if (!exportName.startsWith("fa")) continue;
      const def = mod[exportName];
      if (!def || typeof def !== "object" || !def.iconName) continue;
      rows.push({ lib: LIB_FONTAWESOME, p, n: exportName, s });
    }
  }
  return rows;
}

function collectLineicons() {
  const rows = [];
  for (const name of Object.keys(lineiconsModule)) {
    if (!/^[A-Z]/.test(name)) continue;
    const def = lineiconsModule[name];
    if (!def?.svg) continue;
    rows.push({ lib: LIB_LINEICONS, p: "lineicons", n: name, s: lineiconsStyle(name) });
  }
  return rows;
}


function emojiEntryName(emoji) {
  const base = emoji.shortcodes?.[0] || emoji.hexcode;
  return String(base).replace(/-/g, "_");
}

function collectSvgmoji() {
  const rows = [];
  for (const { p, moji, missing } of svgmojiSets) {
    for (const emoji of moji.data) {
      if (missing.has(emoji.hexcode)) continue;
      const url = moji.url(emoji);
      if (!url || !url.endsWith(".svg")) continue;
      rows.push({
        lib: LIB_SVGMOJI,
        p,
        n: emojiEntryName(emoji),
        s: "filled",
        url,
        hexcode: emoji.hexcode,
        label: emoji.annotation || emoji.emoji,
      });
    }
  }
  return rows;
}

async function main() {
  if (fs.existsSync(muiLoadersDir)) {
    fs.rmSync(muiLoadersDir, { recursive: true, force: true });
    console.log("Removed legacy src/lib/mui-loaders");
  }

  console.log("Loading Phosphor, Lineicons & svgmoji (ESM)…");
  phosphorModule = await import("@phosphor-icons/react");
  lineiconsModule = await import("@lineiconshq/free-icons/dist/index.esm.js");

  const {
    Twemoji,
    Openmoji,
    Notomoji,
    Blobmoji,
    SpriteCollection,
    populateMinifiedEmoji,
  } = await import("svgmoji");
  const emojiJson = (await import("svgmoji/emoji.min.json", { with: { type: "json" } })).default;
  const emojiData = populateMinifiedEmoji(emojiJson);

  const loadMissing = (pkg) => {
    try {
      const p = require.resolve(`@svgmoji/${pkg}/missing.json`);
      return new Set(require(p));
    } catch {
      return new Set();
    }
  };

  svgmojiSets = [
    { p: "twemoji", moji: new Twemoji({ data: emojiData, type: SpriteCollection.Individual }), missing: loadMissing("twemoji") },
    { p: "openmoji", moji: new Openmoji({ data: emojiData, type: SpriteCollection.Individual }), missing: loadMissing("openmoji") },
    { p: "noto", moji: new Notomoji({ data: emojiData, type: SpriteCollection.Individual }), missing: loadMissing("noto") },
    { p: "blob", moji: new Blobmoji({ data: emojiData, type: SpriteCollection.Individual }), missing: loadMissing("blob") },
  ];

  const reactMeta = collectReactIcons();
  const muiMeta = collectMuiIcons();
  const heroMeta = collectHeroicons();
  const lucideMeta = collectLucide();
  const tablerMeta = collectTabler();
  const remixMeta = collectRemix();
  const phosphorMeta = collectPhosphor();
  const faMeta = collectFontAwesome();
  const lineMeta = collectLineicons();
  const svgmojiMeta = collectSvgmoji();

  const allMeta = [
    ...reactMeta,
    ...muiMeta,
    ...heroMeta,
    ...lucideMeta,
    ...tablerMeta,
    ...remixMeta,
    ...phosphorMeta,
    ...faMeta,
    ...lineMeta,
    ...svgmojiMeta,
  ].sort((a, b) => a.n.localeCompare(b.n) || a.lib.localeCompare(b.lib));

  console.log("Metadata counts:");
  console.log(`  react-icons: ${reactMeta.length}`);
  console.log(`  mui: ${muiMeta.length}`);
  console.log(`  heroicons: ${heroMeta.length}`);
  console.log(`  lucide: ${lucideMeta.length}`);
  console.log(`  tabler: ${tablerMeta.length}`);
  console.log(`  remix: ${remixMeta.length}`);
  console.log(`  phosphor: ${phosphorMeta.length}`);
  console.log(`  fontawesome: ${faMeta.length}`);
  console.log(`  lineicons: ${lineMeta.length}`);
  console.log(`  svgmoji: ${svgmojiMeta.length}`);
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

  const staticMeta = allMeta.filter((m) => m.lib !== LIB_SVGMOJI);
  const emojiMeta = allMeta.filter((m) => m.lib === LIB_SVGMOJI);
  for (let i = 0; i < staticMeta.length; i++) {
    const { lib, p, n, s } = staticMeta[i];
    const svg = await renderIconSvg(staticMeta[i]);
    if (!svg) {
      failed++;
      continue;
    }
    insert.run([lib, p, n, s, svg]);
    ok++;
    if ((i + 1) % 1000 === 0) {
      console.log(`  static ${i + 1}/${staticMeta.length} (${ok} ok, ${failed} skipped)`);
    }
  }

  console.log("Loading svgmoji sprite sheets…");
  svgmojiSprites = new Map();
  for (const { p, moji } of svgmojiSets) {
    const sprite = await loadSpriteSheet(moji, p);
    svgmojiSprites.set(p, sprite);
    console.log(`  ${p} sprite: ${(sprite.length / 1024 / 1024).toFixed(2)} MB`);
  }

  for (let i = 0; i < emojiMeta.length; i++) {
    const meta = emojiMeta[i];
    const svg = await renderSvgmojiFromSprite(meta);
    if (!svg) {
      failed++;
      continue;
    }
    insert.run([meta.lib, meta.p, meta.n, meta.s, svg]);
    ok++;
    if ((i + 1) % 2000 === 0 || i + 1 === emojiMeta.length) {
      console.log(`  svgmoji ${i + 1}/${emojiMeta.length} (${ok} ok, ${failed} skipped)`);
    }
  }

  console.log(`  done ${allMeta.length}/${allMeta.length} (${ok} ok, ${failed} skipped)`);

  insert.free();

  fs.mkdirSync(path.dirname(outDb), { recursive: true });
  fs.writeFileSync(outDb, Buffer.from(db.export()));

  const sizeMb = (fs.statSync(outDb).size / 1024 / 1024).toFixed(2);
  console.log(`Wrote ${ok} icons to ${outDb} (${sizeMb} MB)`);
  if (failed) console.log(`  skipped ${failed} icons (render failed)`);

  // ── Generate SQL dump for Cloudflare D1 import ────────────────────────────
  console.log("Generating SQL dump for D1 import…");
  const sqlFile = path.join(root, "src/data/icons.sql");
  const sqlLines = [];
  sqlLines.push("DROP TABLE IF EXISTS icons;");
  sqlLines.push(
    "CREATE TABLE icons (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "lib TEXT NOT NULL, " +
      "p TEXT NOT NULL, " +
      "n TEXT NOT NULL, " +
      "s TEXT NOT NULL, " +
      "svg TEXT NOT NULL" +
      ");",
  );
  sqlLines.push("CREATE INDEX idx_icons_lib ON icons(lib);");
  sqlLines.push("CREATE INDEX idx_icons_style ON icons(s);");
  sqlLines.push("CREATE INDEX idx_icons_name ON icons(n);");
  sqlLines.push("CREATE INDEX idx_icons_pack ON icons(p);");

  const esc = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const allRows = db.exec("SELECT lib, p, n, s, svg FROM icons ORDER BY rowid");
  const rows = allRows[0]?.values ?? [];
  // One row per INSERT to stay within D1's per-statement size limit (SQLITE_TOOBIG)
  for (const row of rows) {
    sqlLines.push(`INSERT INTO icons (lib,p,n,s,svg) VALUES (${row.map(esc).join(",")});`);
  }

  fs.writeFileSync(sqlFile, sqlLines.join("\n") + "\n");
  const sqlSizeMb = (fs.statSync(sqlFile).size / 1024 / 1024).toFixed(2);
  console.log(`Wrote SQL dump to ${sqlFile} (${sqlSizeMb} MB)`);

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
