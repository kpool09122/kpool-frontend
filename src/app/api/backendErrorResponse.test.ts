import { describe, expect, it } from "vitest";

import { backendErrorResponse } from "./backendErrorResponse";

describe("backend HTTP errors", () => {
  it.each([401, 403, 404, 409, 419, 422, 429, 500, 503])("preserves status %s and Problem Details", async (status) => {
    const body = { status, detail: "操作を完了できませんでした。", code: "operation_failed", errors: { name: ["名前が必要です。"] } };
    const response = backendErrorResponse({ response: { status, data: body } }, "Fallback");

    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ ...body, message: body.detail });
  });

  it("retains HTTP status even when the backend body has no message", async () => {
    const response = backendErrorResponse({ response: { status: 429, data: null } }, "Fallback");
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ message: "Fallback" });
  });

  it("uses a local fallback for transport failures", async () => {
    const response = backendErrorResponse(new Error("Connection refused"), "Fallback");
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ message: "Fallback" });
  });
});
