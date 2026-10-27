"use client";

import { ChevronRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { redirect, usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useSyncExternalStore } from "react";

import { getAdminNavigation, resolveAdminSection } from "./adminNavigation";
import { useAdmin } from "./AdminProvider";
import { AccountInitialSetupClient } from "./AccountInitialSetupClient";
import { normalizeReturnTo } from "@/gateways/auth/authFlow";
import { isAccountSetupRequired, isAccountStatusUnavailable, isAccountSuspended } from "@/gateways/identity/identityApi";

const selectedSectionClass = "bg-brand-highlight/70 text-text-strong";
const subscribeToHydration = () => () => {};
const desktopSidebarQuery = "(min-width: 1024px)";
const subscribeToViewport = (onChange: () => void) => {
  const media = window.matchMedia?.(desktopSidebarQuery);
  media?.addEventListener("change", onChange);
  return () => media?.removeEventListener("change", onChange);
};
const getDesktopSnapshot = () => window.matchMedia?.(desktopSidebarQuery).matches ?? window.innerWidth >= 1024;

type AdminShellClientProps = {
  children: ReactNode;
};

export function AdminShellClient({
  children,
}: AdminShellClientProps) {
  const pathname = usePathname();
  const { currentIdentity, t, principalState = { status: "idle" } } = useAdmin();
  const searchParams = useSearchParams();
  const [sidebarOverride, setSidebarOverride] = useState<boolean | null>(null);
  const isDesktop = useSyncExternalStore(subscribeToViewport, getDesktopSnapshot, () => false);
  const isSidebarOpen = sidebarOverride ?? isDesktop;
  const isSidebarHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const activeSection = resolveAdminSection(pathname);
  const isUserSettings = activeSection === "settings";
  const navigation = getAdminNavigation(currentIdentity, principalState);
  const fallbackRoute = navigation[0].href;
  const hiddenSection = !navigation.some((item) => item.section === activeSection);
  const shouldRedirect = hiddenSection && !isAccountSetupRequired(currentIdentity) && !isAccountStatusUnavailable(currentIdentity);
  const accountSuspended = isAccountSuspended(currentIdentity);
  const accountPrincipalStopped = currentIdentity.accountPrincipalStatus === "suspended" || currentIdentity.accountPrincipalStatus === "forced_stop";
  const wikiPrincipalStopped = principalState.status === "available" && principalState.principal.status !== "active";
  const sitePrincipalStopped = currentIdentity.siteManagementPrincipalStatus === "suspended" || currentIdentity.siteManagementPrincipalStatus === "forced_stop";
  const principalStopped = !isUserSettings && (accountPrincipalStopped || (activeSection === "wiki" && wikiPrincipalStopped) || (activeSection === "siteManagement" && sitePrincipalStopped));
  const headerTitle = activeSection === "wiki"
    ? t.wikiHeaderTitle
    : activeSection === "siteManagement"
      ? t.siteManagementMenu
    : activeSection === "accountSettings"
      ? t.accountSettingsHeaderTitle
      : t.settingsHeaderTitle;

  if (shouldRedirect) redirect(fallbackRoute);

  if (!isUserSettings && isAccountStatusUnavailable(currentIdentity)) {
    return (
      <main className="flex-1 bg-surface-base px-6 py-8 text-text-strong sm:px-10">
        <section role="alert" className="mx-auto max-w-2xl space-y-3 rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
          <h1 className="text-2xl font-bold">{t.accountStatusErrorTitle}</h1>
          <p className="text-sm leading-7 text-text-muted">{t.accountStatusErrorMessage}</p>
        </section>
      </main>
    );
  }

  if (!isUserSettings && isAccountSetupRequired(currentIdentity)) {
    const returnTo = searchParams.get("authReturnTo") || searchParams.get("returnTo");
    return (
      <main className="flex-1 bg-surface-base px-6 py-8 text-text-strong sm:px-10">
        <AccountInitialSetupClient returnTo={returnTo ? normalizeReturnTo(returnTo) : null} />
      </main>
    );
  }

  return (
    <main
      className={`flex-1 bg-surface-base px-6 py-8 text-text-strong transition-[padding] duration-300 sm:px-10 lg:pr-16 ${
        sidebarOverride === false ? "lg:pl-20" : "lg:pl-80"
      }`}
    >
      <aside
        aria-label={t.sidebarLabel}
        className={`fixed bottom-0 left-0 top-20 z-30 w-72 max-w-[calc(100vw-2rem)] transition-transform duration-300 ${
          sidebarOverride === null ? "-translate-x-full lg:translate-x-0" : isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          disabled={!isSidebarHydrated}
          aria-label={isSidebarOpen ? t.collapseSidebar : t.expandSidebar}
          aria-expanded={isSidebarOpen}
          className="absolute -right-11 top-6 z-10 grid h-20 w-11 place-items-center rounded-r-2xl border-y border-r border-stroke-subtle bg-surface-raised text-text-strong shadow-soft transition hover:bg-brand-highlight/20"
          onClick={() => setSidebarOverride(!isSidebarOpen)}
        >
          <span className={`transition-transform ${sidebarOverride === null ? "lg:rotate-180" : isSidebarOpen ? "rotate-180" : ""}`}>
            <ChevronRightIcon />
          </span>
        </button>
        <div className="relative h-full overflow-y-auto border border-l-0 border-stroke-subtle bg-surface-raised p-4 shadow-soft">
          <div className={sidebarOverride === null ? "pointer-events-none invisible lg:pointer-events-auto lg:visible" : isSidebarOpen ? "block" : "pointer-events-none invisible"}>
            <nav className="grid gap-2">
              {navigation.map((item) => (
                <AdminSectionLink href={item.href} isSelected={activeSection === item.section} label={t[item.labelKey]} key={item.section} />
              ))}
            </nav>
          </div>
        </div>
      </aside>

      <div className="mx-auto max-w-5xl">
        <section className="min-w-0 space-y-6">
          <header className="space-y-3">
            <h1 className="text-3xl font-bold">{headerTitle}</h1>
          </header>
          {accountSuspended && !isUserSettings ? (
            <section className="rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
              <h2 className="text-xl font-bold">{t.suspendedAccountTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-text-muted">{t.suspendedAccountMessage}</p>
            </section>
          ) : principalStopped ? <section role="alert" className="rounded-xl border p-6"><p>{t.principalStatus.inactive}</p></section> : children}
        </section>
      </div>
    </main>
  );
}

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
