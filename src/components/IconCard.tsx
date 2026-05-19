"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { LangKey } from "@/lib/language";
import type { IconEntry } from "@/lib/icons";
import { iconDetailPath } from "@/lib/icon-path";
import { copySvgFromContainer } from "@/lib/icon-svg";
import { t } from "@/lib/i18n";
import IconPreview from "@/components/IconPreview";

type Props = {
  icon: IconEntry;
  lang: LangKey;
};

export default function IconCard({ icon, lang }: Props) {
  const previewRef = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);
  const detailUrl = iconDetailPath(lang, icon);

  async function handleCopySvg(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!previewRef.current) return;
    const ok = await copySvgFromContainer(previewRef.current, 24);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <article className="group relative flex flex-col rounded-xl bg-white shadow-sm ring-1 ring-gray-200 hover:ring-blue-300 hover:shadow-md transition-all overflow-hidden">
      <Link
        href={detailUrl}
        className="flex flex-col items-center gap-2 p-4 pb-2 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <IconPreview ref={previewRef} pkg={icon.p} name={icon.n} size={28} className="h-12 w-12" />
        <div className="w-full min-w-0 text-center">
          <p className="truncate text-xs font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
            {icon.n}
          </p>
          <p className="truncate text-[10px] text-gray-400 uppercase tracking-wide">{icon.p}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={handleCopySvg}
        className="w-full border-t border-gray-100 py-2 text-[10px] font-medium text-blue-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-blue-50"
      >
        {copied ? t(lang, "copied") : t(lang, "copySvg")}
      </button>
    </article>
  );
}
