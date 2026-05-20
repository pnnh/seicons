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
  /** Exact match for detail page lookup */
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
    `SELECT lib AS l, p, n, s FROM icons WHERE ${where} ORDER BY n, lib, p LIMIT ? OFFSET ?`,
  );
  selectStmt.bind([...values, pageSize, offset]);

  const items: IconEntry[] = [];
  while (selectStmt.step()) {
    const row = selectStmt.getAsObject() as IconEntry;
    items.push({ l: row.l, p: row.p, n: row.n, s: row.s });
  }
  selectStmt.free();

  return { items, page: safePage, totalPages, total };
}

export async function findIcon(
  lib: string,
  pkg: string,
  name: string,
): Promise<IconEntry | undefined> {
  const { items } = await queryIcons({
    exact: { lib, p: pkg, n: name },
    page: 1,
    pageSize: 1,
  });
  return items[0];
}

export async function getIconStats(): Promise<{ total: number; libraries: number; styles: number }> {
  const db = await getDb();
  const totalStmt = db.prepare("SELECT COUNT(*) AS c FROM icons");
  totalStmt.step();
  const total = (totalStmt.getAsObject() as { c: number }).c;
  totalStmt.free();

  const libStmt = db.prepare("SELECT COUNT(DISTINCT lib) AS c FROM icons");
  libStmt.step();
  const libraries = (libStmt.getAsObject() as { c: number }).c;
  libStmt.free();

  const styleStmt = db.prepare("SELECT COUNT(DISTINCT s) AS c FROM icons");
  styleStmt.step();
  const styles = (styleStmt.getAsObject() as { c: number }).c;
  styleStmt.free();

  return { total, libraries, styles };
}
