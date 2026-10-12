"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccountStatusMessage } from "@/components/Account";

import { canShowSiteManagementPrincipalGroupManagement } from "../principalGroupVisibility";
import { useAdmin } from "../AdminProvider";
import { adminSectionRoutes } from "../adminTypes";

export function SiteManagementPageClient({ children }: { children: ReactNode }) {
  const { currentIdentity, t } = useAdmin();
  const canShowManagement = canShowSiteManagementPrincipalGroupManagement(currentIdentity);

  if (!canShowManagement) return (
    <AccountStatusMessage variant="empty">
      {t.siteManagementNoAvailableServices}
    </AccountStatusMessage>
  );

  return (
    <section className="space-y-5">
      <div className="overflow-x-auto border-b border-stroke-subtle">
        <div aria-label={t.siteManagementTabsLabel} className="-mb-px flex gap-1" role="tablist">
          <Link
            aria-selected={true}
            className="whitespace-nowrap border-b-2 border-brand-primary px-4 py-3 text-sm font-semibold text-text-strong transition"
            href={adminSectionRoutes.siteManagement}
            role="tab"
          >
            {t.siteManagementPrincipalGroups.title}
          </Link>
        </div>
      </div>
      {children}
    </section>
  );
}
