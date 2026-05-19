"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { LangKey } from "@/lib/language";
import { supportedLanguages } from "@/lib/language";
import { t } from "@/lib/i18n";

type Props = {
  currentLang: LangKey;
  /** Path segment after the lang prefix, e.g. "" for home */
  pathSuffix?: string;
};

export default function LanguageSelector({ currentLang, pathSuffix = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(nextLang: string) {
    const suffix = pathSuffix ? `/${pathSuffix.replace(/^\//, "").replace(/\/$/, "")}/` : "/";
    const qs = searchParams.toString();
    const href = `/${nextLang}${suffix}${qs ? `?${qs}` : ""}`;
    router.push(href);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <span className="sr-only">{t(currentLang, "changeLanguage")}</span>
      <select
        value={currentLang}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        aria-label={t(currentLang, "changeLanguage")}
      >
        {supportedLanguages.map((l) => (
          <option key={l.key} value={l.key}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
