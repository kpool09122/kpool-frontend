import { afterEach, describe, expect, it, vi } from "vitest";

import { passkeyBrowserApi } from "./passkeyBrowserApi";

const challengeKey = "44444444-4444-4444-8444-444444444444";
const options = {
  challengeKey,
  options: { challenge: "AQID", timeout: 60000, rpId: "example.test", allowCredentials: [], userVerification: "required" },
};
const credential = {
  id: "credential-id", rawId: "AQID", type: "public-key" as const,
  response: { clientDataJSON: "AQID", authenticatorData: "AQID", signature: "AQID", userHandle: null },
  authenticatorAttachment: null, clientExtensionResults: {},
};

describe("passkeyBrowserApi step-up", () => {
  afterEach(() => vi.restoreAllMocks());

  it("requests and completes passkey step-up with credentials included", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(options)))
      .mockResolvedValueOnce(new Response(JSON.stringify({})));
    vi.stubGlobal("fetch", fetchMock);

    expect(await passkeyBrowserApi.createStepUpPasskeyOptions()).toEqual({ ok: true, data: options });
    expect(await passkeyBrowserApi.completeStepUpWithPasskey({ challengeKey, credential })).toEqual({ ok: true, data: {} });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/identity/auth/step-up/passkey/options", expect.objectContaining({ credentials: "include", cache: "no-store" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/identity/auth/step-up/passkey", expect.objectContaining({ body: JSON.stringify({ challengeKey, credential }), credentials: "include" }));
  });

  it("requests a linked SSO step-up redirect and rejects malformed responses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ redirectUrl: "https://accounts.example.test/reauth" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ redirectUrl: 123 })));
    vi.stubGlobal("fetch", fetchMock);

    expect(await passkeyBrowserApi.createStepUpSocialRedirect("google")).toEqual({
      ok: true,
      data: { redirectUrl: "https://accounts.example.test/reauth" },
    });
    expect(await passkeyBrowserApi.createStepUpSocialRedirect("line")).toEqual({
      ok: false,
      message: "認証処理に失敗しました。時間をおいて再度お試しください。",
      status: 0,
    });
  });
});
