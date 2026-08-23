import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import {
  wikiDraftReviewCsrfHeaderName,
  wikiDraftReviewCsrfHeaderValue,
} from "@/gateways/wiki/draftWiki";
import { officialCertificationUnavailableMessage } from "@/gateways/wiki/officialCertification";
import { POST as approvePOST } from "./approve/route";
import { POST as rejectPOST } from "./reject/route";
import { GET as listGET } from "./route";
import { GET as myListGET } from "./my/route";
import { POST as requestPOST } from "./request/route";
import { GET as ownedWikisGET, PUT as ownedWikisPUT } from "./owned-wikis/route";

const certificationIdentifier = "11111111-1111-4111-8111-111111111111";
const wikiId = "22222222-2222-4222-8222-222222222222";
const translationSetIdentifier = "44444444-4444-4444-8444-444444444444";
const internalBackendMessage = "internal stack /var/app";

const createRequest = (url: string, body: unknown, headers: Record<string, string> = {}): NextRequest =>
  new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [wikiDraftReviewCsrfHeaderName]: wikiDraftReviewCsrfHeaderValue,
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;

const createGetRequest = (url: string, headers: Record<string, string> = {}): NextRequest => {
  const request = new Request(url, {
    method: "GET",
    headers,
  }) as NextRequest;

  Object.defineProperty(request, "nextUrl", {
    value: new URL(url),
  });

  return request;
};

const jsonResponse = (body: unknown, status = 201): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const certificationSummary = (status: string) => ({
  certificationIdentifier,
  resourceType: "agency",
  status,
  translationSetIdentifier,
});

const authenticatedIdentity = (accountCategory: string) => ({
  identityIdentifier: "55555555-5555-4555-8555-555555555555",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  profileImage: null,
  accountIdentifier: "33333333-3333-4333-8333-333333333333",
  accountCategory,
});

const stubOfficialCertificationRequestFetch = ({
  accountCategory = "agency",
  backendResponse = jsonResponse(certificationSummary("requested")),
}: {
  accountCategory?: string;
  backendResponse?: Response;
} = {}) => {
  const fetchMock = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    void init;
    const urlString = typeof url === "string" ? url : url.toString();

    if (urlString.includes("/api/identity/auth/me")) {
      return Promise.resolve(jsonResponse(authenticatedIdentity(accountCategory), 200));
    }

    return Promise.resolve(backendResponse);
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
};

