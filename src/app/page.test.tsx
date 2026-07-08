import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import Home from "./page";

const requestState = vi.hoisted(() => ({
  country: null as string | null,
  savedLocale: "ja",
}));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
);

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) =>
      name === "kpool-locale" && requestState.savedLocale
        ? { value: requestState.savedLocale }
        : undefined,
    ),
    toString: vi.fn(() =>
      requestState.savedLocale ? `kpool-locale=${requestState.savedLocale}` : "",
    ),
  })),
  headers: vi.fn(async () => ({
    get: vi.fn((name: string) =>
      name === "x-kpool-country" ? requestState.country : null,
    ),
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
    requestState.country = null;
    requestState.savedLocale = "ja";
    redirectMock.mockClear();
    vi.mocked(fetchAuthenticatedIdentity).mockResolvedValue({
      email: "member@example.com",
      identityIdentifier: "identity-1",
      language: "ko",
      identityName: "member",
    });
  });

  it("redirects / to the saved locale top page before identity locale", async () => {
    await expect(Home()).rejects.toThrow("redirect:/ja");
    expect(redirectMock).toHaveBeenCalledWith("/ja");
  });

  it("falls back to the identity locale before the country header when the locale cookie is unavailable", async () => {
    requestState.savedLocale = "";
    requestState.country = "JP";

    await expect(Home()).rejects.toThrow("redirect:/ko");
    expect(redirectMock).toHaveBeenCalledWith("/ko");
  });

  it("uses the app country header for guest locale redirects", async () => {
    requestState.savedLocale = "";
    requestState.country = "KR";
    vi.mocked(fetchAuthenticatedIdentity).mockResolvedValue(null);

    await expect(Home()).rejects.toThrow("redirect:/ko");
    expect(redirectMock).toHaveBeenCalledWith("/ko");
  });

  it("falls back to English when no locale can be resolved", async () => {
    requestState.savedLocale = "";
    vi.mocked(fetchAuthenticatedIdentity).mockResolvedValue(null);

    await expect(Home()).rejects.toThrow("redirect:/en");
    expect(redirectMock).toHaveBeenCalledWith("/en");
  });
});
