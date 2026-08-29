"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccountStatusMessage } from "@/components/Account";

import { canShowSiteManagementPrincipalGroupManagement } from "../principalGroupVisibility";
import { useAdmin } from "../AdminProvider";

export function SiteManagementPageClient({ children, activeTab = "principalGroups" }: {
  children: ReactNode;
  activeTab?: "contacts" | "principalGroups";
}) {
  const { currentIdentity, t } = useAdmin();
  const canShowManagement = canShowSiteManagementPrincipalGroupManagement(currentIdentity);

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
