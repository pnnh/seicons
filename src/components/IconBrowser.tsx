"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LangKey } from "@/lib/language";
import { t } from "@/lib/i18n";
import {
  ICON_LIBRARIES,
  ICON_STYLES,
  type IconEntry,
  type IconsQueryResult,
} from "@/lib/icons";
import IconCard from "@/components/IconCard";

type Props = { lang: LangKey; initialData?: IconsQueryResult };

const PAGE_JUMP_SIZE = 5;

function formatMessage(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

const btnClass =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap";

const selectClass =
  "rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-w-[9rem]";

function IconBrowserInner({ lang, initialData }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryParam = searchParams.get("q") ?? "";
  const pageParam = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const libParam = searchParams.get("lib") ?? "";
  const styleParam = searchParams.get("style") ?? "";

  const [inputValue, setInputValue] = useState(queryParam);
  const [pageInput, setPageInput] = useState(String(pageParam));
  const [pageError, setPageError] = useState(false);
  const [data, setData] = useState<IconsQueryResult | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const fetchSeq = useRef(0);
  const skipLoadingOnce = useRef(!!initialData);

  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setPageInput(String(pageParam));
    setPageError(false);
  }, [pageParam]);

  const updateParams = useCallback(
    (next: { q?: string; page?: number; lib?: string; style?: string }) => {
      const params = new URLSearchParams();
      const q = (next.q ?? queryParam).trim();
      const lib = next.lib ?? libParam;
      const style = next.style ?? styleParam;
      const page = next.page ?? pageParam;

      if (q) params.set("q", q);
      if (lib) params.set("lib", lib);
      if (style) params.set("style", style);
      if (page > 1) params.set("page", String(page));

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, queryParam, libParam, styleParam, pageParam],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (inputValue !== queryParam) {
        updateParams({ q: inputValue, page: 1 });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [inputValue, queryParam, updateParams]);

  useEffect(() => {
    const seq = ++fetchSeq.current;
    if (skipLoadingOnce.current) {
      skipLoadingOnce.current = false;
    } else {
      setLoading(true);
    }

    const params = new URLSearchParams();
    if (queryParam) params.set("q", queryParam);
    if (libParam) params.set("lib", libParam);
    if (styleParam) params.set("style", styleParam);
    params.set("page", String(pageParam));

    fetch(`/api/icons?${params}`)
      .then((res) => res.json())
      .then((json: IconsQueryResult) => {
        if (fetchSeq.current === seq) setData(json);
      })
      .catch(() => {
        if (fetchSeq.current === seq) {
          setData({ items: [], page: 1, totalPages: 1, total: 0 });
        }
      })
      .finally(() => {
        if (fetchSeq.current === seq) setLoading(false);
      });
  }, [queryParam, pageParam, libParam, styleParam]);

  const items: IconEntry[] = data?.items ?? [];
  const page = data?.page ?? 1;
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const showJumpButtons = totalPages > PAGE_JUMP_SIZE;
  const canPrev5 = showJumpButtons && page > PAGE_JUMP_SIZE;
  const canNext5 = showJumpButtons && page + PAGE_JUMP_SIZE <= totalPages;

  function goToPage(nextPage: number) {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    updateParams({ page: clamped });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePageInputSubmit() {
    const trimmed = pageInput.trim();
    const parsed = Number.parseInt(trimmed, 10);
    const valid =
      trimmed !== "" &&
      Number.isInteger(parsed) &&
      parsed >= 1 &&
      parsed <= totalPages;

    if (!valid) {
      setPageError(true);
      return;
    }

    setPageError(false);
    if (parsed !== page) goToPage(parsed);
  }

  return (
    <div className="space-y-8">
      <div className="max-w-xl mx-auto space-y-4">
        <label htmlFor="icon-search" className="sr-only">
          {t(lang, "searchLabel")}
        </label>
        <div className="relative">
          <input
            id="icon-search"
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t(lang, "searchPlaceholder")}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pl-11 text-base shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            autoComplete="off"
            spellCheck={false}
          />
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            <span>{t(lang, "filterLibrary")}</span>
            <select
              value={libParam}
              onChange={(e) => updateParams({ lib: e.target.value, page: 1 })}
              className={selectClass}
              aria-label={t(lang, "filterLibrary")}
            >
              {ICON_LIBRARIES.map((opt) => (
                <option key={opt.id || "all"} value={opt.id}>
                  {t(lang, opt.key)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            <span>{t(lang, "filterStyle")}</span>
            <select
              value={styleParam}
              onChange={(e) => updateParams({ style: e.target.value, page: 1 })}
              className={selectClass}
              aria-label={t(lang, "filterStyle")}
            >
              {ICON_STYLES.map((opt) => (
                <option key={opt.id || "all"} value={opt.id}>
                  {t(lang, opt.key)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-center text-sm text-gray-500">
          {loading
            ? t(lang, "loadingIcons")
            : formatMessage(t(lang, "iconCount"), { count: total.toLocaleString() })}
        </p>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-16">{t(lang, "loadingIcons")}</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-500 py-16">{t(lang, "noResults")}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {items.map((icon) => (
            <IconCard key={`${icon.l}-${icon.p}-${icon.n}`} icon={icon} lang={lang} />
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <nav className="flex flex-col items-center gap-2" aria-label="Pagination">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {showJumpButtons && (
              <button
                type="button"
                onClick={() => goToPage(page - PAGE_JUMP_SIZE)}
                disabled={!canPrev5}
                className={btnClass}
              >
                {t(lang, "paginationPrev5")}
              </button>
            )}
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className={btnClass}
            >
              {t(lang, "paginationPrev")}
            </button>

            <div className="flex items-center gap-1.5 text-sm text-gray-600 px-1">
              <label htmlFor="page-jump" className="sr-only">
                {t(lang, "pageInputLabel")}
              </label>
              <input
                id="page-jump"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pageInput}
                onChange={(e) => {
                  setPageInput(e.target.value);
                  setPageError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handlePageInputSubmit();
                  }
                }}
                onBlur={() => {
                  if (pageError) {
                    setPageInput(String(page));
                    setPageError(false);
                  }
                }}
                aria-invalid={pageError}
                aria-describedby={pageError ? "page-jump-error" : undefined}
                className={`w-16 rounded-lg border bg-white px-2 py-2 text-center text-sm font-medium text-gray-900 shadow-sm focus:outline-none focus:ring-2 ${
                  pageError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />
              <span className="whitespace-nowrap">
                {t(lang, "pageOf")} {totalPages.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className={btnClass}
            >
              {t(lang, "paginationNext")}
            </button>
            {showJumpButtons && (
              <button
                type="button"
                onClick={() => goToPage(page + PAGE_JUMP_SIZE)}
                disabled={!canNext5}
                className={btnClass}
              >
                {t(lang, "paginationNext5")}
              </button>
            )}
          </div>
          {pageError && (
            <p id="page-jump-error" className="text-sm text-red-600" role="alert">
              {formatMessage(t(lang, "pageInvalid"), { totalPages })}
            </p>
          )}
        </nav>
      )}
    </div>
  );
}

export default function IconBrowser({ initialData, ...props }: Props) {
  return (
    <Suspense fallback={<p className="text-center text-gray-500 py-16">…</p>}>
      <IconBrowserInner {...props} initialData={initialData} />
    </Suspense>
  );
}
