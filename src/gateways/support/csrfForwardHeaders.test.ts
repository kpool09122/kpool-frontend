import { describe, expect, it } from "vitest";

import { getForwardHeaders } from "@/app/api/account/routeSupport";
import { getSessionForwardHeaders } from "@/app/api/identity/auth/routeSupport";
import { getForwardedWikiApiHeaders } from "@/app/api/wiki/wikiRouteSupport";
import { getCsrfForwardHeaders } from "./csrfForwardHeaders";

describe("CSRF forwarding", () => {
  it("forwards browser tokens through each shared BFF boundary", () => {
    const headers = new Headers({ Cookie: "laravel_session=session; XSRF-TOKEN=encrypted", "X-XSRF-TOKEN": "encrypted", "Sec-Fetch-Site": "same-origin" });
    const request = { headers } as Parameters<typeof getForwardHeaders>[0];
    for (const forwarded of [getForwardHeaders(request, true), getSessionForwardHeaders(request), getForwardedWikiApiHeaders(headers)]) {
      const actual = new Headers(forwarded);
      expect(actual.get("X-XSRF-TOKEN")).toBe("encrypted");
      expect(actual.get("Cookie")).toBe(headers.get("cookie"));
      expect(actual.has("Sec-Fetch-Site")).toBe(false);
    }
  });

  it("does not synthesize a token from the cookie alone", () => {
    expect(getCsrfForwardHeaders(new Headers({ Cookie: "XSRF-TOKEN=encrypted" }))).toEqual({});
  });
});
