"use client";

import Link from "next/link";
import { canUseAnnouncements } from "@/gateways/site-management/siteManagementPolicy";
import { dictionaries } from "@/i18n/dictionaries";
import { useEffect, type ReactNode } from "react";
import { AccountStatusMessage } from "@/components/Account";

import { usePathname, useRouter } from "next/navigation";
import { canShowSiteManagementPrincipalGroupManagement } from "../principalGroupVisibility";
import { useAdmin } from "../AdminProvider";
import { canViewOwnSiteManagementContacts, canViewSiteManagementContacts } from "@/gateways/site-management/siteManagementPolicy";

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
  const router = useRouter();
  const canShowManagement = canShowSiteManagementPrincipalGroupManagement(currentIdentity);
  const canViewContacts = canViewSiteManagementContacts(currentIdentity);
  const canViewContactTab = canViewContacts || canViewOwnSiteManagementContacts(currentIdentity);
  const canViewAnnouncements = canUseAnnouncements(currentIdentity, "view-draft");
  const isAnnouncementsSelected = activeTab === "announcements" || pathname === "/admin/site-management/announcements";
  const isPrincipalGroupsSelected = activeTab === "principalGroups" || pathname === "/admin/site-management/principal-groups";
  const isContactsSelected = pathname === "/admin/site-management/contacts" || pathname === "/admin/site-management" || pathname === "/admin/site-management/";

  useEffect(() => {
    if (pathname === "/admin/site-management/contacts/unanswered" && canViewContactTab) {
      router.replace(canViewContacts ? "/admin/site-management/contacts/manage?hasReply=0" : "/admin/site-management/contacts");
    } else if (pathname === "/admin/site-management/contacts/manage" && !canViewContacts && canViewContactTab) {
      router.replace("/admin/site-management/contacts");
    }
  }, [pathname, canViewContacts, canViewContactTab, router]);

  if (!canShowManagement && !canViewContactTab && !canViewAnnouncements) return (
    <AccountStatusMessage variant="empty">
      {t.siteManagementNoAvailableServices}
    </AccountStatusMessage>
  );

  return (
    <section className="space-y-5">
      <div className="overflow-x-auto border-b border-stroke-subtle">
        <div aria-label={t.siteManagementTabsLabel} className="-mb-px flex gap-1" role="tablist">
          {canViewAnnouncements ? <Link role="tab" aria-selected={isAnnouncementsSelected} className={tabClassName(isAnnouncementsSelected)} href="/admin/site-management/announcements">{dictionaries[locale].announcements.management}</Link> : null}
          {canShowManagement ? <Link
            aria-selected={isPrincipalGroupsSelected}
            className={tabClassName(isPrincipalGroupsSelected)}
            href="/admin/site-management/principal-groups"
            role="tab"
          >
            {t.siteManagementPrincipalGroups.title}
          </Link> : null}
          {canViewContactTab ? <Link
            aria-selected={isContactsSelected}
            className={tabClassName(isContactsSelected)}
            href="/admin/site-management/contacts"
            role="tab"
          >
            {t.myContacts.tab}
          </Link> : null}
          {canViewContacts ? <Link
            aria-selected={pathname === "/admin/site-management/contacts/manage"}
            className={tabClassName(pathname === "/admin/site-management/contacts/manage")}
            href="/admin/site-management/contacts/manage"
            role="tab"
          >
            {t.siteManagementContacts.title}
          </Link> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
