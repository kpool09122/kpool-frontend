"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type HeaderProps = {
  initialIsAuthenticated?: boolean;
  logoutAdapter?: () => Promise<void>;
  navigate?: (url: string) => void;
  refresh?: () => void;
};

const guestNavigation = {
  href: "/login",
  label: "ログイン",
};
const mobileNavigationId = "mobile-navigation";

const logoutFromIdentity = async (): Promise<void> => {
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isAuthenticated = initialIsAuthenticated;

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logoutAdapter();
    } finally {
      if (navigate) {
        navigate("/login");
      } else {
        router.replace("/login");
        router.refresh();
      }
      refresh?.();
    }
  };

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

        {isAuthenticated ? (
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              className="inline-flex items-center rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
              href="/mypage"
            >
              マイページ
            </Link>
            <button
              type="button"
              className="hidden items-center rounded-full border border-stroke-subtle bg-surface-base px-5 py-2.5 text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/30 sm:inline-flex disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              {isLoggingOut ? "ログアウト中" : "ログアウト"}
            </button>
          </div>
        ) : (
          <Link
            className="hidden items-center rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 sm:inline-flex"
            href={guestNavigation.href}
          >
            {guestNavigation.label}
          </Link>
        )}

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-stroke-subtle bg-surface-base text-text-strong transition hover:bg-brand-highlight/30 sm:hidden"
          aria-label="ナビゲーションメニュー"
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
          aria-label="モバイルメニュー"
          className="border-t border-stroke-subtle bg-surface-raised px-6 py-4 sm:hidden"
        >
          {isAuthenticated ? (
            <div className="grid gap-3">
              <Link
                className="flex items-center rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
                href="/mypage"
              >
                マイページ
              </Link>
              <button
                type="button"
                className="flex items-center rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
              >
                {isLoggingOut ? "ログアウト中" : "ログアウト"}
              </button>
            </div>
          ) : (
            <Link
              className="flex items-center rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
              href={guestNavigation.href}
            >
              {guestNavigation.label}
            </Link>
          )}
        </nav>
      ) : null}
    </header>
  );
}
