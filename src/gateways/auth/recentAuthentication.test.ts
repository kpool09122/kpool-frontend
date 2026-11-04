import { describe, expect, it, vi } from "vitest";
import { getRecentAuthenticationMethods, performRecentAuthentication } from "./recentAuthentication";

const setup = () => ({
  api: {
    createStepUpPasskeyOptions: vi.fn().mockResolvedValue({ ok: true, data: { challengeKey: "challenge" } }),
    completeStepUpWithPasskey: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    createStepUpSocialRedirect: vi.fn().mockResolvedValue({ ok: true, data: { redirectUrl: "https://accounts.example.test" } }),
  },
  webAuthnAdapter: {
    isSupported: () => true,
    get: vi.fn().mockResolvedValue({ ok: true, credential: { id: "credential" } }),
    create: vi.fn(),
  },
});

describe("recent authentication method selection", () => {
  it("offers all linked providers alongside an existing passkey, filtering duplicates and unknown providers", () => {
    expect(getRecentAuthenticationMethods(1, ["google", "line", "google", "unknown", "kakao"])).toEqual(["passkey", "google", "line", "kakao"]);
    expect(getRecentAuthenticationMethods(0, ["google"])).toEqual(["google"]);
    expect(getRecentAuthenticationMethods(0, [])).toEqual([]);
  });

  it.each(["google", "line", "kakao"] as const)("uses the selected %s provider without requiring WebAuthn", async (method) => {
    const deps = setup();
    deps.webAuthnAdapter.isSupported = () => false;
    const result = await performRecentAuthentication({ ...deps, method, returnTo: "withdrawal" });
    expect(result).toEqual({ status: "redirect", url: "https://accounts.example.test" });
    expect(deps.api.createStepUpSocialRedirect).toHaveBeenCalledWith(method, "withdrawal");
    expect(deps.api.createStepUpPasskeyOptions).not.toHaveBeenCalled();
    expect(deps.webAuthnAdapter.get).not.toHaveBeenCalled();
  });

  it("uses an explicitly selected passkey and verifies the returned credential", async () => {
    const deps = setup();
    expect(await performRecentAuthentication({ ...deps, method: "passkey", returnTo: "passkeys" })).toEqual({ status: "verified" });
    expect(deps.api.completeStepUpWithPasskey).toHaveBeenCalledWith({ challengeKey: "challenge", credential: { id: "credential" } });
    expect(deps.api.createStepUpSocialRedirect).not.toHaveBeenCalled();
  });
});
