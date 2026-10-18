import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./latest/route";
import { POST } from "./[requestId]/withdraw/route";

const summary = {
  requestIdentifier: "request-1",
  accountIdentifier: "account-1",
  currentAccountCategory: "general",
  requestedAccountCategory: "agency",
  status: "withdrawn",
  requestedAt: "2026-10-12T00:00:00Z",
};
const params = Promise.resolve({
  accountId: "account/1",
  requestId: "request/1",
});
const request = () =>
  new NextRequest("https://app.example.test/api/account", {
    headers: {
      Cookie: "session=test",
      "Accept-Language": "ko",
      "X-XSRF-TOKEN": "test",
    },
  });

describe.each(["latest", "withdraw"] as const)(
  "self-service %s BFF",
  (kind) => {
    const call = () =>
      kind === "latest"
        ? GET(request(), { params })
        : POST(request(), { params });
    const body =
      kind === "latest"
        ? { request: { ...summary, status: "pending" } }
        : summary;
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });
    it("forwards credentials/language/CSRF to the scoped URL and preserves cookies", async () => {
      vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
      const headers = new Headers();
      headers.append("Set-Cookie", "session=renewed; HttpOnly");
      headers.append("Set-Cookie", "XSRF-TOKEN=renewed");
      const fetchMock = vi
        .fn()
        .mockResolvedValue(Response.json(body, { headers }));
      vi.stubGlobal("fetch", fetchMock);
      const response = await call();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(body);
      expect(fetchMock).toHaveBeenCalledWith(
        `https://account.example.test/api/v1/account/accounts/account%2F1/category-change-requests/${kind === "latest" ? "latest" : "request%2F1/withdraw"}`,
        expect.objectContaining({
          cache: "no-store",
          method: kind === "latest" ? "GET" : "POST",
          headers: expect.objectContaining({
            Cookie: "session=test",
            "Accept-Language": "ko",
            "X-XSRF-TOKEN": "test",
          }),
        }),
      );
      expect(response.headers.getSetCookie()).toHaveLength(2);
      expect(response.headers.get("cache-control")).toBe("no-store");
    });
    it.each([401, 403, 404, 419, 422, 500])(
      "forwards status %s with backend details and keeps cookie updates",
      async (status) => {
        vi.stubEnv(
          "KPOOL_ACCOUNT_API_BASE_URL",
          "https://account.example.test",
        );
        vi.stubGlobal(
          "fetch",
          vi
            .fn()
            .mockResolvedValue(
              Response.json(
                { detail: "upstream detail" },
                { status, headers: { "Set-Cookie": "session=; Max-Age=0" } },
              ),
            ),
        );
        const response = await call();
        expect(response.status).toBe(status);
        expect(await response.json()).toEqual({
          detail: "upstream detail",
          message: "upstream detail",
        });
        expect(response.headers.getSetCookie()).toHaveLength(1);
      },
    );
    it.each([{}, { request: {} }, "not json"])(
      "rejects malformed success and retains cookies: %j",
      async (body) => {
        vi.stubEnv(
          "KPOOL_ACCOUNT_API_BASE_URL",
          "https://account.example.test",
        );
        vi.stubGlobal(
          "fetch",
          vi
            .fn()
            .mockResolvedValue(
              new Response(
                typeof body === "string" ? body : JSON.stringify(body),
                { headers: { "Set-Cookie": "session=renewed" } },
              ),
            ),
        );
        const response = await call();
        expect(response.status).toBe(502);
        expect(response.headers.getSetCookie()).toHaveLength(1);
      },
    );
    it("handles missing env and network failure", async () => {
      vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "");
      expect((await call()).status).toBe(500);
      vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret")));
      const response = await call();
      expect(response.status).toBe(502);
      expect(JSON.stringify(await response.json())).not.toContain("secret");
    });
    if (kind === "latest")
      it("accepts no request", async () => {
        vi.stubEnv(
          "KPOOL_ACCOUNT_API_BASE_URL",
          "https://account.example.test",
        );
        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue(Response.json({ request: null })),
        );
        expect(await (await call()).json()).toEqual({ request: null });
      });
  },
);
