import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST as recoverPasskey } from "./route";
import { POST as sendEmail } from "./email/route";
import { POST as verifyEmail } from "./email/verification/route";
import { POST as createOptions } from "./options/route";
import { GET as createSocialRedirect } from "./social/[provider]/redirect/route";

const recoveryKey = "11111111-1111-4111-8111-111111111111";
const challengeKey = "22222222-2222-4222-8222-222222222222";
const identityIdentifier = "33333333-3333-4333-8333-333333333333";
const credential = {
  id: "credential-id", rawId: "AQID", type: "public-key",
  response: { clientDataJSON: "AQID", attestationObject: "AQID", transports: ["internal"] },
  authenticatorAttachment: null, clientExtensionResults: {},
};
const options = {
  challengeKey,
  options: {
    rp: { name: "k-pool", id: "example.test" },
    user: { name: "member@example.com", id: "AQID", displayName: "Member" },
    challenge: "AQID", pubKeyCredParams: [{ type: "public-key", alg: -7 }], timeout: 60000,
    excludeCredentials: [], authenticatorSelection: { residentKey: "required", userVerification: "preferred" }, attestation: "none",
  },
};
const request = (path: string, method: string, body?: unknown) => new Request(`https://app.example.test${path}`, {
  method,
  headers: { Cookie: "laravel_session=abc", "Accept-Language": "ko", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}) as NextRequest;

const noContent = () => new Response(null, { status: 204, headers: { "Set-Cookie": "laravel_session=renewed; Path=/; HttpOnly" } });
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Set-Cookie": "laravel_session=renewed; Path=/; HttpOnly" } });

describe("passkey recovery BFF routes", () => {
  beforeEach(() => vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test"));
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("forwards email send and verification with generated schemas and generic no-content response", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(noContent()).mockResolvedValueOnce(json({ recoveryKey }));
    vi.stubGlobal("fetch", fetchMock);

    const emailBody = { email: "member@example.com" };
    const sendResponse = await sendEmail(request("/api/identity/auth/passkeys/recovery/email", "POST", emailBody));
    const verifyBody = { ...emailBody, authCode: "123456" };
    const verifyResponse = await verifyEmail(request("/api/identity/auth/passkeys/recovery/email/verification", "POST", verifyBody));

    expect(sendResponse.status).toBe(204);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://identity.example.test/api/identity/auth/passkeys/recovery/email", expect.objectContaining({ body: JSON.stringify(emailBody), cache: "no-store" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://identity.example.test/api/identity/auth/passkeys/recovery/email/verification", expect.objectContaining({ body: JSON.stringify(verifyBody), cache: "no-store" }));
    expect(await verifyResponse.json()).toEqual({ recoveryKey });
  });

  it("forwards only validated provider and identity identifier without exposing arbitrary query data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ redirectUrl: "https://accounts.example.test/reauth" }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await createSocialRedirect(
      request(`/api/identity/auth/passkeys/recovery/social/google/redirect?identityIdentifier=${identityIdentifier}&ignored=secret`, "GET"),
      { params: Promise.resolve({ provider: "google" }) },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `https://identity.example.test/api/identity/auth/passkeys/recovery/social/google/redirect?identityIdentifier=${identityIdentifier}`,
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
    expect(await response.json()).toEqual({ redirectUrl: "https://accounts.example.test/reauth" });

    fetchMock.mockClear();
    const invalid = await createSocialRedirect(
      request("/api/identity/auth/passkeys/recovery/social/evil/redirect?identityIdentifier=invalid", "GET"),
      { params: Promise.resolve({ provider: "evil" }) },
    );
    expect(invalid.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates recovery options and completes replacement while forwarding cookies and language", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(options)).mockResolvedValueOnce(noContent());
    vi.stubGlobal("fetch", fetchMock);

    const optionsResponse = await createOptions(request("/api/identity/auth/passkeys/recovery/options", "POST", { recoveryKey }));
    const body = { recoveryKey, challengeKey, displayName: "Replacement", credential };
    const recoveryResponse = await recoverPasskey(request("/api/identity/auth/passkeys/recovery", "POST", body));

    expect(await optionsResponse.json()).toEqual(options);
    expect(recoveryResponse.status).toBe(204);
    expect(recoveryResponse.headers.get("set-cookie")).toContain("laravel_session=renewed");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://identity.example.test/api/identity/auth/passkeys/recovery", expect.objectContaining({
      body: JSON.stringify(body),
      headers: expect.objectContaining({ "Accept-Language": "ko", Cookie: "laravel_session=abc" }),
      cache: "no-store",
    }));
  });

  it("rejects invalid recovery requests before calling the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await verifyEmail(request("/api/identity/auth/passkeys/recovery/email/verification", "POST", { email: "member@example.com", authCode: "1" }));

    expect(response.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
