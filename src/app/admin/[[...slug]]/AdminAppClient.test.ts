import { describe, expect, it } from "vitest";

import { resolveAdminClientPage } from "./AdminAppClient";

describe("resolveAdminClientPage", () => {
  it("resolves SiteManagement independently of Wiki", () => {
    expect(resolveAdminClientPage("/admin/site-management/principal-groups")).toBe("siteManagementPrincipalGroups");
    expect(resolveAdminClientPage("/admin/site-management/contacts")).toBe("siteManagementContacts");
  });
  it("resolves the direct other settings route", () => {
    expect(resolveAdminClientPage("/admin/user/other")).toBe("userOther");
  });
});
