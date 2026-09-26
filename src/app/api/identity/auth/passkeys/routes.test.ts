import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { DELETE, PATCH } from "./[passkeyIdentifier]/route";
import { POST as addPasskey } from "./addition/route";
import { POST as createAdditionOptions } from "./addition/options/route";
import { POST as registerPasskey } from "./registration/route";
import { POST as createRegistrationOptions } from "./registration/options/route";
import { GET as listPasskeys } from "./route";

const passkeyIdentifier = "11111111-1111-4111-8111-111111111111";
const challengeKey = "22222222-2222-4222-8222-222222222222";
const credential = {
  id: "credential-id", rawId: "AQID", type: "public-key",
  response: { clientDataJSON: "AQID", attestationObject: "AQID", transports: ["internal", "hybrid"] },
  authenticatorAttachment: null, clientExtensionResults: {},
};
const optionsResult = {
  challengeKey,
  options: {
    rp: { name: "kpool", id: "example.test" },
    user: { name: "member@example.com", id: "AQID", displayName: "Member" },
    challenge: "AQID", pubKeyCredParams: [{ type: "public-key", alg: -7 }], timeout: 60000,
    excludeCredentials: [], authenticatorSelection: { residentKey: "required", userVerification: "preferred" }, attestation: "none",
  },
};

const request = (path: string, method: string, body?: unknown) => new Request(`https://app.example.test${path}`, {
  method,
  headers: {
    ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    Cookie: "laravel_session=abc",
    "Accept-Language": "en",
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}) as NextRequest;

const upstreamResponse = (body: unknown, withCookie = true, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: withCookie ? { "Set-Cookie": "laravel_session=updated; Path=/; HttpOnly" } : {},
});

