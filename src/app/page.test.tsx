import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import Home from "./page";

const cookieState = vi.hoisted(() => ({
  savedLocale: "ja",
}));

const redirectMock = vi.hoisted(() => vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) =>
      name === "kpool-locale" ? { value: cookieState.savedLocale } : undefined,
    ),
    toString: vi.fn(() => `kpool-locale=${cookieState.savedLocale}`),
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/gateways/identity/authIdentity", () => ({
  fetchAuthenticatedIdentity: vi.fn(),
}));

describe("Home", () => {
  beforeEach(() => {
    cookieState.savedLocale = "ja";
    redirectMock.mockClear();
    vi.mocked(fetchAuthenticatedIdentity).mockResolvedValue({
      email: "member@example.com",
      identityIdentifier: "identity-1",
      language: "ko",
      username: "member",
    });
  });

  it("redirects / to the saved locale top page before identity locale", async () => {
    await expect(Home()).rejects.toThrow("redirect:/ja");
    expect(redirectMock).toHaveBeenCalledWith("/ja");
  });

  it("falls back to the identity locale when the locale cookie is unavailable", async () => {
    cookieState.savedLocale = "";

    await expect(Home()).rejects.toThrow("redirect:/ko");
    expect(redirectMock).toHaveBeenCalledWith("/ko");
  });

  it("falls back to English when no locale can be resolved", async () => {
    cookieState.savedLocale = "";
    vi.mocked(fetchAuthenticatedIdentity).mockResolvedValue(null);

    await expect(Home()).rejects.toThrow("redirect:/en");
    expect(redirectMock).toHaveBeenCalledWith("/en");
  });
});
