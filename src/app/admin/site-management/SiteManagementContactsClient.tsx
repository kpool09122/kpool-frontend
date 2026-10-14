"use client";

import { MyContactsClient } from "../user/contacts/MyContactsClient";
import { useAdmin } from "../AdminProvider";
import { canViewSiteManagementContacts } from "@/gateways/site-management/siteManagementPolicy";
import { SiteManagementContactsClient as OperatorContactsClient } from "./contacts/SiteManagementContactsClient";
import { SiteManagementPageClient } from "./SiteManagementPageClient";

export function SiteManagementContactsClient() {
  const { currentIdentity } = useAdmin();
  return (
    <SiteManagementPageClient activeTab="contacts">
      {canViewSiteManagementContacts(currentIdentity) ? <OperatorContactsClient /> : <MyContactsClient />}
    </SiteManagementPageClient>
  );
}
