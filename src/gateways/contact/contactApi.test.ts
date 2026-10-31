import { describe, expect, it } from "vitest";

import {
  getSiteManagementApiBaseUrl,
  hasLatestSupportReply,
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
  replies: [],
  content: "問い合わせ本文",
};

describe("contact API helpers", () => {
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

  it("preserves saved replies and author metadata when notification delivery is pending", () => {
    const reply = { replyIdentifier, replyNumber: 1, principalIdentifier: identityIdentifier, name: "Member", content: "Follow-up", sentAt: null, createdAt: contact.createdAt };
    expect(parseMyContactDetailResponse({ ...contact, principalIdentifier: identityIdentifier, replies: [reply] }))
      .toMatchObject({ principalIdentifier: identityIdentifier, replies: [reply] });
  });

  it("uses the latest reply author for support reply status, independently of delivery", () => {
    const ownPrincipal = identityIdentifier;
    const supportPrincipal = "44444444-4444-4444-8444-444444444444";
    const reply = (replyNumber: number, principalIdentifier: string | null) => ({ replyIdentifier, replyNumber, principalIdentifier, content: "Reply", sentAt: null, createdAt: contact.createdAt });
    const summary = parseMyContactsResponse([{ ...contact, principalIdentifier: ownPrincipal }])[0];
    expect(hasLatestSupportReply({ ...summary, replies: [] })).toBe(false);
    expect(hasLatestSupportReply({ ...summary, replies: [reply(2, supportPrincipal), reply(1, ownPrincipal)] })).toBe(true);
    expect(hasLatestSupportReply({ ...summary, replies: [reply(1, supportPrincipal), reply(2, ownPrincipal)] })).toBe(false);
    expect(hasLatestSupportReply({ ...summary, replies: [reply(1, supportPrincipal), reply(2, null)] })).toBe(false);
  });

  it("rejects malformed contact responses", () => {
    expect(() => parseMyContactsResponse([{ ...contact, category: "request" }])).toThrow();
  });
});
