import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders SSO as the primary path and email login as the secondary form", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Googleでログイン" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "LINEでログイン" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kakaoでログイン" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "メールアドレスでログイン" })).toBeInTheDocument();
    expect(screen.getByText("アカウントをお持ちでない方は")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "アカウント登録へ" })).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  it("requests an SSO redirect URL and navigates to it", async () => {
    const socialRedirectAdapter = vi.fn().mockResolvedValue({
      ok: true,
      redirectUrl: "https://accounts.example.test/oauth",
    });
    const navigate = vi.fn();

    render(
      <LoginPage
        socialRedirectAdapter={socialRedirectAdapter}
        navigate={navigate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Googleでログイン" }));

    await waitFor(() =>
      expect(socialRedirectAdapter).toHaveBeenCalledWith("google"),
    );
    expect(navigate).toHaveBeenCalledWith("https://accounts.example.test/oauth");
  });

  it("logs in with email and password and opens mypage", async () => {
    const loginAdapter = vi.fn().mockResolvedValue({ ok: true });
    const navigate = vi.fn();

    render(
      <LoginPage
        loginAdapter={loginAdapter}
        navigate={navigate}
      />,
    );

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "member@example.com" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "secret-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "メールアドレスでログイン" }));

    await waitFor(() =>
      expect(loginAdapter).toHaveBeenCalledWith({
        email: "member@example.com",
        password: "secret-password",
      }),
    );
    expect(navigate).toHaveBeenCalledWith("/mypage");
  });

  it("shows an understandable error when email login fails", async () => {
    const loginAdapter = vi.fn().mockResolvedValue({
      ok: false,
      message: "メールアドレスまたはパスワードが違います。",
    });

    render(<LoginPage loginAdapter={loginAdapter} />);

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "member@example.com" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "メールアドレスでログイン" }));

    expect(
      await screen.findByText("メールアドレスまたはパスワードが違います。"),
    ).toBeInTheDocument();
  });
});
