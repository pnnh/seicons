import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { findIcon } from "@/lib/icons-db";
import { t } from "@/lib/i18n";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import IconDetailPanel from "@/components/IconDetailPanel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; lib: string; pkg: string; name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, lib, pkg, name } = await params;
  if (!isValidLang(lang)) return {};
  const icon = await findIcon(
    decodeURIComponent(lib),
    decodeURIComponent(pkg),
    decodeURIComponent(name),
  );
  if (!icon) return {};
  const l = lang as LangKey;
  return {
    title: t(l, "iconDetailTitle").replace("{name}", icon.n),
    description: `${icon.n} (${icon.l}/${icon.p}) — ${t(l, "siteTagline")}`,
  };
}

export default async function IconDetailPage({ params }: Props) {
  const { lang, lib: rawLib, pkg: rawPkg, name: rawName } = await params;
  if (!isValidLang(lang)) notFound();
  const l = lang as LangKey;
  const lib = decodeURIComponent(rawLib);
  const pkg = decodeURIComponent(rawPkg);
  const name = decodeURIComponent(rawName);
  const icon = await findIcon(lib, pkg, name);
  if (!icon) notFound();

  const pathSuffix = `icons/${encodeURIComponent(lib)}/${encodeURIComponent(pkg)}/${encodeURIComponent(name)}`;

  return (
    <>
      <SiteHeader lang={l} pathSuffix={pathSuffix} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/${l}/`}
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 mb-8"
        >
          ← {t(l, "backToGallery")}
        </Link>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{icon.n}</h1>
          <p className="text-sm text-gray-500 uppercase tracking-wide mt-1">
            {icon.l} / {icon.p}
          </p>
        </div>
        <IconDetailPanel lang={l} icon={icon} />
      </main>
      <SiteFooter lang={l} />
    </>
  );
}
