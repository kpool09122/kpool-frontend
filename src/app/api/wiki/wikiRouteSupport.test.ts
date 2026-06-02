import { describe, expect, it } from "vitest";

import {
  getForwardedWikiApiHeaders,
  getWikiRouteErrorStatus,
  readJsonResponseBody,
} from "./wikiRouteSupport";

describe("getForwardedWikiApiHeaders", () => {
  it("forwards the shared Wiki API request headers", () => {
    const headers = new Headers({
      "accept-language": "ja,en;q=0.9",
      cookie: "session=wiki-session",
    });

    const forwardedHeaders = getForwardedWikiApiHeaders(headers);

    expect(forwardedHeaders).toEqual({
      Accept: "application/json",
      "Accept-Language": "ja,en;q=0.9",
      Cookie: "session=wiki-session",
    });
  });

  it("does not add optional Wiki API headers when they are absent", () => {
    const forwardedHeaders = getForwardedWikiApiHeaders(new Headers());

    expect(forwardedHeaders).toEqual({
      Accept: "application/json",
    });
  });
});

describe("readJsonResponseBody", () => {
  it("allows an empty response body only for backend error responses", async () => {
    await expect(readJsonResponseBody(new Response("", { status: 503 }))).resolves.toEqual({});
  });

  it("throws when a successful backend response contains malformed JSON", async () => {
    await expect(
      readJsonResponseBody(
        new Response("{broken", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ).rejects.toThrow("Wiki API response body is not valid JSON.");
  });

  it("throws when a backend error response contains malformed JSON", async () => {
    await expect(
      readJsonResponseBody(
        new Response("{broken", {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ).rejects.toThrow("Wiki API response body is not valid JSON.");
  });
});

describe("getWikiRouteErrorStatus", () => {
  it("extracts only the backend status from gateway errors", () => {
    const status = getWikiRouteErrorStatus({
      response: {
        status: 503,
        data: { message: "Internal backend path /var/app" },
      },
    });

    expect(status).toBe(503);
  });

  it("does not expose non-status error details as a fallback", () => {
    const status = getWikiRouteErrorStatus({
      message: "Internal backend path /var/app",
    });

    expect(status).toBeUndefined();
  });
});
