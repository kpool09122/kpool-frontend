import { afterEach, describe, expect, it, vi } from "vitest";

import { passkeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";
import { webAuthnBrowserAdapter } from "./webAuthnBrowserAdapter";
import {
  identityProviders,
  loginWithPasskey,
  normalizeReturnTo,
  requestSocialRedirect,
} from "./authFlow";

const authenticationOptions = {
  challengeKey: "11111111-1111-4111-8111-111111111111",
  options: {
    challenge: "AQID",
    timeout: 60000,
    rpId: "example.test",
    allowCredentials: [],
    userVerification: "preferred",
  },
};

const authenticationCredential = {
  id: "credential-id",
  rawId: "AQID",
  type: "public-key" as const,
  response: {
    clientDataJSON: "AQID",
    authenticatorData: "AQID",
    signature: "AQID",
    userHandle: null,
  },
  authenticatorAttachment: null,
  clientExtensionResults: {},
};

describe("login auth flow helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defines the supported SSO providers in display order", () => {
    expect(identityProviders.map((provider) => provider.id)).toEqual(["google", "line", "kakao"]);
  });

  it("keeps same-site return destinations and rejects external values", () => {
    expect(normalizeReturnTo("/wiki/ja/example")).toBe("/wiki/ja/example");
    expect(normalizeReturnTo("https://example.com/phishing")).toBe("/admin");
    expect(normalizeReturnTo("//example.com/phishing")).toBe("/admin");
  });

  it("gets options, invokes WebAuthn, authenticates, and preserves returnTo", async () => {
    const createAuthenticationOptions = vi.fn().mockResolvedValue({ ok: true, data: authenticationOptions });
    const authenticate = vi.fn().mockResolvedValue({
      ok: true,
      data: { identityIdentifier: "id", identityName: "member", email: "member@example.com", language: "ja" },
    });
    const get = vi.fn().mockResolvedValue({ ok: true, credential: authenticationCredential });

    await expect(loginWithPasskey({
      api: { ...passkeyBrowserApi, createAuthenticationOptions, authenticate },
      webAuthn: { ...webAuthnBrowserAdapter, isSupported: () => true, get },
      language: "ja",
      returnTo: "/wiki/ja/example",
    })).resolves.toEqual(expect.objectContaining({ ok: true, returnTo: "/wiki/ja/example" }));
    expect(authenticate).toHaveBeenCalledWith({
      challengeKey: authenticationOptions.challengeKey,
      credential: authenticationCredential,
    }, "ja");
  });

  it("distinguishes unsupported browsers and cancellation", async () => {
    await expect(loginWithPasskey({
      webAuthn: { ...webAuthnBrowserAdapter, isSupported: () => false },
    })).resolves.toEqual({ ok: false, reason: "unsupported" });

    await expect(loginWithPasskey({
      api: {
        ...passkeyBrowserApi,
        createAuthenticationOptions: vi.fn().mockResolvedValue({ ok: true, data: authenticationOptions }),
      },
      webAuthn: {
        ...webAuthnBrowserAdapter,
        isSupported: () => true,
        get: vi.fn().mockResolvedValue({ ok: false, reason: "cancelled" }),
      },
    })).resolves.toEqual({ ok: false, reason: "cancelled" });
  });

  it("sends returnTo, invitation token, and account type with SSO", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ redirectUrl: "https://accounts.example.test/oauth" })));
    vi.stubGlobal("fetch", fetchMock);

    await requestSocialRedirect("google", "/admin", "invite-token", "corporation");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/identity/auth/social/google/redirect?return_to=%2Fadmin&oneTimeToken=invite-token&accountType=corporation",
      { credentials: "include" },
    );
  });
});
