import fs from "fs";
import path from "path";
import initSqlJs, { type Database } from "sql.js";
import type { IconEntry, IconsQueryResult } from "@/lib/icons";
import { ICON_PAGE_SIZE } from "@/lib/icons";

const DB_PATH = path.join(process.cwd(), "src/data/icons.db");
const WASM_PATH = path.join(process.cwd(), "node_modules/sql.js/dist");

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({
        locateFile: (file) => path.join(WASM_PATH, file),
      });
      const buffer = fs.readFileSync(DB_PATH);
      return new SQL.Database(buffer);
    })();
  }
  return dbPromise;
}

export type QueryIconsParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  lib?: string;
  style?: string;
  exact?: { lib: string; p: string; n: string };
};

function buildWhere(params: QueryIconsParams) {
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

function rowToIcon(row: Record<string, string | number>): IconEntry {
  return {
    l: String(row.l),
    p: String(row.p),
    n: String(row.n),
    s: String(row.s),
    svg: String(row.svg),
  };
}

export async function queryIcons(params: QueryIconsParams): Promise<IconsQueryResult> {
  const db = await getDb();
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

export async function findIcon(
  lib: string,
  pkg: string,
  name: string,
): Promise<IconEntry | undefined> {
  const db = await getDb();
  const stmt = db.prepare(
    "SELECT lib AS l, p, n, s, svg FROM icons WHERE lib = ? AND p = ? AND n = ? LIMIT 1",
  );
  stmt.bind([lib, pkg, name]);
  const found = stmt.step() ? rowToIcon(stmt.getAsObject() as Record<string, string | number>) : undefined;
  stmt.free();
  return found;
}
