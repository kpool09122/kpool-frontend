import { describe, expect, it } from "vitest";

import { resolveAdminClientPage } from "./AdminAppClient";

describe("resolveAdminClientPage", () => {
  it("resolves owner watch-request links including exact Wiki destinations", () => {
    expect(resolveAdminClientPage("/admin/wiki/watch-requests")).toBe("wikiWatchRequests");
    expect(resolveAdminClientPage("/admin/wiki/watch-requests/00000000-0000-4000-8000-000000000001")).toBe("wikiWatchRequests");
  });
  it("resolves private Wiki playlists", () => { expect(resolveAdminClientPage("/admin/wiki/playlists")).toBe("wikiPlaylists"); });
  it("resolves SiteManagement independently of Wiki", () => {
    expect(resolveAdminClientPage("/admin/site-management/principal-groups")).toBe("siteManagementPrincipalGroups");
    expect(resolveAdminClientPage("/admin/site-management/contacts")).toBe("siteManagementContacts");
  });
  it("resolves contacts without using the principal group management page", () => {
    expect(resolveAdminClientPage("/admin/site-management/contacts")).toBe("siteManagementContacts");
    expect(resolveAdminClientPage("/admin/site-management/contact-management")).toBe("siteManagementContactManagement");
    expect(resolveAdminClientPage("/admin/site-management/announcements")).toBe("siteManagementAnnouncements");
    expect(resolveAdminClientPage("/admin/site-management")).toBe("siteManagementContacts");
  });
  it("resolves the direct other settings route", () => {
    expect(resolveAdminClientPage("/admin/user/other")).toBe("userOther");
  });
});
