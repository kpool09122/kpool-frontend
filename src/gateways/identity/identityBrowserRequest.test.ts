import { afterEach, describe, expect, it, vi } from "vitest";

import { requestIdentity } from "./identityBrowserRequest";
import { localeCookieName } from "@/i18n/locales";

const clearToken = () => { document.cookie = "XSRF-TOKEN=; Max-Age=0; Path=/"; };

afterEach(() => { clearToken(); vi.unstubAllGlobals(); document.cookie = `${localeCookieName}=; Path=/; Max-Age=0`; });

describe("identity error display", () => {
  it("preserves backend errors from CSRF initialization without sending the mutation", async () => {
    clearToken();
    const detail = "サービスを一時的に利用できません。";
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ detail, code: "service_unavailable" }, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await requestIdentity("/api/identity/auth/logout", () => undefined)).toEqual({
      ok: false, status: 503, code: "service_unavailable", message: detail,
    });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/identity/auth/csrf-token", expect.any(Object));
  });

  it("displays a backend translation from the operation response", async () => {
    document.cookie = "XSRF-TOKEN=token; Path=/";
    const detail = "서버 오류가 발생했습니다.";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail }, { status: 500 })));

    expect(await requestIdentity("/api/identity/auth/logout", () => undefined)).toMatchObject({
      ok: false, status: 500, message: detail,
    });
  });
});

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
