"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccountStatusMessage } from "@/components/Account";

import { usePathname } from "next/navigation";
import { canShowSiteManagementPrincipalGroupManagement } from "../principalGroupVisibility";
import { useAdmin } from "../AdminProvider";
import { adminSectionRoutes } from "../adminTypes";
import { canViewSiteManagementContacts } from "@/gateways/site-management/siteManagementPolicy";

const tabClassName = (selected: boolean) =>
  `whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${selected
    ? "border-brand-primary text-text-strong"
    : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"}`;

export function SiteManagementPageClient({ children }: { children: ReactNode }) {
  const { currentIdentity, t } = useAdmin();
  const pathname = usePathname();
  const canShowManagement = canShowSiteManagementPrincipalGroupManagement(currentIdentity);
  const canViewContacts = canViewSiteManagementContacts(currentIdentity);

  if (!canShowManagement && !canViewContacts) return (
    <AccountStatusMessage variant="empty">
      {t.siteManagementNoAvailableServices}
    </AccountStatusMessage>
  );

  return (
    <section className="space-y-5">
      <div className="overflow-x-auto border-b border-stroke-subtle">
        <div aria-label={t.siteManagementTabsLabel} className="-mb-px flex gap-1" role="tablist">
          {canShowManagement ? <Link
            aria-selected={!pathname?.startsWith("/admin/site-management/contacts")}
            className={tabClassName(!pathname?.startsWith("/admin/site-management/contacts"))}
            href={adminSectionRoutes.siteManagement}
            role="tab"
          >
            {t.siteManagementPrincipalGroups.title}
          </Link> : null}
          {canViewContacts ? <Link
            aria-selected={pathname?.startsWith("/admin/site-management/contacts")}
            className={tabClassName(Boolean(pathname?.startsWith("/admin/site-management/contacts")))}
            href="/admin/site-management/contacts"
            role="tab"
          >
            {t.siteManagementContacts.tab}
          </Link> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
