import { describe, expect, it } from "vitest";
import { csrfTokenMismatchResponse } from "./csrfResponse";

describe("csrfTokenMismatchResponse", () => {
  it("returns a non-cacheable 419 with a stable error code", async () => {
    const response = csrfTokenMismatchResponse();
    expect(response.status).toBe(419);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ message: "Please refresh the page and try again.", code: "csrf_token_mismatch" });
  });
});
