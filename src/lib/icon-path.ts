import type { LangKey } from "@/lib/language";
import type { IconEntry } from "@/lib/icons";
import { ICON_MANIFEST } from "@/lib/icons";

export function iconDetailPath(lang: LangKey, icon: Pick<IconEntry, "p" | "n">) {
  return `/${lang}/icons/${encodeURIComponent(icon.p)}/${encodeURIComponent(icon.n)}/`;
}

export function findIcon(pkg: string, name: string): IconEntry | undefined {
  return ICON_MANIFEST.find((i) => i.p === pkg && i.n === name);
}
