"use client";

import Link from "next/link";
import { canUseAnnouncements } from "@/gateways/site-management/siteManagementPolicy";
import { dictionaries } from "@/i18n/dictionaries";
import type { ReactNode } from "react";
import { AccountStatusMessage } from "@/components/Account";

import { usePathname } from "next/navigation";
import { canShowSiteManagementPrincipalGroupManagement } from "../principalGroupVisibility";
import { useAdmin } from "../AdminProvider";
import { canViewSiteManagementContacts } from "@/gateways/site-management/siteManagementPolicy";

const tabClassName = (selected: boolean) =>
  `whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${selected
    ? "border-brand-primary text-text-strong"
    : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"}`;

export function SiteManagementPageClient({ children, activeTab }: {
  children: ReactNode;
  activeTab?: "contacts" | "principalGroups" | "announcements";
}) {
  const { currentIdentity, t, locale } = useAdmin();
  const pathname = usePathname();
  const selectedTab = activeTab ?? (pathname?.endsWith("/principal-groups") ? "principalGroups" : "contacts");
  const canShowManagement = canShowSiteManagementPrincipalGroupManagement(currentIdentity);
  const canViewContacts = canViewSiteManagementContacts(currentIdentity);

  if (selectedTab === "principalGroups" && !canShowManagement) return (
    <AccountStatusMessage variant="empty">
      {t.siteManagementNoAvailableServices}
    </AccountStatusMessage>
  );

  return (
    <section className="space-y-5">
      <div className="overflow-x-auto border-b border-stroke-subtle">
        <div aria-label={t.siteManagementTabsLabel} className="-mb-px flex gap-1" role="tablist">
          <Link
            aria-selected={selectedTab === "contacts"}
            className={tabClassName(selectedTab === "contacts")}
            href="/admin/site-management/contacts"
            role="tab"
          >
            {canViewContacts ? t.siteManagementContacts.tab : t.myContacts.tab}
          </Link>
          {canUseAnnouncements(currentIdentity, "view-draft") ? <Link role="tab" aria-selected={activeTab === "announcements"} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === "announcements" ? "border-brand-primary" : "border-transparent"}`} href="/admin/site-management/announcements">{dictionaries[locale].announcements.management}</Link> : null}
          {canShowManagement ? <Link
            aria-selected={selectedTab === "principalGroups"}
            className={tabClassName(selectedTab === "principalGroups")}
            href="/admin/site-management/principal-groups"
            role="tab"
          >
            {t.siteManagementPrincipalGroups.title}
          </Link> : null}

        </div>
      </div>
      {children}
    </section>
  );
}
