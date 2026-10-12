"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { canManageSiteManagementPrincipalGroups } from "@/gateways/site-management/siteManagementPolicy";
import { useAdmin } from "../AdminProvider";
import { adminSectionRoutes } from "../adminTypes";

export function SiteManagementPageClient({ children }: { children: ReactNode }) {
  const { currentIdentity, t } = useAdmin();

  return (
    <section className="space-y-5">
      {canManageSiteManagementPrincipalGroups(currentIdentity) ? (
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
      ) : null}
      {children}
    </section>
  );
}
