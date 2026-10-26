import { describe, expect, it } from "vitest";

import { resolveAdminClientPage } from "./AdminAppClient";

describe("resolveAdminClientPage", () => {
  it("resolves private Wiki playlists", () => { expect(resolveAdminClientPage("/admin/wiki/playlists")).toBe("wikiPlaylists"); });
  it("resolves SiteManagement independently of Wiki", () => {
    expect(resolveAdminClientPage("/admin/site-management/principal-groups")).toBe("siteManagementPrincipalGroups");
  });
  it("resolves contacts without using the principal group management page", () => {
    expect(resolveAdminClientPage("/admin/site-management/contacts")).toBe("siteManagementContacts");
    expect(resolveAdminClientPage("/admin/site-management/announcements")).toBe("siteManagementAnnouncements");
    expect(resolveAdminClientPage("/admin/site-management")).toBe("siteManagementContacts");
  });
  it("resolves the direct other settings route", () => {
    expect(resolveAdminClientPage("/admin/user/other")).toBe("userOther");
  });
});
