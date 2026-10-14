import { describe, expect, it, vi } from "vitest";

import {
  fetchSiteManagementContactDetail,
  fetchSiteManagementContacts,
  parseSiteManagementContactsPage,
  replyToSiteManagementContact,
} from "./siteManagementContacts";

const identifier = "019a1234-5678-7000-8000-111111111111";
const contact = { contactIdentifier: identifier, principalIdentifier: identifier, category: 1, name: "Sender", replyIdentifiers: [], createdAt: "2026-10-08T00:00:00+00:00" };

describe("site-management contacts gateway", () => {
  it("parses the paginated backend list contract", () => {
    expect(parseSiteManagementContactsPage({ contacts: [contact], current_page: 1, last_page: 2, total: 51, per_page: 50 })).toMatchObject({ contacts: [contact], total: 51 });
  });

  it("requests only unanswered contacts with explicit pagination", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ contacts: [contact], current_page: 2, last_page: 2, total: 51, per_page: 50 }));
    await expect(fetchSiteManagementContacts({ page: 2, fetchAdapter })).resolves.toMatchObject({ current_page: 2 });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/site-management/contacts?hasReply=0&page=2&perPage=50", expect.objectContaining({ cache: "no-store", credentials: "include" }));
  });

  it("gets an anonymous contact detail by contact identifier only", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ ...contact, principalIdentifier: null, content: "Inquiry", replies: [] }));
    await expect(fetchSiteManagementContactDetail({ contactIdentifier: identifier, fetchAdapter })).resolves.toMatchObject({ principalIdentifier: null, content: "Inquiry" });
    expect(fetchAdapter).toHaveBeenCalledWith(`/api/site-management/contacts/${identifier}`, expect.objectContaining({ cache: "no-store", credentials: "include" }));
  });

  it("sends reply content and accepts the no-content response", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await expect(replyToSiteManagementContact({ contactIdentifier: identifier, content: "Reply", fetchAdapter })).resolves.toBeUndefined();
    expect(fetchAdapter).toHaveBeenCalledWith(`/api/site-management/contacts/${identifier}/replies`, expect.objectContaining({ method: "POST", body: '{"content":"Reply"}' }));
  });
});
