import { describe, expect, it } from "vitest";

import {
  getAccountApiBaseUrl,
  parseCreateAccountResult,
  withAccountApiPrefix,
} from "./accountApi";

describe("account API helpers", () => {
  it("adds the backend account prefix when the base URL omits it", () => {
    expect(withAccountApiPrefix("http://127.0.0.1:8080")).toBe(
      "http://127.0.0.1:8080/api/account",
    );
    expect(withAccountApiPrefix("http://127.0.0.1:8080/api/account")).toBe(
      "http://127.0.0.1:8080/api/account",
    );
  });

  it("uses the server-only env var for the Account API base URL", () => {
    expect(getAccountApiBaseUrl({ KPOOL_ACCOUNT_API_BASE_URL: "http://api.test" })).toBe(
      "http://api.test/api/account",
    );
  });

  it("accepts the backend empty array response for an already handled account", () => {
    expect(parseCreateAccountResult([])).toEqual({});
  });
});
