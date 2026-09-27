import { afterEach, describe, expect, it, vi } from "vitest";

import { socialLinkingBrowserApi } from "./socialLinkingBrowserApi";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("socialLinkingBrowserApi", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("uses the originating session and sends only the dedicated code", async () => {
    const session = { provider: "google", email: "member@example.com", expiresAt: "2026-09-27T12:00:00+09:00" };
    const fetchMock = vi.fn().mockResolvedValueOnce(json(session))
      .mockResolvedValueOnce(json({ accepted: true }))
      .mockResolvedValueOnce(json({ redirectUrl: "/admin" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await socialLinkingBrowserApi.get("ja")).toEqual({ ok: true, data: session });
    expect(await socialLinkingBrowserApi.sendEmail("ja")).toEqual({ ok: true, data: { accepted: true } });
    expect(await socialLinkingBrowserApi.verifyEmail("012345", "ja")).toEqual({ ok: true, data: { redirectUrl: "/admin" } });
    for (const [, options] of fetchMock.mock.calls) {
      expect(options).toEqual(expect.objectContaining({ credentials: "include", cache: "no-store", headers: expect.objectContaining({ "Accept-Language": "ja" }) }));
    }
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    expect(fetchMock.mock.calls[1][1].body).toBeUndefined();
    expect(fetchMock.mock.calls[2][1].body).toBe(JSON.stringify({ authCode: "012345" }));
  });

  it("keeps HTTP errors distinct from transport errors for restart decisions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ message: "Expired" }, 422)).mockRejectedValueOnce(new Error("network")));
    expect(await socialLinkingBrowserApi.get()).toEqual({ ok: false, status: 422, message: "Expired" });
    expect(await socialLinkingBrowserApi.get()).toEqual(expect.objectContaining({ ok: false, status: 0 }));
  });

  it("rejects invalid expiry dates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ provider: "google", email: "member@example.com", expiresAt: "invalid" })));
    expect(await socialLinkingBrowserApi.get()).toEqual(expect.objectContaining({ ok: false }));
  });
});
