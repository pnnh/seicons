import type { LangKey } from "@/lib/language";
import type { IconEntry } from "@/lib/icons";

export function iconDetailPath(lang: LangKey, icon: Pick<IconEntry, "l" | "p" | "n">) {
  return `/${lang}/icons/${encodeURIComponent(icon.l)}/${encodeURIComponent(icon.p)}/${encodeURIComponent(icon.n)}/`;
}
