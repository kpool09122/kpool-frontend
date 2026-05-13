import { describe, expect, it } from "vitest";

import { getForwardedWikiApiHeaders } from "./wikiRouteSupport";

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
