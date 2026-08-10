import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { POST } from "./route";

const invitationBody = {
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  inviterPrincipalIdentifier: "33333333-3333-4333-8333-333333333333",
  emails: ["new-member@example.com"],
};

const invitationResponse = [
  {
    invitationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    accountIdentifier: "22222222-2222-4222-8222-222222222222",
    invitedByPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
    email: "new-member@example.com",
    token: "token",
    status: "pending",
    expiresAt: "2026-07-27T00:00:00Z",
    createdAt: "2026-07-26T00:00:00Z",
  },
];

const createRequest = (
  body: unknown = invitationBody,
  headers: Record<string, string> = {},
): NextRequest =>
  new Request("https://app.example.test/api/account/invitations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;

describe("/api/account/invitations route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards the invite request body and request headers to upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(invitationResponse), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest(invitationBody, {
      "accept-language": "ja",
      cookie: "laravel_session=abc",
    }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://account.example.test/api/account/invitations",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "ja",
          "Content-Type": "application/json",
          Cookie: "laravel_session=abc",
        },
        body: JSON.stringify(invitationBody),
        cache: "no-store",
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(invitationResponse);
  });

  it("rejects invalid request bodies without calling upstream", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({
      ...invitationBody,
      inviterPrincipalIdentifier: "not-a-uuid",
    }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.message).toBe("Invalid account invitation request.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose upstream 500 details to the client", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ message: "database failed at internal.account.example.test" }),
          { status: 500 },
        ),
      ),
    );

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Account API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.account.example.test");
  });

  it("does not expose internal fetch errors to the client", async () => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://internal.account.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new Error("getaddrinfo ENOTFOUND internal.account.example.test"),
      ),
    );

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toBe("Account API is temporarily unavailable.");
    expect(body.message).not.toContain("internal.account.example.test");
  });
});
