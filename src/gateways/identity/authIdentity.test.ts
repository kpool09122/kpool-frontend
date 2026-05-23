import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAuthenticatedIdentity } from "./authIdentity";

describe("fetchAuthenticatedIdentity", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when the Identity API is not configured", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "");

    await expect(
      fetchAuthenticatedIdentity({ cookieHeader: "laravel_session=abc" }),
    ).resolves.toBeNull();
  });

  it("fetches the authenticated identity through /auth/me", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "http://api.test");
    const fetchAdapter = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          identityIdentifier: "11111111-1111-1111-1111-111111111111",
          username: "member",
          email: "member@example.com",
          language: "ja",
        }),
        { status: 200 },
      ),
    );

    await expect(
      fetchAuthenticatedIdentity({
        cookieHeader: "laravel_session=abc",
        fetchAdapter,
      }),
    ).resolves.toMatchObject({
      username: "member",
      email: "member@example.com",
    });
    expect(fetchAdapter).toHaveBeenCalledWith(
      "http://api.test/api/identity/auth/me",
      {
        headers: {
          Accept: "application/json",
          Cookie: "laravel_session=abc",
        },
        cache: "no-store",
      },
    );
  });

  it("returns null when /auth/me rejects the session", async () => {
    vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "http://api.test");
    const fetchAdapter = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 401 }));

    await expect(
      fetchAuthenticatedIdentity({
        cookieHeader: "laravel_session=expired",
        fetchAdapter,
      }),
    ).resolves.toBeNull();
  });
});
