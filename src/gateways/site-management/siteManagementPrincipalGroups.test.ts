import { describe, expect, it, vi } from "vitest";
import { fetchSiteManagementPrincipalGroups, saveSiteManagementPrincipalGroups, parseSiteManagementPrincipalGroups, siteManagementMembersRequestSchema } from "./siteManagementPrincipalGroups";
const id = "11111111-1111-4111-8111-111111111111";
describe("SiteManagement gateway", () => {
  it("preserves unassigned principals and requires the complete list contract", () => {
    const body = { principalGroups: [], principals: [{ principalIdentifier: id, identityIdentifier: id, identityName: "", email: "user@example.test" }] };
    expect(parseSiteManagementPrincipalGroups(body)).toEqual(body);
    expect(() => parseSiteManagementPrincipalGroups({ principalGroups: [] })).toThrow();
  });
  it("uses the dedicated BFF without an account query, with cookies and no-store", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ principalGroups: [], principals: [] }));
    await fetchSiteManagementPrincipalGroups({ fetchAdapter });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/site-management/principal-groups", expect.objectContaining({ cache: "no-store", credentials: "include" }));
  });
  it.each([401,403,404,422,503])("preserves status %s with safe messages", async (status) => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ detail: "private database" }, { status }));
    await expect(fetchSiteManagementPrincipalGroups({ fetchAdapter })).rejects.toMatchObject({ status, message: "SiteManagement principal groups are unavailable." });
  });
  it("sends PATCH and accepts the committed refresh envelope", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ committed: true, refresh: { ok: true, data: { principalGroups: [], principals: [] } } }));
    expect(await saveSiteManagementPrincipalGroups({ principalGroups: [] }, { fetchAdapter })).toMatchObject({ committed: true, refresh: { ok: true } });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/site-management/principal-groups/members", expect.objectContaining({ method: "PATCH", credentials: "include", body: '{"principalGroups":[]}' }));
  });
  it("validates duplicates but allows empty memberships and cross-group membership", () => {
    const item = { principalGroupIdentifier: id, principalIdentifiers: [id] };
    expect(siteManagementMembersRequestSchema.safeParse({ principalGroups: [item, item] }).success).toBe(false);
    expect(siteManagementMembersRequestSchema.safeParse({ principalGroups: [{ ...item, principalIdentifiers: [id,id] }] }).success).toBe(false);
    expect(siteManagementMembersRequestSchema.safeParse({ principalGroups: [{ ...item, principalIdentifiers: [] }] }).success).toBe(true);
  });
});
