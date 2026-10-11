import { afterEach, describe, expect, it, vi } from "vitest";
import { requestIdentity } from "./identityBrowserRequest";
import { localeCookieName } from "@/i18n/locales";

afterEach(() => { vi.unstubAllGlobals(); document.cookie = `${localeCookieName}=; Path=/; Max-Age=0`; });

describe("identity request messages", () => {
  it("preserves backend messages regardless of the UI language", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Backend translated message", code: "validation" }), { status: 422 })));
    const result = await requestIdentity("/api/identity/auth/passkeys", () => ({}), { language: "ko", method: "GET" });
    expect(result).toMatchObject({ ok: false, message: "Backend translated message", code: "validation" });
  });
  it("translates a frontend connection failure using the current UI locale", async () => {
    document.cookie = `${localeCookieName}=ko; Path=/`;
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await requestIdentity("/api/identity/auth/passkeys", () => ({}), { method: "GET" })).toMatchObject({ ok: false, message: "인증에 실패했습니다. 잠시 후 다시 시도하세요.", status: 0 });
  });
});
