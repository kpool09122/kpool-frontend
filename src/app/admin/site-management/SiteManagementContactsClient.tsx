"use client";

import { MyContactsClient } from "../user/contacts/MyContactsClient";
import { SiteManagementPageClient } from "./SiteManagementPageClient";

export function SiteManagementContactsClient() {
  return (
    <SiteManagementPageClient activeTab="contacts">
      <MyContactsClient />
    </SiteManagementPageClient>
  );
}
