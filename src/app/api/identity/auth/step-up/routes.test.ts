import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST as completePasskeyStepUp } from "./passkey/route";
import { POST as createPasskeyStepUpOptions } from "./passkey/options/route";
import { GET as createSocialStepUpRedirect } from "./social/[provider]/redirect/route";

const challengeKey = "44444444-4444-4444-8444-444444444444";
const authenticationOptions = {
  challengeKey,
  options: { challenge: "AQID", timeout: 60000, rpId: "example.test", allowCredentials: [], userVerification: "required" },
};
const credential = {
  id: "credential-id", rawId: "AQID", type: "public-key",
  response: { clientDataJSON: "AQID", authenticatorData: "AQID", signature: "AQID", userHandle: null },
  authenticatorAttachment: null, clientExtensionResults: {},
};
const request = (path: string, method: string, body?: unknown) => new Request(`https://app.example.test${path}`, {
  method,
  headers: { Cookie: "laravel_session=abc", "Accept-Language": "ja", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}) as NextRequest;
const upstream = (body: unknown) => new Response(JSON.stringify(body), {
  headers: { "Set-Cookie": "laravel_session=renewed; Path=/; HttpOnly" },
});

describe("step-up BFF routes", () => {
  beforeEach(() => vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test"));
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("forwards passkey options and completion with cookies, language, schemas, and no-store", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(upstream(authenticationOptions))
      .mockResolvedValueOnce(upstream({}));
    vi.stubGlobal("fetch", fetchMock);

    const optionsResponse = await createPasskeyStepUpOptions(request("/api/identity/auth/step-up/passkey/options", "POST"));
    const completionBody = { challengeKey, credential };
    const completionResponse = await completePasskeyStepUp(request("/api/identity/auth/step-up/passkey", "POST", completionBody));

    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://identity.example.test/api/identity/auth/step-up/passkey/options", {
      method: "POST", headers: { Accept: "application/json", "Accept-Language": "ja", Cookie: "laravel_session=abc" }, cache: "no-store",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://identity.example.test/api/identity/auth/step-up/passkey", expect.objectContaining({
      method: "POST", body: JSON.stringify(completionBody), cache: "no-store",
    }));
    expect(optionsResponse.headers.get("set-cookie")).toContain("laravel_session=renewed");
    expect(completionResponse.status).toBe(200);
  });

  it("forwards only supported SSO providers and rejects invalid providers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstream({ redirectUrl: "https://accounts.example.test/reauth" }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await createSocialStepUpRedirect(
      request("/api/identity/auth/step-up/social/google/redirect", "GET"),
      { params: Promise.resolve({ provider: "google" }) },
    );
    expect(fetchMock).toHaveBeenCalledWith("https://identity.example.test/api/identity/auth/step-up/social/google/redirect", expect.objectContaining({ cache: "no-store" }));
    expect(await response.json()).toEqual({ redirectUrl: "https://accounts.example.test/reauth" });

    fetchMock.mockClear();
    const invalid = await createSocialStepUpRedirect(
      request("/api/identity/auth/step-up/social/evil/redirect", "GET"),
      { params: Promise.resolve({ provider: "evil" }) },
    );
    expect(invalid.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
