"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, PersonIcon } from "@radix-ui/react-icons";
import { useState } from "react";

import { useAuthStore } from "@/gateways/auth/authStore";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import { useI18n } from "../i18n/I18nProvider";
import { localeLabels, supportedLocales, type Locale } from "../i18n/locales";

type HeaderProps = {
  initialIdentity?: IdentitySummary | null;
  initialIsAuthenticated?: boolean;
  logoutAdapter?: () => unknown;
  navigate?: (url: string) => void;
  refresh?: () => void;
};

const guestNavigation = {
  href: "/login",
};
const mobileNavigationId = "mobile-navigation";

export const buildLocaleChangePath = ({
  nextLocale,
  pathname,
  searchParams,
}: {
  nextLocale: Locale;
  pathname: string;
  searchParams: URLSearchParams;
}): string | null => {
  const segments = pathname.split("/");
  const currentPathLocale = segments[1];
  const hasLanguagePrefix = supportedLocales.includes(currentPathLocale as Locale);
  const isLanguageTopPath = segments.length === 2 && hasLanguagePrefix;
  const isLanguageWikiPath = segments.length >= 3 && hasLanguagePrefix && segments[2] === "wiki";

  if (!isLanguageTopPath && !isLanguageWikiPath) {
    return null;
  }

  segments[1] = nextLocale;
  const query = searchParams.toString();

  return `${segments.join("/")}${query ? `?${query}` : ""}`;
};

const logoutFromIdentity = async () => {
  await fetch("/api/identity/auth/logout", {
    method: "POST",
    credentials: "include",
  });
};

export function Header({
  initialIdentity = null,
  initialIsAuthenticated = false,
  logoutAdapter = logoutFromIdentity,
  navigate,
  refresh,
}: HeaderProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, dictionary, setLocale } = useI18n();
  const currentLocale = locale;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileLanguageViewOpen, setIsMobileLanguageViewOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const identity = useAuthStore((state) => state.identity);
  const authStatus = useAuthStore((state) => state.status);
  const clearIdentity = useAuthStore((state) => state.clearIdentity);
  const currentIdentity = identity ?? (authStatus === "loading" ? initialIdentity : null);
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

    const nextPath = buildLocaleChangePath({
      nextLocale,
      pathname,
      searchParams,
    });

    if (nextPath) {
      if (navigate) {
        navigate(nextPath);
      } else {
        router.replace(nextPath);
        router.refresh();
      }
      refresh?.();
      return;
    }

    if (refresh) {
      refresh();
      return;
    }

    window.location.reload();
  };
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMobileLanguageViewOpen(false);
  };
  const mobileRowClassName = "flex w-full items-center justify-between px-1 py-3 text-left text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/20 focus:bg-brand-highlight/20 focus:outline-none active:bg-brand-highlight/30";
  const profileImage = currentIdentity?.profileImage ?? null;
  const profileLabel = currentIdentity?.identityName || t.mypage;
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
          href={`/${currentLocale}`}
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
            <div className="group relative">
              <button
                type="button"
                className="grid size-11 place-items-center overflow-hidden rounded-full border border-stroke-subtle bg-surface-base text-text-strong transition hover:bg-brand-highlight/30 focus:bg-brand-highlight/30 focus:outline-none focus:ring-2 focus:ring-brand-highlight"
                aria-label={profileLabel}
              >
                {profileImage ? (
                  <Image
                    alt=""
                    className="size-full object-cover"
                    height={44}
                    src={profileImage}
                    unoptimized
                    width={44}
                  />
                ) : (
                  <PersonIcon aria-hidden="true" className="size-5" />
                )}
              </button>
              <div className="invisible absolute right-0 top-full z-50 min-w-44 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="grid rounded-xl border border-stroke-subtle bg-surface-raised p-2 shadow-soft">
                  <Link
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/30 focus:bg-brand-highlight/30 focus:outline-none"
                    href="/mypage"
                  >
                    {t.mypage}
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-left text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/30 focus:bg-brand-highlight/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isLoggingOut}
                    onClick={() => void handleLogout()}
                  >
                    {isLoggingOut ? t.loggingOut : t.logout}
                  </button>
                </div>
              </div>
            </div>
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
          onClick={() => {
            setIsMobileMenuOpen((current) => !current);
            setIsMobileLanguageViewOpen(false);
          }}
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
          {isMobileLanguageViewOpen ? (
            <div className="grid divide-y divide-stroke-subtle">
              <button
                className={mobileRowClassName}
                onClick={() => setIsMobileLanguageViewOpen(false)}
                type="button"
              >
                <span>{t.backToMenu}</span>
              </button>
              {Object.entries(localeLabels).map(([value, label]) => (
                <button
                  aria-current={value === currentLocale ? "page" : undefined}
                  className={mobileRowClassName}
                  key={value}
                  onClick={() => {
                    handleLocaleChange(value as Locale);
                    closeMobileMenu();
                  }}
                  type="button"
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid divide-y divide-stroke-subtle">
              <button
                className={mobileRowClassName}
                onClick={() => setIsMobileLanguageViewOpen(true)}
                type="button"
              >
                <span>{t.language}</span>
                <span aria-hidden="true">›</span>
              </button>
              {isAuthenticated ? (
                <>
                  <Link className={mobileRowClassName} href="/mypage" onClick={closeMobileMenu}>
                    {t.mypage}
                  </Link>
                  <button
                    type="button"
                    className={`${mobileRowClassName} disabled:cursor-not-allowed disabled:opacity-70`}
                    disabled={isLoggingOut}
                    onClick={() => void handleLogout()}
                  >
                    {isLoggingOut ? t.loggingOut : t.logout}
                  </button>
                </>
              ) : (
                <Link className={mobileRowClassName} href={guestNavigation.href} onClick={closeMobileMenu}>
                  {t.login}
                </Link>
              )}
            </div>
          )}
        </nav>
      ) : null}
    </header>
  );
}
