import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { PATCH } from "./route";

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
