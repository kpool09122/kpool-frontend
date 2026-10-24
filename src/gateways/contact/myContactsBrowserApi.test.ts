import { describe, expect, it, vi } from "vitest";
import { fetchMyContactDetail, fetchMyContacts } from "./contactBrowserApi";

const contact = { contactIdentifier: "11111111-1111-4111-8111-111111111111", identityIdentifier: null, category: 1, name: "山田花子", content: "お問い合わせ本文", createdAt: "2026-10-01T10:00:00+09:00", replyIdentifiers: [] };
describe("own contacts browser API", () => {
  it("uses credentialed no-store own-list and own-detail requests only", async () => {
    const fetchAdapter = vi.fn().mockResolvedValueOnce(Response.json([contact])).mockResolvedValueOnce(Response.json({ ...contact, replies: [] }));
    await expect(fetchMyContacts({ fallbackErrorMessage: "failed", fetchAdapter })).resolves.toEqual([contact]);
    await expect(fetchMyContactDetail({ contactIdentifier: contact.contactIdentifier, fallbackErrorMessage: "failed", fetchAdapter })).resolves.toMatchObject({ replies: [] });
    expect(fetchAdapter.mock.calls).toEqual([
      ["/api/site-management/contact/me", { cache: "no-store", credentials: "include", headers: { Accept: "application/json" } }],
      [`/api/site-management/contact/me/${contact.contactIdentifier}`, { cache: "no-store", credentials: "include", headers: { Accept: "application/json" } }],
    ]);
  });
  it.each([401, 403, 404, 422, 500])("preserves error status %s without returning stale data", async (status) => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ message: "rejected" }, { status }));
    await expect(fetchMyContacts({ fallbackErrorMessage: "failed", fetchAdapter })).rejects.toMatchObject({ contactRouteStatus: status, message: "rejected" });
  });
  it("rejects malformed IDs without requesting a URL", async () => {
    const fetchAdapter = vi.fn();
    await expect(fetchMyContactDetail({ contactIdentifier: "../other?x=1", fallbackErrorMessage: "failed", fetchAdapter })).rejects.toThrow();
    expect(fetchAdapter).not.toHaveBeenCalled();
  });
  it("rejects invalid JSON and invalid successful contracts", async () => {
    for (const response of [new Response("not json"), Response.json({ contacts: [] })]) {
      await expect(fetchMyContacts({ fallbackErrorMessage: "failed", fetchAdapter: vi.fn().mockResolvedValue(response) })).rejects.toThrow();
    }
  });
});
