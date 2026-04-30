import { describe, expect, it } from "vitest";

import {
  getAuthErrorMessage,
  identityProviders,
  normalizeReturnTo,
} from "./authFlow";

describe("login auth flow helpers", () => {
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
});
