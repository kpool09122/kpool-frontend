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
};

describe("contact API helpers", () => {
  it("adds the site management API prefix when the base URL omits it", () => {
    expect(withSiteManagementApiPrefix("http://127.0.0.1:8080")).toBe(
      "http://127.0.0.1:8080/api/site-management",
    );
    expect(withSiteManagementApiPrefix("http://127.0.0.1:8080/api/site-management")).toBe(
      "http://127.0.0.1:8080/api/site-management",
    );
  });

  it("uses the contact API URL and falls back to the existing backend URL", () => {
    expect(getSiteManagementApiBaseUrl({
      KPOOL_SITE_MANAGEMENT_PUBLIC_API_BASE_URL: "http://contact-api.test",
      KPOOL_WIKI_PRIVATE_API_BASE_URL: "http://wiki-api.test",
    })).toBe("http://contact-api.test/api/site-management");
    expect(getSiteManagementApiBaseUrl({ KPOOL_WIKI_PRIVATE_API_BASE_URL: "http://wiki-api.test" })).toBe(
      "http://wiki-api.test/api/site-management",
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
});
