import { describe, expect, it } from "vitest";

import {
  getSiteManagementApiBaseUrl,
  parseMyContactDetailResponse,
  parseMyContactsResponse,
  withSiteManagementApiPrefix,
} from "./contactApi";

const contactIdentifier = "11111111-1111-4111-8111-111111111111";
const identityIdentifier = "22222222-2222-4222-8222-222222222222";
const replyIdentifier = "33333333-3333-4333-8333-333333333333";

const contact = {
  category: 1,
  contactIdentifier,
  createdAt: "2026-08-29T06:42:40+00:00",
  identityIdentifier,
  name: "Kpool User",
  replyIdentifiers: [replyIdentifier],
  content: "問い合わせ本文",
};

describe("contact API helpers", () => {
  it("preserves conversation types and nullable delivery dates without exposing authors", () => {
    const replies = ["operator", "submitter"].map((replyType) => ({
      replyIdentifier, content: "返信", replyType, createdAt: contact.createdAt,
      sentAt: replyType === "submitter" ? null : contact.createdAt,
    }));
    const parsed = parseMyContactDetailResponse({ ...contact, replies: replies.map((reply) => ({ ...reply, name: "private", principalIdentifier: identityIdentifier })) });
    expect(parsed.replies).toEqual(replies);
    expect(() => parseMyContactDetailResponse({ ...contact, replies: [{ ...replies[0], replyType: "unknown" }] })).toThrow();
  });
  it("adds the site management API prefix when the base URL omits it", () => {
    expect(withSiteManagementApiPrefix("http://127.0.0.1:8080")).toBe(
      "http://127.0.0.1:8080/api/v1/site-management",
    );
    expect(withSiteManagementApiPrefix("http://127.0.0.1:8080/api/site-management")).toBe(
      "http://127.0.0.1:8080/api/v1/site-management",
    );
  });

  it("uses the contact API URL and falls back to the existing backend URL", () => {
    expect(getSiteManagementApiBaseUrl({
      KPOOL_SITE_MANAGEMENT_PUBLIC_API_BASE_URL: "http://contact-api.test",
      KPOOL_WIKI_PRIVATE_API_BASE_URL: "http://wiki-api.test",
    })).toBe("http://contact-api.test/api/v1/site-management");
    expect(getSiteManagementApiBaseUrl({ KPOOL_WIKI_PRIVATE_API_BASE_URL: "http://wiki-api.test" })).toBe(
      "http://wiki-api.test/api/v1/site-management",
    );
  });

  it("parses the contact list and detail responses", () => {
    expect(parseMyContactsResponse([contact])).toEqual([contact]);
    expect(parseMyContactDetailResponse({
      ...contact,
      content: "Contact body",
      replies: [{
        content: "Reply body",
        replyIdentifier,
        sentAt: "2026-08-29T07:42:40+00:00",
      }],
    })).toMatchObject({
      contactIdentifier,
      replies: [{ replyIdentifier }],
    });
  });

  it("rejects malformed contact responses", () => {
    expect(() => parseMyContactsResponse([{ ...contact, category: "request" }])).toThrow();
  });
  it("keeps the public identity-owned array contract and requires content", () => {
    expect(parseMyContactsResponse([contact])).toEqual([contact]);
    expect(() => parseMyContactsResponse({ contacts: [contact] })).toThrow();
    expect(() => parseMyContactsResponse([{ ...contact, content: undefined }])).toThrow();
    expect(() => parseMyContactsResponse([{ ...contact, identityIdentifier: "not-a-uuid" }])).toThrow();
  });
  it("exposes only the public reply fields, never operator identity", () => {
    const reply = { replyIdentifier, content: "確認いたしました。", sentAt: contact.createdAt };
    const parsed = parseMyContactDetailResponse({ ...contact, principalIdentifier: identityIdentifier, replies: [{ ...reply, name: "private operator", principalIdentifier: identityIdentifier }] });
    expect(parsed.replies).toEqual([reply]);
    expect(parsed.identityIdentifier).toBe(identityIdentifier);
    expect(parsed).not.toHaveProperty("principalIdentifier");
    expect(() => parseMyContactDetailResponse({ ...contact, replies: [{ ...reply, sentAt: undefined }] })).toThrow();
  });
});
