"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LangKey } from "@/lib/language";
import { t } from "@/lib/i18n";
import {
  ICON_PAGE_SIZE,
  ICON_PACKAGES,
  filterIcons,
  paginateIcons,
} from "@/lib/icons";
import IconCard from "@/components/IconCard";

type Props = { lang: LangKey };

const PAGE_JUMP_SIZE = 5;

function formatMessage(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

const btnClass =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap";

function IconBrowserInner({ lang }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryParam = searchParams.get("q") ?? "";
  const pageParam = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [inputValue, setInputValue] = useState(queryParam);
  const [pageInput, setPageInput] = useState(String(pageParam));
  const [pageError, setPageError] = useState(false);

  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setPageInput(String(pageParam));
    setPageError(false);
  }, [pageParam]);

  const filtered = useMemo(() => filterIcons(queryParam), [queryParam]);
  const { items, page, totalPages, total } = useMemo(
    () => paginateIcons(filtered, pageParam, ICON_PAGE_SIZE),
    [filtered, pageParam],
  );

  const showJumpButtons = totalPages > PAGE_JUMP_SIZE;
  const canPrev5 = showJumpButtons && page > PAGE_JUMP_SIZE;
  const canNext5 = showJumpButtons && page + PAGE_JUMP_SIZE <= totalPages;

  const updateParams = useCallback(
    (nextQuery: string, nextPage: number) => {
      const params = new URLSearchParams();
      const q = nextQuery.trim();
      if (q) params.set("q", q);
      if (nextPage > 1) params.set("page", String(nextPage));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (inputValue !== queryParam) {
        updateParams(inputValue, 1);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [inputValue, queryParam, updateParams]);

  function goToPage(nextPage: number) {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    updateParams(queryParam, clamped);
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
    if (parsed !== page) {
      goToPage(parsed);
    }
  }

  return (
    <div className="space-y-8">
      <div className="max-w-xl mx-auto">
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
        <p className="mt-2 text-center text-sm text-gray-500">
          {formatMessage(t(lang, "iconCount"), {
            count: total.toLocaleString(),
            packages: ICON_PACKAGES.length,
          })}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-16">{t(lang, "noResults")}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {items.map((icon) => (
            <IconCard key={`${icon.p}-${icon.n}`} icon={icon} lang={lang} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="flex flex-col items-center gap-2"
          aria-label="Pagination"
        >
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

export default function IconBrowser(props: Props) {
  return (
    <Suspense fallback={<p className="text-center text-gray-500 py-16">…</p>}>
      <IconBrowserInner {...props} />
    </Suspense>
  );
}
