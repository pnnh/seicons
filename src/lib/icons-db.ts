import type { Database } from "sql.js";
import type { IconEntry, IconsQueryResult } from "@/lib/icons";
import { ICON_PAGE_SIZE } from "@/lib/icons";

export type QueryIconsParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  lib?: string;
  style?: string;
  exact?: { lib: string; p: string; n: string };
};

// ── Where clause builder ──────────────────────────────────────────────────

function buildWhere(params: QueryIconsParams): {
  where: string;
  values: (string | number)[];
} {
  const clauses: string[] = [];
  const values: (string | number)[] = [];

  if (params.exact) {
    clauses.push("lib = ? AND p = ? AND n = ?");
    values.push(params.exact.lib, params.exact.p, params.exact.n);
    return { where: clauses.join(" AND "), values };
  }

  const q = params.q?.trim().toLowerCase();
  if (q) {
    clauses.push("(LOWER(n) LIKE ? OR LOWER(p) LIKE ? OR LOWER(lib) LIKE ?)");
    const like = `%${q}%`;
    values.push(like, like, like);
  }

  if (params.lib) {
    clauses.push("lib = ?");
    values.push(params.lib);
  }

  if (params.style) {
    clauses.push("s = ?");
    values.push(params.style);
  }

  return {
    where: clauses.length ? clauses.join(" AND ") : "1=1",
    values,
  };
}

// ── Cloudflare D1 ─────────────────────────────────────────────────────────

async function getD1(): Promise<D1Database | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    // CloudflareEnv is augmented in src/cloudflare-env.d.ts to include DB
    const db = (ctx.env as CloudflareEnv & { DB?: D1Database }).DB;
    return db ?? null;
  } catch {
    return null;
  }
}

async function queryIconsD1(
  db: D1Database,
  params: QueryIconsParams,
): Promise<IconsQueryResult> {
  const pageSize = params.pageSize ?? ICON_PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);
  const { where, values } = buildWhere(params);

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS c FROM icons WHERE ${where}`)
    .bind(...values)
    .first<{ c: number }>();
  const total = countRow?.c ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const rows = await db
    .prepare(
      `SELECT lib AS l, p, n, s, svg FROM icons WHERE ${where} ORDER BY n, lib, p LIMIT ? OFFSET ?`,
    )
    .bind(...values, pageSize, offset)
    .all<IconEntry>();

  return { items: rows.results, page: safePage, totalPages, total };
}

async function findIconD1(
  db: D1Database,
  lib: string,
  pkg: string,
  name: string,
): Promise<IconEntry | undefined> {
  const row = await db
    .prepare(
      "SELECT lib AS l, p, n, s, svg FROM icons WHERE lib = ? AND p = ? AND n = ? LIMIT 1",
    )
    .bind(lib, pkg, name)
    .first<IconEntry>();
  return row ?? undefined;
}

// ── sql.js fallback (local dev without D1) ────────────────────────────────

let _sqlJsDbPromise: Promise<Database> | null = null;

async function getSqlJsDb(): Promise<Database> {
  if (!_sqlJsDbPromise) {
    _sqlJsDbPromise = (async () => {
      const { default: initSqlJs } = await import("sql.js");
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const dbPath = join(process.cwd(), "src/data/icons.db");
      const wasmPath = join(process.cwd(), "node_modules/sql.js/dist");
      const SQL = await initSqlJs({
        locateFile: (file: string) => join(wasmPath, file),
      });
      const buffer = readFileSync(dbPath);
      return new SQL.Database(buffer);
    })();
  }
  return _sqlJsDbPromise;
}

function rowToIcon(row: Record<string, string | number>): IconEntry {
  return {
    l: String(row.l),
    p: String(row.p),
    n: String(row.n),
    s: String(row.s),
    svg: String(row.svg),
  };
}

async function queryIconsSqlJs(params: QueryIconsParams): Promise<IconsQueryResult> {
  const db = await getSqlJsDb();
  const pageSize = params.pageSize ?? ICON_PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);
  const { where, values } = buildWhere(params);

  const countStmt = db.prepare(`SELECT COUNT(*) AS c FROM icons WHERE ${where}`);
  countStmt.bind(values);
  countStmt.step();
  const total = (countStmt.getAsObject() as { c: number }).c;
  countStmt.free();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const selectStmt = db.prepare(
    `SELECT lib AS l, p, n, s, svg FROM icons WHERE ${where} ORDER BY n, lib, p LIMIT ? OFFSET ?`,
  );
  selectStmt.bind([...values, pageSize, offset]);

  const items: IconEntry[] = [];
  while (selectStmt.step()) {
    items.push(rowToIcon(selectStmt.getAsObject() as Record<string, string | number>));
  }
  selectStmt.free();

  return { items, page: safePage, totalPages, total };
}

async function findIconSqlJs(
  lib: string,
  pkg: string,
  name: string,
): Promise<IconEntry | undefined> {
  const db = await getSqlJsDb();
  const stmt = db.prepare(
    "SELECT lib AS l, p, n, s, svg FROM icons WHERE lib = ? AND p = ? AND n = ? LIMIT 1",
  );
  stmt.bind([lib, pkg, name]);
  const found = stmt.step()
    ? rowToIcon(stmt.getAsObject() as Record<string, string | number>)
    : undefined;
  stmt.free();
  return found;
}

// ── Public API ────────────────────────────────────────────────────────────

export async function queryIcons(params: QueryIconsParams): Promise<IconsQueryResult> {
  const d1 = await getD1();
  if (d1) return queryIconsD1(d1, params);
  return queryIconsSqlJs(params);
}

export async function findIcon(
  lib: string,
  pkg: string,
  name: string,
): Promise<IconEntry | undefined> {
  const d1 = await getD1();
  if (d1) return findIconD1(d1, lib, pkg, name);
  return findIconSqlJs(lib, pkg, name);
}
