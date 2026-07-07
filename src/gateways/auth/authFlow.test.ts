import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAuthErrorMessage,
  identityProviders,
  loginWithEmail,
  normalizeReturnTo,
  requestSocialRedirect,
} from "./authFlow";

describe("login auth flow helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defines the supported SSO providers in display order", () => {
    expect(identityProviders).toEqual([
      expect.objectContaining({
        id: "google",
        label: "Google",
        iconSrc: "/auth/google.png",
      }),
      expect.objectContaining({
        id: "line",
        label: "LINE",
        iconSrc: "/auth/line.png",
      }),
      expect.objectContaining({
        id: "kakao",
        label: "Kakao",
        iconSrc: "/auth/kakao.png",
      }),
    ]);
  });

  it("keeps same-site return destinations and falls back for external values", () => {
    expect(normalizeReturnTo("/wiki/ja/gr-aurora-echo")).toBe(
      "/wiki/ja/gr-aurora-echo",
    );
    expect(normalizeReturnTo("https://example.com/phishing")).toBe("/mypage");
    expect(normalizeReturnTo("//example.com/phishing")).toBe("/mypage");
    expect(normalizeReturnTo(null)).toBe("/mypage");
  });

  it("extracts a user-facing message from failed auth responses", async () => {
    const response = new Response(
      JSON.stringify({ message: "メールアドレスまたはパスワードが違います。" }),
      { status: 401 },
    );

    await expect(getAuthErrorMessage(response)).resolves.toBe(
      "メールアドレスまたはパスワードが違います。",
    );
  });

  it("sends return_to with email login and normalizes the returned destination", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        identityName: "member",
        email: "member@example.com",
        language: "ja",
        return_to: "/wiki/ja/gr-aurora-echo/edit",
      })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      loginWithEmail({
        email: "member@example.com",
        password: "secret-password",
        return_to: "/wiki/ja/gr-aurora-echo/edit",
      }),
    ).resolves.toEqual({
      identity: {
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        identityName: "member",
        email: "member@example.com",
        language: "ja",
      },
      ok: true,
      returnTo: "/wiki/ja/gr-aurora-echo/edit",
    });
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      email: "member@example.com",
      password: "secret-password",
      return_to: "/wiki/ja/gr-aurora-echo/edit",
    });
  });

  it("sends return_to with social redirect requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        redirectUrl: "https://accounts.example.test/oauth",
      })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestSocialRedirect("google", "/wiki/ja/gr-aurora-echo/edit"),
    ).resolves.toEqual({
      ok: true,
      redirectUrl: "https://accounts.example.test/oauth",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/identity/auth/social/google/redirect?return_to=%2Fwiki%2Fja%2Fgr-aurora-echo%2Fedit",
      {
        credentials: "include",
      },
    );
  });
});
