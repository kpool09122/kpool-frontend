import { describe, expect, it } from "vitest";

import { resolveAdminClientPage } from "./AdminAppClient";

describe("resolveAdminClientPage", () => {
  it("resolves SiteManagement independently of Wiki", () => {
    expect(resolveAdminClientPage("/admin/site-management")).toBe("siteManagementContacts");
    expect(resolveAdminClientPage("/admin/site-management/")).toBe("siteManagementContacts");
    expect(resolveAdminClientPage("/admin/site-management/principal-groups")).toBe("siteManagementPrincipalGroups");
    expect(resolveAdminClientPage("/admin/site-management/contacts")).toBe("siteManagementContacts");
    expect(resolveAdminClientPage("/admin/site-management/contacts/unanswered")).toBe("siteManagementContacts");
  });
  it("resolves contacts without using the principal group management page", () => {
    expect(resolveAdminClientPage("/admin/site-management/contacts/manage")).toBe("siteManagementContacts");
    expect(resolveAdminClientPage("/admin/site-management/contacts")).toBe("siteManagementContacts");
    expect(resolveAdminClientPage("/admin/site-management/announcements")).toBe("siteManagementAnnouncements");
    expect(resolveAdminClientPage("/admin/site-management")).toBe("siteManagementContacts");
  });
  it("resolves the direct other settings route", () => {
    expect(resolveAdminClientPage("/admin/user/other")).toBe("userOther");
  });
  it("keeps the main notification settings route independent of contacts", () => {
    expect(resolveAdminClientPage("/admin/account/notification-settings")).toBe("accountNotifications");
    expect(resolveAdminClientPage("/admin/account/documents")).toBe("accountDocuments");
    expect(resolveAdminClientPage("/admin/account/profile")).toBe("accountProfile");
  });
});
