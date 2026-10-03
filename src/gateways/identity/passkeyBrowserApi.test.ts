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
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/identity/auth/step-up/social/google/redirect?returnTo=passkeys",
      expect.objectContaining({ method: "GET" }),
    );
    expect(await passkeyBrowserApi.createStepUpSocialRedirect("line", "withdrawal")).toEqual({
      ok: false,
      message: "認証処理に失敗しました。時間をおいて再度お試しください。",
      status: 0,
    });
  });

  it("calls every passkey recovery endpoint with credentials and typed payloads", async () => {
    const recoveryKey = "11111111-1111-4111-8111-111111111111";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ recoveryKey })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ redirectUrl: "https://accounts.example.test/reauth" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        challengeKey,
        options: {
          rp: { name: "k-pool", id: "example.test" },
          user: { name: "member@example.com", id: "AQID", displayName: "Member" },
          challenge: "AQID", pubKeyCredParams: [{ type: "public-key", alg: -7 }], timeout: 60000,
          excludeCredentials: [], authenticatorSelection: { residentKey: "required", userVerification: "preferred" }, attestation: "none",
        },
      })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await passkeyBrowserApi.sendRecoveryEmail({ email: "member@example.com" }, "ja")).toEqual({ ok: true, data: {} });
    expect(await passkeyBrowserApi.verifyRecoveryEmail({ email: "member@example.com", authCode: "123456" }, "ja")).toEqual({ ok: true, data: { recoveryKey } });
    expect(await passkeyBrowserApi.createRecoverySocialRedirect("google", "ja")).toEqual({ ok: true, data: { redirectUrl: "https://accounts.example.test/reauth" } });
    expect((await passkeyBrowserApi.createRecoveryOptions({ recoveryKey }, "ja")).ok).toBe(true);
    expect(await passkeyBrowserApi.recover({ recoveryKey, challengeKey, displayName: "Replacement", credential: {
      id: "credential-id", rawId: "AQID", type: "public-key",
      response: { clientDataJSON: "AQID", attestationObject: "AQID", transports: ["internal"] },
      authenticatorAttachment: null, clientExtensionResults: {},
    } }, "ja")).toEqual({ ok: true, data: {} });

    expect(fetchMock).toHaveBeenNthCalledWith(3, `/api/identity/auth/passkeys/recovery/social/google/redirect`, expect.objectContaining({ method: "GET", credentials: "include", cache: "no-store" }));
    expect(fetchMock).toHaveBeenNthCalledWith(5, "/api/identity/auth/passkeys/recovery", expect.objectContaining({ method: "POST", credentials: "include", cache: "no-store" }));
  });
});
