import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import IconBrowser from "@/components/IconBrowser";
import { queryIcons } from "@/lib/icons-db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; page?: string; lib?: string; style?: string }>;
};

export default async function HomePage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isValidLang(lang)) notFound();
  const l = lang as LangKey;

  const sp = await searchParams;
  const q = sp.q ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const lib = sp.lib ?? "";
  const style = sp.style ?? "";

  const initialData = await queryIcons({
    q,
    page,
    lib: lib || undefined,
    style: style || undefined,
  });

  return (
    <>
      <SiteHeader lang={l} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <IconBrowser lang={l} initialData={initialData} />
      </main>
      <SiteFooter lang={l} />
    </>
  );
}
