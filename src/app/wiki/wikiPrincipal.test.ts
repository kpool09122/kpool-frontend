import { describe, expect, it, vi } from "vitest";

import {
  createWikiPrincipal,
  getAccountIdentifierFromIdentity,
  getCurrentWikiPrincipal,
} from "./wikiPrincipal";

const principal = {
  principalIdentifier: "33333333-3333-3333-3333-333333333333",
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  isDelegatedPrincipal: false,
  isEnabled: true,
};

describe("wiki principal helpers", () => {
  it("normalizes the current principal response when it exists", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(principal),
    });

    await expect(getCurrentWikiPrincipal({ fetchAdapter })).resolves.toEqual({
      status: "available",
      principal,
    });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/wiki/principal/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("normalizes 404 as a missing principal", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ message: "Not found" }),
    });

    await expect(getCurrentWikiPrincipal({ fetchAdapter })).resolves.toEqual({
      status: "missing",
    });
  });

  it("does not treat server errors as a missing principal", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ message: "Backend failed" }),
    });

    await expect(getCurrentWikiPrincipal({ fetchAdapter })).resolves.toEqual({
      status: "error",
      message: "Backend failed",
    });
  });

  it("normalizes network failures as errors", async () => {
    const fetchAdapter = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(getCurrentWikiPrincipal({ fetchAdapter })).resolves.toEqual({
      status: "error",
      message: "network down",
    });
  });

  it("creates a principal with identity and account identifiers", async () => {
    const fetchAdapter = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue(principal),
    });

    await expect(
      createWikiPrincipal({
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
        fetchAdapter,
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
      }),
    ).resolves.toEqual({
      status: "available",
      principal,
    });
    expect(fetchAdapter).toHaveBeenCalledWith("/api/wiki/principal/create", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: expect.any(String),
    });
    expect(JSON.parse(fetchAdapter.mock.calls[0]?.[1]?.body as string)).toEqual({
      accountIdentifier: "22222222-2222-2222-2222-222222222222",
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("reads accountId from identity payloads", () => {
    expect(
      getAccountIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        username: "member",
        email: "member@example.com",
        language: "ja",
        accountId: "22222222-2222-2222-2222-222222222222",
      }),
    ).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("falls back to accountIdentifier for older identity payloads", () => {
    expect(
      getAccountIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        username: "member",
        email: "member@example.com",
        language: "ja",
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
      }),
    ).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("returns null when identity payloads do not include an account id", () => {
    expect(
      getAccountIdentifierFromIdentity({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        username: "member",
        email: "member@example.com",
        language: "ja",
      }),
    ).toBeNull();
  });
});
