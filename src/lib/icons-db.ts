import type { Database } from "sql.js";
import type { IconEntry, IconsQueryResult } from "@/lib/icons";
import { ICON_PAGE_SIZE } from "@/lib/icons";

function makeSvgUrl(l: string, p: string, n: string): string {
  const base = process.env.NEXT_PUBLIC_SVG_BASE_URL ?? "";
  return `${base}/icons/${l}/${p}/${n}.svg`;
}

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
  // 环境变量强制开关（最高优先级，方便调试）
  if (process.env.NODE_ENV !== 'production') {
    console.log("[getD1] 🚫 D1 explicitly disabled in non-production environment");
    return null;
  }

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx.env as any;
    const db = env?.DB;

    if (!db || typeof db !== 'object' || typeof db.prepare !== 'function') {
      console.log("[getD1] ⚠️ No valid DB binding found");
      return null;
    }

    // 额外检测：尝试一个无害的元数据查询来判断是否真正可用
    try {
      // 这是一个轻量操作，用于检测 D1 是否真正初始化
      await db.prepare("SELECT 1").first();
      console.log("[getD1] ✅ D1 binding is fully functional");
      return db as D1Database;
    } catch (testError: any) {
      // 如果是 "no such table" 或类似初始化错误，说明是未完全初始化的 ProxyStub
      if (testError.message?.includes('no such table') || 
          testError.message?.includes('SQLITE_ERROR')) {
        
        console.log("[getD1] ⚠️ D1 ProxyStub exists but database not initialized → fallback to local SQLite");
        return null;
      }
      
      // 其他错误则透传
      throw testError;
    }
  } catch (error: any) {
    console.log("[getD1] ℹ️ Not in Cloudflare environment (normal for npm run dev) → using local SQLite");
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
      `SELECT lib AS l, p, n, s FROM icons WHERE ${where} ORDER BY n, lib, p LIMIT ? OFFSET ?`,
    )
    .bind(...values, pageSize, offset)
    .all<Omit<IconEntry, "svgUrl">>();

  const items = rows.results.map((row) => ({
    ...row,
    svgUrl: makeSvgUrl(row.l, row.p, row.n),
  }));
  return { items, page: safePage, totalPages, total };
}

async function findIconD1(
  db: D1Database,
  lib: string,
  pkg: string,
  name: string,
): Promise<IconEntry | undefined> {
  const row = await db
    .prepare(
      "SELECT lib AS l, p, n, s FROM icons WHERE lib = ? AND p = ? AND n = ? LIMIT 1",
    )
    .bind(lib, pkg, name)
    .first<Omit<IconEntry, "svgUrl">>();
  if (!row) return undefined;
  return { ...row, svgUrl: makeSvgUrl(row.l, row.p, row.n) };
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
  const l = String(row.l);
  const p = String(row.p);
  const n = String(row.n);
  return {
    l,
    p,
    n,
    s: String(row.s),
    svgUrl: makeSvgUrl(l, p, n),
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
    `SELECT lib AS l, p, n, s FROM icons WHERE ${where} ORDER BY n, lib, p LIMIT ? OFFSET ?`,
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
    "SELECT lib AS l, p, n, s FROM icons WHERE lib = ? AND p = ? AND n = ? LIMIT 1",
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
