import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { wikiDraftUnavailableMessage } from "../../wikiRouteSupport";

import {
  wikiDraftReviewCsrfHeaderName,
  wikiDraftReviewCsrfHeaderValue,
} from "@/gateways/wiki/draftWiki";
import { POST as approvePOST } from "./approve/route";
import { POST as publishPOST } from "./publish/route";
import { POST as sameVersionPOST } from "./publish-same-version/route";
import { POST as rejectPOST } from "./reject/route";
import { POST as translatePOST } from "./translate/route";

const wikiId = "44444444-4444-4444-4444-444444444444";
const internalBackendMessage = "Internal backend path /var/app";

const createRequest = (body: unknown, headers: Record<string, string> = {}): NextRequest =>
  new Request(`https://app.example.test/api/wiki/drafts/${wikiId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [wikiDraftReviewCsrfHeaderName]: wikiDraftReviewCsrfHeaderValue,
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;

const createContext = () => ({
  params: Promise.resolve({ wikiId }),
});

const jsonResponse = (body: unknown, status = 201): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wiki draft review route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("forwards approve requests with body, cookie, and accept-language headers", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "approved",
        wikiIdentifier: "88888888-8888-4888-8888-888888888888",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = { resourceType: "group" };
    const response = await approvePOST(
      createRequest(body, {
        "accept-language": "ja",
        cookie: "session=abc",
      }),
      createContext(),
    );

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/v1/wiki/wiki/${wikiId}/approve`,
      expect.objectContaining({
        body: JSON.stringify(body),
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "session=abc",
        },
      }),
    );
  });

  it("forwards reject requests to the reject backend action", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "rejected",
        wikiIdentifier: "99999999-9999-4999-8999-999999999999",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = { resourceType: "group", rejectionReason: "内容が不足しています。" };
    const response = await rejectPOST(createRequest(body), createContext());

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/v1/wiki/wiki/${wikiId}/reject`,
      expect.objectContaining({
        body: JSON.stringify(body),
        method: "POST",
      }),
    );
  });

  it.each([["publish", publishPOST], ["publish-same-version", sameVersionPOST]] as const)("forwards %s requests to the matching backend action", async (action, handler) => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        wikiIdentifier: "published-wiki-1",
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        version: 2,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = { resourceType: "group", agencyIdentifier: "11111111-1111-4111-8111-111111111111", title: "title", metaDescription: "description", keywords: "keyword" };
    const response = await handler(createRequest(body, { cookie: "session=abc", "accept-language": "ko", "x-xsrf-token": "csrf" }), createContext());

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/v1/wiki/wiki/${wikiId}/${action}`,
      expect.objectContaining({
        body: JSON.stringify(body),
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({ Cookie: "session=abc", "Accept-Language": "ko", "X-XSRF-TOKEN": "csrf" }),
      }),
    );
  });

  it("forwards translate requests to the translate backend action", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        draftWikis: [
          {
            language: "en",
            name: "Aurora Echo",
            resourceType: "group",
            status: "pending",
            wikiIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = {
      agencyIdentifier: "11111111-1111-4111-8111-111111111111",
      language: "ja",
      resourceType: "group",
    };
    const response = await translatePOST(
      createRequest(body, {
        "accept-language": "ja",
        cookie: "session=abc",
      }),
      createContext(),
    );

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.example.test/api/v1/wiki/wiki/${wikiId}/translate`,
      expect.objectContaining({
        body: JSON.stringify(body),
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "session=abc",
        },
      }),
    );
  });


  it.each([["publish", publishPOST], ["publish-same-version", sameVersionPOST]] as const)("%s rejects missing CSRF header before backend access", async (_action, handler) => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const request = createRequest({ resourceType: "group" });
    request.headers.delete(wikiDraftReviewCsrfHeaderName);
    expect((await handler(request, createContext())).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([publishPOST, sameVersionPOST])("preserves public error status and message without internal fields", async (handler) => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "公開条件を満たしていません", trace: "private trace", exception: "InternalException" }, 409)));
    const response = await handler(createRequest({ resourceType: "group" }), createContext());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "公開条件を満たしていません" });
  });

  it.each([publishPOST, sameVersionPOST])("masks backend 5xx messages and trace", async (handler) => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: internalBackendMessage, trace: "private trace" }, 500)));
    const response = await handler(createRequest({ resourceType: "group" }), createContext());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: wikiDraftUnavailableMessage });
  });

  it("returns 500 when the backend base URL is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await approvePOST(
      createRequest({ resourceType: "group", wikiId }),
      createContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Wiki draft API is not configured.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects POST requests that do not include the review request header", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await approvePOST(
      new Request(`https://app.example.test/api/wiki/drafts/${wikiId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resourceType: "group" }),
      }) as NextRequest,
      createContext(),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("masks backend messages from server-side review errors", async () => {
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
      createRequest({ resourceType: "group", wikiId }),
      createContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.message).toBe(wikiDraftUnavailableMessage);

    expect(consoleError).toHaveBeenCalledWith(
      "Failed to approve wiki draft.",
      { wikiId, status: 503 },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(internalBackendMessage);
  });
});
