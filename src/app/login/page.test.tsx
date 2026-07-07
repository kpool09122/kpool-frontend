import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "./LoginPage";
import { I18nProvider } from "../../i18n/I18nProvider";
import { useAuthStore } from "@/gateways/auth/authStore";

const loginIdentity = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  profileImage: "https://images.example.test/member.jpg",
};

describe("LoginPage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      identity: null,
      status: "loading",
    });
  });

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
      expect(socialRedirectAdapter).toHaveBeenCalledWith("google", "/mypage"),
    );
    expect(navigate).toHaveBeenCalledWith("https://accounts.example.test/oauth");
  });

  it("passes the return destination to SSO redirect requests", async () => {
    const socialRedirectAdapter = vi.fn().mockResolvedValue({
      ok: true,
      redirectUrl: "https://accounts.example.test/oauth",
    });
    const navigate = vi.fn();

    render(
      <LoginPage
        socialRedirectAdapter={socialRedirectAdapter}
        navigate={navigate}
        returnTo="/wiki/ja/gr-aurora-echo/edit"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Googleでログイン" }));

    await waitFor(() =>
      expect(socialRedirectAdapter).toHaveBeenCalledWith(
        "google",
        "/wiki/ja/gr-aurora-echo/edit",
      ),
    );
  });

  it("logs in with email and password and opens mypage", async () => {
    const loginAdapter = vi.fn().mockResolvedValue({ identity: loginIdentity, ok: true });
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
        return_to: "/mypage",
      }),
    );
    expect(navigate).toHaveBeenCalledWith("/mypage");
    expect(useAuthStore.getState()).toMatchObject({
      identity: loginIdentity,
      status: "authenticated",
    });
  });

  it("uses the safe return destination returned by email login", async () => {
    const loginAdapter = vi.fn().mockResolvedValue({
      identity: loginIdentity,
      ok: true,
      returnTo: "/wiki/ja/gr-aurora-echo/edit",
    });
    const navigate = vi.fn();

    render(
      <LoginPage
        loginAdapter={loginAdapter}
        navigate={navigate}
        returnTo="/mypage"
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
        return_to: "/mypage",
      }),
    );
    expect(navigate).toHaveBeenCalledWith("/wiki/ja/gr-aurora-echo/edit");
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

  it("renders the primary login copy in English", () => {
    render(
      <I18nProvider initialLocale="en">
        <LoginPage />
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Google.*login/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in with email" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/signup",
    );
  });
});
