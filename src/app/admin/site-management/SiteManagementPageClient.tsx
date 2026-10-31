"use client";

import Link from "next/link";
import { canUseAnnouncements, canViewSiteManagementContacts } from "@/gateways/site-management/siteManagementPolicy";
import { dictionaries } from "@/i18n/dictionaries";
import type { ReactNode } from "react";
import { AccountStatusMessage } from "@/components/Account";

import { canShowSiteManagementPrincipalGroupManagement } from "../principalGroupVisibility";
import { useAdmin } from "../AdminProvider";

export function SiteManagementPageClient({ children, activeTab = "principalGroups" }: {
  children: ReactNode;
  activeTab?: "contacts" | "contactManagement" | "principalGroups" | "announcements";
}) {
  const { currentIdentity, t, locale } = useAdmin();
  const canShowManagement = canShowSiteManagementPrincipalGroupManagement(currentIdentity);
  const canViewContacts = canViewSiteManagementContacts(currentIdentity);

  if (activeTab === "principalGroups" && !canShowManagement) return (
    <AccountStatusMessage variant="empty">
      {t.siteManagementNoAvailableServices}
    </AccountStatusMessage>
  );

  return (
    <section className="space-y-5">
      <div className="overflow-x-auto border-b border-stroke-subtle">
        <div aria-label={t.siteManagementTabsLabel} className="-mb-px flex gap-1" role="tablist">
          <Link
            aria-selected={activeTab === "contacts"}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === "contacts" ? "border-brand-primary text-text-strong" : "border-transparent text-text-muted"}`}
            href="/admin/site-management/contacts"
            role="tab"
          >
            {t.myContacts.tab}
          </Link>
          {canViewContacts ? <Link
            aria-selected={activeTab === "contactManagement"}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === "contactManagement" ? "border-brand-primary text-text-strong" : "border-transparent text-text-muted"}`}
            href="/admin/site-management/contact-management"
            role="tab"
          >
            {t.siteManagementContacts.tab}
          </Link> : null}
          {canUseAnnouncements(currentIdentity, "view-draft") ? <Link role="tab" aria-selected={activeTab === "announcements"} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === "announcements" ? "border-brand-primary" : "border-transparent"}`} href="/admin/site-management/announcements">{dictionaries[locale].announcements.management}</Link> : null}
          {canShowManagement ? <Link
            aria-selected={activeTab === "principalGroups"}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === "principalGroups" ? "border-brand-primary text-text-strong" : "border-transparent text-text-muted"}`}
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
