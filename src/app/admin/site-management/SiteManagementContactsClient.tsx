"use client";

import Link from "next/link";

import { MyContactsClient } from "../user/contacts/MyContactsClient";
import { useI18n } from "../../../i18n/I18nProvider";

export function SiteManagementContactsClient() {
  const { dictionary } = useI18n();
  const t = dictionary.admin;

  return (
    <section className="space-y-5">
      <div className="overflow-x-auto border-b border-stroke-subtle">
        <div aria-label={t.siteManagementTabsLabel} className="-mb-px flex gap-1" role="tablist">
          <Link
            aria-selected
            className="whitespace-nowrap border-b-2 border-brand-primary px-4 py-3 text-sm font-semibold text-text-strong"
            href="/admin/site-management/contacts"
            role="tab"
          >
            {t.myContacts.tab}
          </Link>
        </div>
      </div>
      <MyContactsClient />
    </section>
  );
}
