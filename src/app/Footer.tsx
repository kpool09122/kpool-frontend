"use client";

import Link from "next/link";

import { useI18n } from "../i18n/I18nProvider";

export function Footer() {
  const { dictionary, locale } = useI18n();
  const t = dictionary.footer;

  return (
    <footer className="border-t border-stroke-subtle bg-surface-raised/95 text-text-strong">
      <div className="mx-auto flex w-[90%] max-w-6xl flex-wrap items-center justify-between gap-4 py-4">
        <p className="text-xs text-text-muted">{t.copyright}</p>
        <nav aria-label={t.navigation} className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            className="w-fit rounded-md text-sm font-semibold text-text-muted underline-offset-4 transition hover:text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-highlight"
            href={`/${locale}/terms`}
          >
            {t.terms}
          </Link>
          <Link
            className="w-fit rounded-md text-sm font-semibold text-text-muted underline-offset-4 transition hover:text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-highlight"
            href={`/${locale}/privacy`}
          >
            {t.privacy}
          </Link>
          <Link
            className="w-fit rounded-md text-sm font-semibold text-text-muted underline-offset-4 transition hover:text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-highlight"
            href="/contact"
          >
            {t.contact}
          </Link>
          <a
            className="w-fit rounded-md text-sm font-semibold text-text-muted underline-offset-4 transition hover:text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-highlight"
            href="https://www.instagram.com/take0122"
            rel="noopener noreferrer"
            target="_blank"
          >
            {t.instagram}
          </a>
        </nav>
      </div>
    </footer>
  );
}
