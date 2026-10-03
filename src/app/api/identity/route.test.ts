import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { DELETE, PATCH } from "./route";

const updateRequestBody = {
  identityName: "Updated Member",
  language: "en",
  base64EncodedImage: "data:image/jpeg;base64,SECRET_IMAGE",
};

const upstreamUpdateRequestBody = {
  ...updateRequestBody,
  base64EncodedImage: "SECRET_IMAGE",
};

const identityResponse = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  identityName: "Updated Member",
  email: "member@example.com",
  language: "en",
  profileImage: "https://images.example.test/member.png",
};

const createRequest = (
  body: unknown = updateRequestBody,
  headers: Record<string, string> = {},
): NextRequest =>
  new Request("https://app.example.test/api/identity", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;

const createDeleteRequest = (headers: Record<string, string> = {}): NextRequest =>
  new Request("https://app.example.test/api/identity", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ confirmationIdentityName: "Member" }),
  }) as NextRequest;

const jsonResponse = (
  body: unknown,
  init: ResponseInit = {},
): Response =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

describe("/api/identity route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards the withdrawal confirmation name and preserves Cookie, CSRF, Set-Cookie, and 204", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {
      status: 204,
      headers: { "set-cookie": "laravel_session=deleted; Path=/; HttpOnly" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await DELETE(createDeleteRequest({
      cookie: "laravel_session=abc",
      "x-xsrf-token": "csrf-token",
    }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://identity.example.test/api/identity/identities/me",
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Cookie: "laravel_session=abc",
          "X-XSRF-TOKEN": "csrf-token",
        },
        body: JSON.stringify({ confirmationIdentityName: "Member" }),
        cache: "no-store",
      },
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("set-cookie")).toContain("laravel_session=deleted");
  });

  it.each([
    [401, "authentication_required"],
    [401, "recent_authentication_required"],
    [403, "identity_withdrawal_not_allowed"],
    [419, "csrf_token_mismatch"],
    [422, "identity_name_confirmation_mismatch"],
  ])("preserves withdrawal problem code for status %s (%s)", async (status, code) => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(
      { code, detail: "upstream detail" },
      { status },
    )));

    const response = await DELETE(createDeleteRequest());
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ code });
  });

  it("forwards update body, Cookie and Accept-Language to upstream", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(identityResponse));
    vi.stubGlobal("fetch", fetchMock);

    await PATCH(createRequest(updateRequestBody, {
      "accept-language": "ja",
      cookie: "laravel_session=abc",
    }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://identity.example.test/api/identity/identities/me",
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "laravel_session=abc",
        },
        body: JSON.stringify(upstreamUpdateRequestBody),
        cache: "no-store",
      },
    );
  });

  it("returns parsed identity and forwards upstream set-cookie", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(identityResponse, {
        headers: { "set-cookie": "laravel_session=refreshed; Path=/; HttpOnly" },
      })),
    );

    const response = await PATCH(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ identityName: "Updated Member", language: "en" });
    expect(response.headers.get("set-cookie")).toContain("laravel_session=refreshed");
  });

  it("does not expose upstream 5xx details", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(
        { message: "database failed at internal.identity.example.test" },
        { status: 500 },
      )),
    );

    const response = await PATCH(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Identity API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.identity.example.test");
  });

  it("does not expose internal fetch errors or base64EncodedImage in logs", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://internal.identity.example.test");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new Error("connect ECONNREFUSED internal.identity.example.test SECRET_IMAGE"),
      ),
    );

    const response = await PATCH(createRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe("Identity API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.identity.example.test");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("SECRET_IMAGE");
  });
});
