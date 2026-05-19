import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { findIcon } from "@/lib/icon-path";
import { t } from "@/lib/i18n";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import IconDetailPanel from "@/components/IconDetailPanel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; pkg: string; name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, pkg, name } = await params;
  if (!isValidLang(lang)) return {};
  const icon = findIcon(decodeURIComponent(pkg), decodeURIComponent(name));
  if (!icon) return {};
  const l = lang as LangKey;
  return {
    title: t(l, "iconDetailTitle").replace("{name}", icon.n),
    description: `${icon.n} (${icon.p}) — ${t(l, "siteTagline")}`,
  };
}

export default async function IconDetailPage({ params }: Props) {
  const { lang, pkg: rawPkg, name: rawName } = await params;
  if (!isValidLang(lang)) notFound();
  const l = lang as LangKey;
  const pkg = decodeURIComponent(rawPkg);
  const name = decodeURIComponent(rawName);
  const icon = findIcon(pkg, name);
  if (!icon) notFound();

  const pathSuffix = `icons/${encodeURIComponent(pkg)}/${encodeURIComponent(name)}`;

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
          <p className="text-sm text-gray-500 uppercase tracking-wide mt-1">{icon.p}</p>
        </div>
        <IconDetailPanel lang={l} icon={icon} />
      </main>
      <SiteFooter lang={l} />
    </>
  );
}