describe("official certification routes", () => {

  it("lists pending official certifications through the backend with forwarded headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      officialCertifications: [
        {
          approvedAt: null,
          certificationIdentifier,
          ownerAccount: {
            accountIdentifier: "33333333-3333-4333-8333-333333333333",
            category: "agency",
            email: "owner@example.test",
            name: "Owner Agency",
            status: "active",
            type: "organization",
          },
          rejectedAt: null,
          requestedAt: "2026-08-23T01:02:03+00:00",
          resourceType: "agency",
          status: "pending",
          translationSetIdentifier,
          wikis: [],
        },
      ],
      current_page: 1,
      last_page: 1,
      total: 1,
      per_page: 20,
    }, 200));
    vi.stubGlobal("fetch", fetchMock);

    const response = await listGET(createGetRequest(
      "https://app.example.test/api/wiki/official-certification?status=approved&perPage=20",
      {
        "accept-language": "ja",
        cookie: "session=abc",
      },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.officialCertifications).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/official-certifications?status=pending&page=1&perPage=20",
      expect.objectContaining({
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          Cookie: "session=abc",
        },
      }),
    );
  });

  it("does not expose backend messages from list errors", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: internalBackendMessage }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const response = await listGET(createGetRequest("https://app.example.test/api/wiki/official-certification"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe(officialCertificationUnavailableMessage);
    expect(body.message).not.toContain("/var/app");
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to list official certifications.",
      { status: 503 },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(internalBackendMessage);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
    delete process.env.KPOOL_IDENTITY_API_BASE_URL;
  });

  it("forwards official certification request body, cookie, and accept-language headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    process.env.KPOOL_IDENTITY_API_BASE_URL = "https://identity.example.test";
    const fetchMock = stubOfficialCertificationRequestFetch();
    const body = { resourceType: "talent", translationSetIdentifier, ownerAccountId: "33333333-3333-4333-8333-333333333333", wikiId };

    const response = await requestPOST(
      createRequest("https://app.example.test/api/wiki/official-certification/request", body, {
        "accept-language": "ja",
        cookie: "session=abc",
      }),
    );

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://identity.example.test/api/identity/auth/me",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Cookie: "session=abc",
        },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/api/wiki/official-certification/request",
      expect.objectContaining({
        body: expect.any(String),
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "session=abc",
        },
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({
      resourceType: "agency",
      translationSetIdentifier,
    });
  });

  it("derives talent certification resource type from the authenticated account category", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    process.env.KPOOL_IDENTITY_API_BASE_URL = "https://identity.example.test";
    const fetchMock = stubOfficialCertificationRequestFetch({ accountCategory: "talent" });

    const response = await requestPOST(
      createRequest("https://app.example.test/api/wiki/official-certification/request", {
        resourceType: "agency",
        translationSetIdentifier,
      }, {
        cookie: "session=abc",
      }),
    );

    expect(response.status).toBe(201);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({
      resourceType: "talent",
      translationSetIdentifier,
    });
  });

  it("rejects official certification requests from non requestable account categories", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    process.env.KPOOL_IDENTITY_API_BASE_URL = "https://identity.example.test";
    const fetchMock = stubOfficialCertificationRequestFetch({ accountCategory: "general" });

    const response = await requestPOST(
      createRequest("https://app.example.test/api/wiki/official-certification/request", {
        resourceType: "agency",
        translationSetIdentifier,
      }, {
        cookie: "session=abc",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toBe("Official certification request is not allowed for this account category.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forwards approve and reject actions to the backend certification endpoints", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(certificationSummary("approved")))
      .mockResolvedValueOnce(jsonResponse(certificationSummary("rejected")));
    vi.stubGlobal("fetch", fetchMock);
    const body = { certificationIdentifier };

    expect(
      await approvePOST(createRequest("https://app.example.test/api/wiki/official-certification/approve", body)),
    ).toMatchObject({ status: 201 });
    expect(
      await rejectPOST(createRequest("https://app.example.test/api/wiki/official-certification/reject", body)),
    ).toMatchObject({ status: 201 });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `https://api.example.test/api/wiki/official-certification/${certificationIdentifier}/approve`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `https://api.example.test/api/wiki/official-certification/${certificationIdentifier}/reject`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects requests that do not include the review request header", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await requestPOST(
      new Request("https://app.example.test/api/wiki/official-certification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType: "agency", translationSetIdentifier }),
      }) as NextRequest,
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose backend messages from request errors", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    process.env.KPOOL_IDENTITY_API_BASE_URL = "https://identity.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    stubOfficialCertificationRequestFetch({
      backendResponse: new Response(JSON.stringify({ message: internalBackendMessage }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    });

    const response = await requestPOST(
      createRequest("https://app.example.test/api/wiki/official-certification/request", {
        resourceType: "agency",
        translationSetIdentifier,
      }, {
        cookie: "session=abc",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe(officialCertificationUnavailableMessage);
    expect(body.message).not.toContain("/var/app");
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to request official certification.",
      { status: 503 },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(internalBackendMessage);
  });

  it("lists my official certifications through the applicant route", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      officialCertifications: [],
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 100,
    }, 200));
    vi.stubGlobal("fetch", fetchMock);

    const response = await myListGET(createGetRequest(
      "https://app.example.test/api/wiki/official-certification/my?status=approved&perPage=100",
      { "accept-language": "ja", cookie: "session=abc" },
    ));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/wiki/my/official-certifications?status=approved&perPage=100",
      expect.objectContaining({
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          Cookie: "session=abc",
        },
      }),
    );
  });

  it("lists owned wikis and syncs official certifications with forwarded headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        accountCategory: "agency",
        primaryOwnedWikis: [],
        otherOwnedWikis: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 100,
      }, 200))
      .mockResolvedValueOnce(jsonResponse({ approved: [], rejected: [], unchanged: [] }, 200));
    vi.stubGlobal("fetch", fetchMock);

    const getResponse = await ownedWikisGET(createGetRequest(
      "https://app.example.test/api/wiki/official-certification/owned-wikis?perPage=100",
      { "accept-language": "ja", cookie: "session=abc" },
    ));
    const putResponse = await ownedWikisPUT(createRequest(
      "https://app.example.test/api/wiki/official-certification/owned-wikis",
      { translationSetIdentifiers: [translationSetIdentifier] },
      { "accept-language": "ja", cookie: "session=abc" },
    ));

    expect(getResponse.status).toBe(200);
    expect(putResponse.status).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/api/wiki/my/owned-wikis?perPage=100",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/api/wiki/official-certification/owned-wikis",
      expect.objectContaining({
        body: JSON.stringify({ translationSetIdentifiers: [translationSetIdentifier] }),
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "session=abc",
        },
      }),
    );
  });

  it("does not expose backend messages from review errors", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: internalBackendMessage }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const response = await approvePOST(
      createRequest("https://app.example.test/api/wiki/official-certification/approve", {
        certificationIdentifier,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe(officialCertificationUnavailableMessage);
    expect(body.message).not.toContain("/var/app");
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to approve official certification.",
      { status: 503 },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("/var/app");
  });
});
