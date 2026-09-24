import { afterEach, describe, expect, it, vi } from "vitest";

import {
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
  createPasskey,
  getPasskey,
  serializeAuthenticationCredential,
  serializeRegistrationCredential,
  toAuthenticationPublicKeyOptions,
  toRegistrationPublicKeyOptions,
} from "./webAuthnBrowserAdapter";

const buffer = (...bytes: number[]) => new Uint8Array(bytes).buffer;

const registrationOptions = {
  challengeKey: "11111111-1111-4111-8111-111111111111",
  options: {
    rp: { name: "kpool", id: "example.test" },
    user: { name: "member@example.com", id: "BAUG", displayName: "Member" },
    challenge: "AQID",
    pubKeyCredParams: [{ type: "public-key", alg: -7 }], timeout: 60000,
    excludeCredentials: [{ type: "public-key", id: "BwgJ", transports: ["internal", "hybrid", "usb"] }],
    authenticatorSelection: { residentKey: "required", userVerification: "preferred", requireResidentKey: true },
    attestation: "none",
  },
};

const authenticationOptions = {
  challengeKey: "11111111-1111-4111-8111-111111111111",
  options: {
    challenge: "AQID", timeout: 60000, rpId: "example.test",
    allowCredentials: [{ type: "public-key", id: "BwgJ", transports: ["internal", "hybrid", "usb"] }],
    userVerification: "preferred",
  },
};

type FakeAttestation = {
  clientDataJSON: ArrayBuffer;
  attestationObject: ArrayBuffer;
  getTransports: () => string[];
};

const FakeAttestationResponse = function FakeAttestationResponse(
  this: FakeAttestation,
) {
  this.clientDataJSON = buffer(1, 2, 3);
  this.attestationObject = buffer(4, 5, 6);
  this.getTransports = () => ["internal", "hybrid"];
} as unknown as { new (): FakeAttestation };

type FakeAssertion = {
  clientDataJSON: ArrayBuffer;
  authenticatorData: ArrayBuffer;
  signature: ArrayBuffer;
  userHandle: null;
};

const FakeAssertionResponse = function FakeAssertionResponse(
  this: FakeAssertion,
) {
  this.clientDataJSON = buffer(1, 2, 3);
  this.authenticatorData = buffer(4, 5, 6);
  this.signature = buffer(7, 8, 9);
  this.userHandle = null;
} as unknown as { new (): FakeAssertion };

type FakeCredential = {
  id: string;
  rawId: ArrayBuffer;
  type: string;
  authenticatorAttachment: null;
  response: object;
  getClientExtensionResults: () => Record<string, never>;
};

const FakePublicKeyCredential = function FakePublicKeyCredential(
  this: FakeCredential,
  response: object,
) {
  this.id = "credential-id";
  this.rawId = buffer(10, 11, 12);
  this.type = "public-key";
  this.authenticatorAttachment = null;
  this.response = response;
  this.getClientExtensionResults = () => ({});
} as unknown as { new (response: object): FakeCredential };

describe("WebAuthn browser adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("round-trips base64url without padding", () => {
    expect(arrayBufferToBase64Url(base64UrlToArrayBuffer("-_8AAQ"))).toBe("-_8AAQ");
  });

  it("converts options while preserving all transports and not forcing attachment", () => {
    const registration = toRegistrationPublicKeyOptions(registrationOptions);
    const authentication = toAuthenticationPublicKeyOptions(authenticationOptions);

    expect(Array.from(new Uint8Array(registration.challenge as ArrayBuffer))).toEqual([1, 2, 3]);
    expect(registration.excludeCredentials?.[0]?.transports).toEqual(["internal", "hybrid", "usb"]);
    expect(registration.authenticatorSelection).not.toHaveProperty("authenticatorAttachment");
    expect(authentication.allowCredentials?.[0]?.transports).toEqual(["internal", "hybrid", "usb"]);
  });

  it("serializes attestation and assertion credentials", () => {
    vi.stubGlobal("PublicKeyCredential", FakePublicKeyCredential);
    vi.stubGlobal("AuthenticatorAttestationResponse", FakeAttestationResponse);
    vi.stubGlobal("AuthenticatorAssertionResponse", FakeAssertionResponse);

    expect(serializeRegistrationCredential(new FakePublicKeyCredential(new FakeAttestationResponse()) as unknown as PublicKeyCredential)).toEqual(expect.objectContaining({
      id: "credential-id", rawId: "CgsM", response: expect.objectContaining({ clientDataJSON: "AQID", attestationObject: "BAUG", transports: ["internal", "hybrid"] }),
    }));
    expect(serializeAuthenticationCredential(new FakePublicKeyCredential(new FakeAssertionResponse()) as unknown as PublicKeyCredential)).toEqual(expect.objectContaining({
      id: "credential-id", response: expect.objectContaining({ authenticatorData: "BAUG", signature: "BwgJ", userHandle: null }),
    }));
  });

  it("distinguishes cancellation, null credentials, and errors", async () => {
    vi.stubGlobal("PublicKeyCredential", FakePublicKeyCredential);
    vi.stubGlobal("AuthenticatorAttestationResponse", FakeAttestationResponse);
    vi.stubGlobal("AuthenticatorAssertionResponse", FakeAssertionResponse);

    await expect(createPasskey(registrationOptions, { create: vi.fn().mockRejectedValue(new DOMException("cancelled", "NotAllowedError")), get: vi.fn() })).resolves.toEqual({ ok: false, reason: "cancelled" });
    await expect(createPasskey(registrationOptions, { create: vi.fn().mockResolvedValue(null), get: vi.fn() })).resolves.toEqual({ ok: false, reason: "invalid-response" });
    await expect(getPasskey(authenticationOptions, { get: vi.fn().mockRejectedValue(new Error("boom")), create: vi.fn() })).resolves.toEqual({ ok: false, reason: "error" });
  });
});
