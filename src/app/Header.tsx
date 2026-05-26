"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useState } from "react";

import { useAuthStore } from "@/gateways/auth/authStore";
import { useI18n } from "../i18n/I18nProvider";
import { localeLabels, type Locale } from "../i18n/locales";

type HeaderProps = {
  initialIsAuthenticated?: boolean;
  logoutAdapter?: () => unknown;
  navigate?: (url: string) => void;
  refresh?: () => void;
};

const guestNavigation = {
  href: "/login",
};
const mobileNavigationId = "mobile-navigation";

const logoutFromIdentity = async () => {
  await fetch("/api/identity/auth/logout", {
    method: "POST",
    credentials: "include",
  });
};

export function Header({
  initialIsAuthenticated = false,
  logoutAdapter = logoutFromIdentity,
  navigate,
  refresh,
}: HeaderProps = {}) {
  const router = useRouter();
  const { locale, dictionary, setLocale } = useI18n();
  const currentLocale = locale;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const authStatus = useAuthStore((state) => state.status);
  const clearIdentity = useAuthStore((state) => state.clearIdentity);
  const isAuthenticated =
    authStatus === "loading" ? initialIsAuthenticated : authStatus === "authenticated";
  const t = dictionary.header;

  const handleLogout = () => {
    setIsLoggingOut(true);

    void Promise.resolve(logoutAdapter()).finally(() => {
      clearIdentity();
      if (navigate) {
        navigate("/login");
      } else {
        router.replace("/login");
        router.refresh();
      }
      refresh?.();
    });
  };
  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale);

    if (refresh) {
      refresh();
      return;
    }

    window.location.reload();
  };
  const languageSwitcher = (
    <label className="relative inline-flex items-center text-sm font-semibold text-text-muted">
      <span className="sr-only">{t.language}</span>
      <select
        aria-label={t.language}
        className="h-10 appearance-none rounded-full border border-stroke-subtle bg-surface-base py-0 pl-4 pr-10 text-sm font-semibold text-text-strong outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight"
        value={currentLocale}
        onChange={(event) => handleLocaleChange(event.target.value as Locale)}
      >
        {Object.entries(localeLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
      />
    </label>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-stroke-subtle bg-surface-raised/95 text-text-strong shadow-[0_8px_30px_rgba(29,47,73,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-16">
        <Link
          className="inline-flex items-center rounded-lg bg-white/88 px-2 py-1 ring-1 ring-stroke-subtle transition hover:bg-white"
          href="/"
        >
          <Image
            src="/kpool-logo.webp"
            alt="K-Pool"
            width={1877}
            height={736}
            priority
            className="h-9 w-auto max-w-[8.5rem] object-contain sm:h-10 sm:max-w-[10.5rem]"
          />
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
          {languageSwitcher}
          {isAuthenticated ? (
            <>
            <Link
              className="inline-flex items-center rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
              href="/mypage"
            >
              {t.mypage}
            </Link>
            <button
              type="button"
              className="hidden items-center rounded-full border border-stroke-subtle bg-surface-base px-5 py-2.5 text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/30 sm:inline-flex disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              {isLoggingOut ? t.loggingOut : t.logout}
            </button>
            </>
          ) : (
            <Link
              className="hidden items-center rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 sm:inline-flex"
              href={guestNavigation.href}
            >
              {t.login}
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-stroke-subtle bg-surface-base text-text-strong transition hover:bg-brand-highlight/30 sm:hidden"
          aria-label={t.navigationMenu}
          aria-controls={mobileNavigationId}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          <span className="flex flex-col gap-1.5" aria-hidden="true">
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
          </span>
        </button>
      </div>

      {isMobileMenuOpen ? (
        <nav
          id={mobileNavigationId}
          aria-label={t.mobileMenu}
          className="border-t border-stroke-subtle bg-surface-raised px-6 py-4 sm:hidden"
        >
          <div className="mb-3">{languageSwitcher}</div>
          {isAuthenticated ? (
            <div className="grid gap-3">
              <Link
                className="flex items-center rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
                href="/mypage"
              >
                {t.mypage}
              </Link>
              <button
                type="button"
                className="flex items-center rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
              >
                {isLoggingOut ? t.loggingOut : t.logout}
              </button>
            </div>
          ) : (
            <Link
              className="flex items-center rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
              href={guestNavigation.href}
            >
              {t.login}
            </Link>
          )}
        </nav>
      ) : null}
    </header>
  );
}
