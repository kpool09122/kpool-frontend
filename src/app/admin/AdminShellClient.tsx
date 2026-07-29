"use client";

import { ChevronRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { adminSectionRoutes, type AdminSection } from "./adminTypes";
import { useAdmin } from "./AdminProvider";

const selectedSectionClass = "bg-brand-highlight/70 text-text-strong";

type AdminShellClientProps = {
  children: ReactNode;
};

export function AdminShellClient({
  children,
}: AdminShellClientProps) {
  const pathname = usePathname();
  const { canShowAccountSettings, t } = useAdmin();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarHydrated, setIsSidebarHydrated] = useState(false);
  const activeSection = resolveActiveSection(pathname);
  const headerTitle = activeSection === "wiki"
    ? t.wikiHeaderTitle
    : activeSection === "accountSettings"
      ? t.accountSettingsHeaderTitle
      : t.settingsHeaderTitle;
  const headerDescription = activeSection === "wiki"
    ? t.wikiHeaderDescription
    : activeSection === "settings"
      ? t.settingsHeaderDescription
      : null;

  useEffect(() => {
    // The sidebar toggle is disabled until hydration so pre-hydration clicks are not lost.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSidebarHydrated(true);
  }, []);

  return (
    <main
      className={`min-h-[calc(100vh-73px)] bg-surface-base px-6 py-8 text-text-strong transition-[padding] duration-300 sm:px-10 lg:pr-16 ${
        isSidebarOpen ? "lg:pl-80" : "lg:pl-20"
      }`}
    >
      <aside
        aria-label={t.sidebarLabel}
        className={`fixed bottom-0 left-0 top-20 z-30 w-72 max-w-[calc(100vw-2rem)] transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          disabled={!isSidebarHydrated}
          aria-label={isSidebarOpen ? t.collapseSidebar : t.expandSidebar}
          aria-expanded={isSidebarOpen}
          className="absolute -right-11 top-6 z-10 grid h-20 w-11 place-items-center rounded-r-2xl border-y border-r border-stroke-subtle bg-surface-raised text-text-strong shadow-soft transition hover:bg-brand-highlight/20"
          onClick={() => setIsSidebarOpen((current) => !current)}
        >
          <span className={`transition-transform ${isSidebarOpen ? "rotate-180" : ""}`}>
            <ChevronRightIcon />
          </span>
        </button>
        <div className="relative h-full overflow-y-auto border border-l-0 border-stroke-subtle bg-surface-raised p-4 shadow-soft">
          <div className={isSidebarOpen ? "block" : "pointer-events-none invisible"}>
            <nav className="grid gap-2">
              <AdminSectionLink
                href={adminSectionRoutes.wiki}
                isSelected={activeSection === "wiki"}
                label={t.wikiMenu}
              />
              {canShowAccountSettings ? (
                <AdminSectionLink
                  href={adminSectionRoutes.accountSettings}
                  isSelected={activeSection === "accountSettings"}
                  label={t.accountSettingsMenu}
                />
              ) : null}
              <AdminSectionLink
                href={adminSectionRoutes.settings}
                isSelected={activeSection === "settings"}
                label={t.settingsMenu}
              />
            </nav>
          </div>
        </div>
      </aside>

      <div className="mx-auto max-w-5xl">
        <section className="min-w-0 space-y-6">
          <header className="space-y-3">
            <h1 className="text-3xl font-bold">{headerTitle}</h1>
            {headerDescription ? (
              <p className="max-w-3xl text-sm leading-7 text-text-muted">
                {headerDescription}
              </p>
            ) : null}
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}

const resolveActiveSection = (pathname: string | null): AdminSection => {
  if (pathname?.startsWith("/admin/account")) {
    return "accountSettings";
  }

  if (pathname?.startsWith("/admin/user")) {
    return "settings";
  }

  return "wiki";
};

function AdminSectionLink({
  href,
  isSelected,
  label,
}: {
  href: string;
  isSelected: boolean;
  label: string;
}) {
  return (
    <Link
      className={`rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
        isSelected
          ? selectedSectionClass
          : "text-text-muted hover:bg-brand-highlight/30 hover:text-text-strong"
      }`}
      aria-current={isSelected ? "page" : undefined}
      href={href}
    >
      {label}
    </Link>
  );
}
