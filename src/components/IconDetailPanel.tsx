"use client";

import { useRef, useState } from "react";
import type { LangKey } from "@/lib/language";
import type { IconEntry } from "@/lib/icons";
import {
  ICON_FORMATS,
  ICON_SIZES,
  type IconFormat,
  type IconSize,
  downloadBlob,
  exportFilename,
  svgElementToBlob,
  getSvgElement,
} from "@/lib/icon-export";
import { copySvgFromContainer } from "@/lib/icon-svg";
import { t } from "@/lib/i18n";
import IconPreview from "@/components/IconPreview";

type Props = {
  lang: LangKey;
  icon: IconEntry;
};

const optionBtn =
  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";
const optionActive = "border-blue-600 bg-blue-50 text-blue-700";
const optionIdle = "border-gray-300 bg-white text-gray-700 hover:bg-gray-50";

export default function IconDetailPanel({ lang, icon }: Props) {
  const previewRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<IconSize>(64);
  const [format, setFormat] = useState<IconFormat>("svg");
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function handleExport() {
    if (!previewRef.current) return;
    const svg = getSvgElement(previewRef.current);
    if (!svg) {
      setError(true);
      return;
    }

    setExporting(true);
    setError(false);
    try {
      const blob = await svgElementToBlob(svg, size, format);
      downloadBlob(blob, exportFilename(icon.n, size, format));
    } catch {
      setError(true);
    } finally {
      setExporting(false);
    }
  }

  async function handleCopySvg() {
    if (!previewRef.current) return;
    const ok = await copySvgFromContainer(previewRef.current, size);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-col items-center gap-10 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-center min-h-[280px] w-full rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-12">
        <IconPreview ref={previewRef} pkg={icon.p} name={icon.n} size={size} />
      </div>

      <div className="w-full space-y-3">
        <p className="text-sm font-medium text-gray-700 text-center">{t(lang, "sizeLabel")}</p>
        <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label={t(lang, "sizeLabel")}>
          {ICON_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={size === s}
              onClick={() => setSize(s)}
              className={`${optionBtn} ${size === s ? optionActive : optionIdle}`}
            >
              {s}px
            </button>
          ))}
        </div>
      </div>

      <div className="w-full space-y-3">
        <p className="text-sm font-medium text-gray-700 text-center">{t(lang, "formatLabel")}</p>
        <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label={t(lang, "formatLabel")}>
          {ICON_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              onClick={() => setFormat(f)}
              className={`${optionBtn} ${format === f ? optionActive : optionIdle} uppercase`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 w-full pt-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="w-full max-w-xs rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? t(lang, "exporting") : t(lang, "exportButton")}
        </button>
        <button
          type="button"
          onClick={handleCopySvg}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          {copied ? t(lang, "copied") : t(lang, "copySvg")}
        </button>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {t(lang, "exportFailed")}
          </p>
        )}
        <p className="text-xs text-gray-400 font-mono break-all text-center">
          {`import { ${icon.n} } from "react-icons/${icon.p}";`}
        </p>
      </div>
    </div>
  );
}
