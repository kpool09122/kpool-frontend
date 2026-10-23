import { siteManagementApiTypes } from "@kpool/types";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  fetchSiteManagementContactDetail,
  fetchSiteManagementContacts,
  parseSiteManagementContactDetail,
  parseSiteManagementContactsPage,
  replyToSiteManagementContact,
} from "./siteManagementContacts";

const identifier = "019a1234-5678-7000-8000-111111111111";
const contact = { contactIdentifier: identifier, principalIdentifier: identifier, category: 1, name: "Sender", replyIdentifiers: [], createdAt: "2026-10-08T00:00:00+00:00", content: "ログイン後に画面が表示されません。" };

describe("site-management contacts gateway", () => {
  it("preserves both reply types including submitter posts with failed notifications", () => {
    const replies = ["operator", "submitter"].map((replyType) => ({
      replyIdentifier: identifier, content: "返信", replyType, createdAt: contact.createdAt,
      sentAt: replyType === "submitter" ? null : contact.createdAt, name: null, principalIdentifier: null,
    }));
    expect(parseSiteManagementContactDetail({ ...contact, replies }).replies).toEqual(replies);
    expect(() => parseSiteManagementContactDetail({ ...contact, replies: [{ ...replies[0], replyType: "unknown" }] })).toThrow();
  });
  it("validates operator reply authors rather than accepting unknown passthrough values", () => {
    const reply = { replyIdentifier: identifier, content: "確認しました。", sentAt: contact.createdAt, principalIdentifier: identifier, name: "山田はるか" };
    const parse = (author: Record<string, unknown>) => parseSiteManagementContactDetail({ ...contact, replies: [{ ...reply, ...author }] }).replies[0];
    expect(parse({})).toEqual(reply);
    expectTypeOf(parse({}).principalIdentifier).toEqualTypeOf<string | null | undefined>();
    expectTypeOf(parse({}).name).toEqualTypeOf<string | null | undefined>();
    expect(parse({ principalIdentifier: null })).toEqual({ ...reply, principalIdentifier: null });
    expect(parse({ name: null })).toEqual({ ...reply, name: null });
    // A number must not slip through z.object().passthrough() as an untyped author.
    expect(() => parse({ name: 123 })).toThrow();
    expect(() => parse({ principalIdentifier: 123 })).toThrow();
    expect(() => parse({ principalIdentifier: "not-a-uuid" })).toThrow();
    const legacyReply = { replyIdentifier: identifier, content: reply.content, sentAt: reply.sentAt };
    expect(parseSiteManagementContactDetail({ ...contact, replies: [legacyReply] }).replies).toEqual([legacyReply]);
    // General/my-contact replies retain the original three-field contract.
    expect(siteManagementApiTypes.schemas.ContactReplyDetail.safeParse(legacyReply)).toEqual({ success: true, data: legacyReply });
  });

  it("requires full string content on the shared operator/sender/my-contact list schema, not just passthrough", () => {
    const schema = siteManagementApiTypes.schemas.MyContactSummary;
    const content = "ログイン後に画面が表示されません。\n👨‍👩‍👧‍👦 <b>確認をお願いします</b>";
    const result = schema.safeParse({ ...contact, content });
    expect(result.success && result.data.content).toBe(content);
    for (const invalid of [undefined, null, 123]) {
      expect(schema.safeParse({ ...contact, content: invalid }).success).toBe(false);
      expect(siteManagementApiTypes.schemas.ListContactsPage.safeParse({ contacts: [{ ...contact, content: invalid }], current_page: 1, last_page: 1, total: 1, per_page: 50 }).success).toBe(false);
    }
    // Submission snapshots are a different contract: they retain email/content and do not require list metadata.
    expect(siteManagementApiTypes.schemas.ContactSummary.safeParse({ contactIdentifier: identifier, category: 1, name: "Sender", email: "sender@example.com", content }).success).toBe(true);
  });

  it("parses the paginated backend list contract", () => {
    expect(parseSiteManagementContactsPage({ contacts: [contact], current_page: 1, last_page: 2, total: 51, per_page: 50 })).toMatchObject({ contacts: [contact], total: 51 });
  });

  it("requests all contacts without a reply filter with explicit pagination", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ contacts: [contact], current_page: 2, last_page: 2, total: 51, per_page: 50 }));
    await expect(fetchSiteManagementContacts({ page: 2, fetchAdapter })).resolves.toMatchObject({ current_page: 2 });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/site-management/contacts?page=2&perPage=50", expect.objectContaining({ cache: "no-store", credentials: "include" }));
  });

  it.each(["0", "1"] as const)("forwards the optional hasReply=%s filter", async (hasReply) => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ contacts: [contact], current_page: 2, last_page: 2, total: 51, per_page: 50 }));
    await fetchSiteManagementContacts({ page: 2, hasReply, fetchAdapter });
    expect(fetchAdapter).toHaveBeenCalledWith(`/api/site-management/contacts?hasReply=${hasReply}&page=2&perPage=50`, expect.anything());
  });

  it.each([undefined, "0"] as const)("combines the sender identifier with hasReply=%s", async (hasReply) => {
    const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ contacts: [contact], current_page: 1, last_page: 1, total: 1, per_page: 50 }));
    await fetchSiteManagementContacts({ page: 1, principalIdentifier: identifier, hasReply, fetchAdapter });
    const url = new URL(fetchAdapter.mock.calls[0][0], "http://localhost");
    expect(url.searchParams.get("principalIdentifier")).toBe(identifier);
    expect(url.searchParams.get("hasReply")).toBe(hasReply ?? null);
  });

  it.each(["", "invalid", " 019a1234-5678-7000-8000-111111111111"])("rejects invalid sender %s before fetching", async (principalIdentifier) => {
    const fetchAdapter = vi.fn();
    await expect(fetchSiteManagementContacts({ page: 1, principalIdentifier, fetchAdapter })).rejects.toThrow();
    expect(fetchAdapter).not.toHaveBeenCalled();
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
