import type { LangKey } from "@/lib/language";
import { t } from "@/lib/i18n";

type Props = { lang: LangKey };

export default function SiteFooter({ lang }: Props) {
    return (
        <footer className="w-full border-t border-gray-200 bg-white mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-400">
                <p>© {new Date().getFullYear()} {t(lang, "siteName")}</p>
                <span className="hidden sm:inline" aria-hidden>·</span>
                <p>
                    {t(lang, "reactIconsCredit")}{" "}
                    <a
                        href="https://react-icons.github.io/react-icons/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-500"
                    >
                        react-icons
                    </a>
                </p>
            </div>
        </footer>
    );
}