describe("passkey BFF routes", () => {
  beforeEach(() => vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test"));
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("lists passkeys with Cookie, language, no-store, response validation, and Set-Cookie", async () => {
    const body = { passkeys: [{
      passkeyIdentifier, displayName: "MacBook", transports: ["internal"], backupEligible: true, backupState: true,
      lastUsedAt: null, createdAt: "2026-09-01T00:00:00Z",
    }] };
    const fetchMock = vi.fn().mockResolvedValue(upstreamResponse(body));
    vi.stubGlobal("fetch", fetchMock);
    const response = await listPasskeys(request("/api/identity/auth/passkeys", "GET"));

    expect(fetchMock).toHaveBeenCalledWith("https://identity.example.test/api/identity/auth/passkeys", {
      method: "GET", headers: { Accept: "application/json", "Accept-Language": "en", Cookie: "laravel_session=abc" }, cache: "no-store",
    });
    expect(response.headers.get("set-cookie")).toContain("laravel_session=updated");
    expect(await response.json()).toEqual(body);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstreamResponse({ passkeys: "invalid" }, false)));
    expect((await listPasskeys(request("/api/identity/auth/passkeys", "GET"))).status).toBe(502);
  });

  it("adds a passkey and rejects an invalid generated request schema", async () => {
    const body = { challengeKey, displayName: "Security key", credential };
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(upstreamResponse([])));
    vi.stubGlobal("fetch", fetchMock);
    const response = await addPasskey(request("/api/identity/auth/passkeys/addition", "POST", body));

    expect(fetchMock).toHaveBeenCalledWith("https://identity.example.test/api/identity/auth/passkeys/addition", expect.objectContaining({
      method: "POST", body: JSON.stringify(body), cache: "no-store",
      headers: { Accept: "application/json", "Accept-Language": "en", "Content-Type": "application/json", Cookie: "laravel_session=abc" },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers.get("set-cookie")).toContain("laravel_session=updated");

    fetchMock.mockClear();
    const invalid = await addPasskey(request("/api/identity/auth/passkeys/addition", "POST", { challengeKey: "invalid" }));
    expect(invalid.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates addition options and validates the upstream response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstreamResponse(optionsResult));
    vi.stubGlobal("fetch", fetchMock);
    const response = await createAdditionOptions(request("/api/identity/auth/passkeys/addition/options", "POST"));
    expect(fetchMock).toHaveBeenCalledWith("https://identity.example.test/api/identity/auth/passkeys/addition/options", expect.objectContaining({ cache: "no-store" }));
    expect(response.headers.get("set-cookie")).toContain("laravel_session=updated");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstreamResponse({ challengeKey }, false)));
    expect((await createAdditionOptions(request("/api/identity/auth/passkeys/addition/options", "POST"))).status).toBe(502);
  });

  it("forwards and validates registration options", async () => {
    const body = { email: "member@example.com", accountType: "individual", oneTimeToken: null, return_to: "/admin" };
    const fetchMock = vi.fn().mockResolvedValue(upstreamResponse(optionsResult));
    vi.stubGlobal("fetch", fetchMock);
    await createRegistrationOptions(request("/api/identity/auth/passkeys/registration/options", "POST", body));
    expect(fetchMock).toHaveBeenCalledWith("https://identity.example.test/api/identity/auth/passkeys/registration/options", expect.objectContaining({
      body: JSON.stringify(body), cache: "no-store",
      headers: expect.objectContaining({ "Accept-Language": "en", Cookie: "laravel_session=abc" }),
    }));

    fetchMock.mockClear();
    const invalid = await createRegistrationOptions(request("/api/identity/auth/passkeys/registration/options", "POST", {}));
    expect(invalid.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registers a passkey and forwards the authenticated Set-Cookie", async () => {
    const body = { challengeKey, identityName: "Member", displayName: "MacBook", base64EncodedImage: null, credential };
    const identity = { identityIdentifier: passkeyIdentifier, identityName: "Member", email: "member@example.com", language: "en" };
    const fetchMock = vi.fn().mockResolvedValue(upstreamResponse(identity, true, 201));
    vi.stubGlobal("fetch", fetchMock);
    const response = await registerPasskey(request("/api/identity/auth/passkeys/registration", "POST", body));
    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toContain("laravel_session=updated");
    expect(fetchMock).toHaveBeenCalledWith("https://identity.example.test/api/identity/auth/passkeys/registration", expect.objectContaining({ body: JSON.stringify(body), cache: "no-store" }));
  });

  it("updates and deletes a validated passkey identifier", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(upstreamResponse([])));
    vi.stubGlobal("fetch", fetchMock);
    const context = { params: Promise.resolve({ passkeyIdentifier }) };
    const updateResponse = await PATCH(request(`/api/identity/auth/passkeys/${passkeyIdentifier}`, "PATCH", { displayName: "Phone" }), context);
    const deleteResponse = await DELETE(request(`/api/identity/auth/passkeys/${passkeyIdentifier}`, "DELETE"), context);

    expect(fetchMock).toHaveBeenNthCalledWith(1, `https://identity.example.test/api/identity/auth/passkeys/${passkeyIdentifier}`, expect.objectContaining({ method: "PATCH", body: JSON.stringify({ displayName: "Phone" }), cache: "no-store" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, `https://identity.example.test/api/identity/auth/passkeys/${passkeyIdentifier}`, expect.objectContaining({ method: "DELETE", cache: "no-store" }));
    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toEqual([]);
    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toEqual([]);

    const invalidResponseFetchMock = vi.fn().mockResolvedValue(upstreamResponse({}));
    vi.stubGlobal("fetch", invalidResponseFetchMock);
    expect((await PATCH(request(`/api/identity/auth/passkeys/${passkeyIdentifier}`, "PATCH", { displayName: "Phone" }), context)).status).toBe(502);
    expect(invalidResponseFetchMock).toHaveBeenCalledOnce();

    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockClear();
    const invalidContext = { params: Promise.resolve({ passkeyIdentifier: "invalid" }) };
    expect((await DELETE(request("/api/identity/auth/passkeys/invalid", "DELETE"), invalidContext)).status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
