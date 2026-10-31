import { describe, expect, it, vi } from "vitest";

import {
  fetchSiteManagementContactDetail,
  fetchSiteManagementContacts,
  hasLatestReplyFromPrincipal,
  parseSiteManagementContactsPage,
  replyToSiteManagementContact,
  type SiteManagementContactDetail,
  type SiteManagementContactsPage,
} from "./siteManagementContacts";

const identifier = "019a1234-5678-7000-8000-111111111111";
const contact: SiteManagementContactsPage["contacts"][number] = { contactIdentifier: identifier, principalIdentifier: identifier, category: 1, name: "Sender", content: "Inquiry", replyIdentifiers: [], replies: [], createdAt: "2026-10-08T00:00:00+00:00" };

describe("site-management contacts gateway", () => {
  it("parses the paginated backend list contract", () => {
    expect(parseSiteManagementContactsPage({ contacts: [contact], current_page: 1, last_page: 2, total: 51, per_page: 50 })).toMatchObject({ contacts: [contact], total: 51 });
  });

  it("requests only unanswered contacts with explicit pagination", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ contacts: [contact], current_page: 2, last_page: 2, total: 51, per_page: 50 }));
    await expect(fetchSiteManagementContacts({ page: 2, fetchAdapter })).resolves.toMatchObject({ current_page: 2 });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/site-management/contacts?lastReplyByMe=0&page=2&perPage=50", expect.objectContaining({ cache: "no-store", credentials: "include" }));
  });

  it("omits the reply filter when requesting all inquiries", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ contacts: [contact], current_page: 1, last_page: 1, total: 1, per_page: 50 }));
    await fetchSiteManagementContacts({ page: 1, unansweredOnly: false, fetchAdapter });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/site-management/contacts?page=1&perPage=50", expect.anything());
  });

  it("gets an anonymous contact detail by contact identifier only", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ ...contact, principalIdentifier: null, content: "Inquiry", replies: [] }));
    await expect(fetchSiteManagementContactDetail({ contactIdentifier: identifier, fetchAdapter })).resolves.toMatchObject({ principalIdentifier: null, content: "Inquiry" });
    expect(fetchAdapter).toHaveBeenCalledWith(`/api/site-management/contacts/${identifier}`, expect.objectContaining({ cache: "no-store", credentials: "include" }));
  });

  it("accepts a submitter reply with nullable sentAt from backend #747", async () => {
    const reply: SiteManagementContactDetail["replies"][number] = { replyIdentifier: identifier, replyNumber: 1, principalIdentifier: identifier, name: "Sender", content: "Additional information", sentAt: null, replyType: "submitter", createdAt: contact.createdAt };
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ ...contact, principalIdentifier: null, replies: [reply] }));
    await expect(fetchSiteManagementContactDetail({ contactIdentifier: identifier, fetchAdapter })).resolves.toMatchObject({ principalIdentifier: null, replies: [reply] });
  });

  it("sends reply content and accepts the no-content response", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await expect(replyToSiteManagementContact({ contactIdentifier: identifier, content: "Reply", fetchAdapter })).resolves.toBeUndefined();
    expect(fetchAdapter).toHaveBeenCalledWith(`/api/site-management/contacts/${identifier}/replies`, expect.objectContaining({ method: "POST", body: '{"content":"Reply"}' }));
  });
});

describe("latest reply status", () => {
  const mine = "019a1234-5678-7000-8000-666666666666";
  const reply = (replyNumber: number, principalIdentifier: string | null) => ({ replyIdentifier: identifier, replyNumber, principalIdentifier, name: null, content: "Reply", sentAt: null, createdAt: contact.createdAt });

  it("uses reply sequence and author even when mail has not been delivered", () => {
    expect(hasLatestReplyFromPrincipal({ replies: [reply(2, mine), reply(1, identifier)] }, mine)).toBe(true);
    expect(hasLatestReplyFromPrincipal({ replies: [reply(1, mine), reply(2, identifier)] }, mine)).toBe(false);
    expect(hasLatestReplyFromPrincipal({ replies: [reply(1, mine), reply(2, null)] }, mine)).toBe(false);
    expect(hasLatestReplyFromPrincipal({ replies: [] }, mine)).toBe(false);
    expect(hasLatestReplyFromPrincipal({ replies: [reply(1, null)] }, null)).toBe(false);
  });
});
