import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const body = {
  challengeKey: "11111111-1111-4111-8111-111111111111",
  credential: {
    id: "credential-id", rawId: "AQID", type: "public-key",
    response: { clientDataJSON: "AQID", authenticatorData: "AQID", signature: "AQID", userHandle: null },
    authenticatorAttachment: null, clientExtensionResults: {},
  },
};

const createRequest = (requestBody: unknown = body) => new Request("https://app.example.test/api/identity/auth/passkeys/authentication", {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: "laravel_session=abc", "Accept-Language": "ko" },
  body: JSON.stringify(requestBody),
}) as NextRequest;

describe("passkey authentication route", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("validates and forwards body, Cookie, language, no-store, and Set-Cookie", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      identityIdentifier: "22222222-2222-4222-8222-222222222222", identityName: "member", email: "member@example.com", language: "ko",
    }), { headers: { "Set-Cookie": "laravel_session=updated; Path=/; HttpOnly" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest());

    expect(fetchMock).toHaveBeenCalledWith("https://identity.example.test/api/identity/auth/passkeys/authentication", {
      method: "POST",
      headers: { Accept: "application/json", "Accept-Language": "ko", "Content-Type": "application/json", Cookie: "laravel_session=abc" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    expect(response.headers.get("set-cookie")).toContain("laravel_session=updated");
  });

  it("rejects invalid requests before upstream", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(createRequest({ challengeKey: "invalid" }));
    expect(response.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
