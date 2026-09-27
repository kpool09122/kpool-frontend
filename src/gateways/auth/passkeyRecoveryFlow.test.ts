import { describe, expect, it, vi } from "vitest";

import { passkeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";
import { webAuthnBrowserAdapter } from "./webAuthnBrowserAdapter";
import { recoverPasskey } from "./passkeyRecoveryFlow";

const recoveryKey = "11111111-1111-4111-8111-111111111111";
const challengeKey = "22222222-2222-4222-8222-222222222222";
const options = {
  challengeKey,
  options: {
    rp: { name: "k-pool", id: "example.test" },
    user: { name: "member@example.com", id: "AQID", displayName: "Member" },
    challenge: "AQID",
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    timeout: 60000,
    excludeCredentials: [],
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    attestation: "none",
  },
};
const credential = {
  id: "credential-id",
  rawId: "AQID",
  type: "public-key" as const,
  response: { clientDataJSON: "AQID", attestationObject: "AQID", transports: ["internal"] },
  authenticatorAttachment: null,
  clientExtensionResults: {},
};

describe("passkey recovery flow", () => {
  it("creates scoped options, invokes WebAuthn, and replaces passkeys", async () => {
    const createRecoveryOptions = vi.fn().mockResolvedValue({ ok: true, data: options });
    const recover = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const create = vi.fn().mockResolvedValue({ ok: true, credential });

    await expect(recoverPasskey({
      api: { ...passkeyBrowserApi, createRecoveryOptions, recover },
      displayName: "Replacement key",
      language: "ja",
      recoveryKey,
      webAuthn: { ...webAuthnBrowserAdapter, isSupported: () => true, create },
    })).resolves.toEqual({ ok: true });

    expect(createRecoveryOptions).toHaveBeenCalledWith({ recoveryKey }, "ja");
    expect(create).toHaveBeenCalledWith(options);
    expect(recover).toHaveBeenCalledWith({ recoveryKey, challengeKey, displayName: "Replacement key", credential }, "ja");
  });

  it("keeps cancellation, unsupported browsers, and API failures retryable", async () => {
    await expect(recoverPasskey({ displayName: "Key", recoveryKey, webAuthn: { ...webAuthnBrowserAdapter, isSupported: () => false } }))
      .resolves.toEqual({ ok: false, reason: "unsupported" });

    await expect(recoverPasskey({
      api: { ...passkeyBrowserApi, createRecoveryOptions: vi.fn().mockResolvedValue({ ok: true, data: options }) },
      displayName: "Key",
      recoveryKey,
      webAuthn: { ...webAuthnBrowserAdapter, isSupported: () => true, create: vi.fn().mockResolvedValue({ ok: false, reason: "cancelled" }) },
    })).resolves.toEqual({ ok: false, reason: "cancelled" });

    await expect(recoverPasskey({
      api: { ...passkeyBrowserApi, createRecoveryOptions: vi.fn().mockResolvedValue({ ok: false, status: 422, message: "Expired" }) },
      displayName: "Key",
      recoveryKey,
      webAuthn: { ...webAuthnBrowserAdapter, isSupported: () => true },
    })).resolves.toEqual({ ok: false, reason: "api", message: "Expired" });
  });
});
