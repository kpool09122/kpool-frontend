import { describe, expect, it } from "vitest";

import {
  getIdentityApiBaseUrl,
  getIdentityRouteErrorMessage,
  withIdentityApiPrefix,
} from "./identityApi";

describe("identity API helpers", () => {
  it("adds the backend identity prefix when the base URL omits it", () => {
    expect(withIdentityApiPrefix("http://127.0.0.1:8080")).toBe(
      "http://127.0.0.1:8080/api/identity",
    );
    expect(withIdentityApiPrefix("http://127.0.0.1:8080/api/identity")).toBe(
      "http://127.0.0.1:8080/api/identity",
    );
  });

  it("uses the server-only env var for the Identity API base URL", () => {
    expect(getIdentityApiBaseUrl({ KPOOL_IDENTITY_API_BASE_URL: "http://api.test" })).toBe(
      "http://api.test/api/identity",
    );
  });

  it("converts problem details into route error messages", () => {
    expect(
      getIdentityRouteErrorMessage({
        status: 401,
        data: { detail: "Invalid credentials." },
      }),
    ).toBe("Invalid credentials.");
    expect(getIdentityRouteErrorMessage({ status: 500, data: {} })).toBe(
      "Identity API is temporarily unavailable.",
    );
    expect(
      getIdentityRouteErrorMessage({
        status: 500,
        data: { message: "database failed at internal.identity.example.test" },
      }),
    ).toBe("Identity API is temporarily unavailable.");
  });
});
