import manifest from "@/data/icons-manifest.json";

export type IconEntry = { p: string; n: string };

export const ICON_MANIFEST: IconEntry[] = manifest;

export const ICON_PAGE_SIZE = 48;

export const ICON_PACKAGES = [...new Set(ICON_MANIFEST.map((i) => i.p))].sort();

export function filterIcons(query: string): IconEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return ICON_MANIFEST;
  return ICON_MANIFEST.filter((icon) => {
    const name = icon.n.toLowerCase();
    const pkg = icon.p.toLowerCase();
    return name.includes(q) || pkg.includes(q) || `${pkg}/${name}`.includes(q);
  });
}

export function paginateIcons<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total: items.length,
  };
}
