import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "./LoginPage";
import { useAuthStore } from "@/gateways/auth/authStore";
import { webAuthnBrowserAdapter } from "@/gateways/auth/webAuthnBrowserAdapter";

describe("LoginPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders SSO before passkey and has no password fields", () => {
    render(<LoginPage webAuthnSupported />);

    expect(screen.queryByText("SSOでのログインをおすすめします。SSOを利用できない場合はパスキーを使用できます。")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "SSOでログイン" })).not.toBeInTheDocument();
    expect(screen.queryByText("普段お使いのサービスを選択してください。")).not.toBeInTheDocument();
    expect(screen.getByText("SSOで初めてログインすると、アカウントが自動で作成されます。")).toBeInTheDocument();
    expect(screen.getByText(/パスキーでアカウント登録する方は/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "アカウント登録へ" })).toHaveAttribute("href", "/signup");
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAccessibleName("Googleでログイン");
    expect(screen.getByRole("button", { name: "パスキーでログイン" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/パスワード/)).not.toBeInTheDocument();
  });

  it("logs in with a passkey, refreshes identity, and preserves returnTo", async () => {
    const loginAdapter = vi.fn().mockResolvedValue({
      ok: true,
      identity: { identityIdentifier: "id", identityName: "member", email: "member@example.com", language: "ja" },
      returnTo: "/wiki/ja/example",
    });
    const refreshIdentity = vi.fn().mockResolvedValue({});
    useAuthStore.setState({ refreshIdentity });
    const navigate = vi.fn();

    render(<LoginPage loginAdapter={loginAdapter} navigate={navigate} returnTo="/wiki/ja/example" webAuthnSupported />);
    fireEvent.click(screen.getByRole("button", { name: "パスキーでログイン" }));

    await waitFor(() => expect(loginAdapter).toHaveBeenCalledWith({ language: "ja", returnTo: "/wiki/ja/example" }));
    expect(refreshIdentity).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/wiki/ja/example");
  });

  it("returns to a retryable state after cancellation", async () => {
    const loginAdapter = vi.fn().mockResolvedValue({ ok: false, reason: "cancelled" });
    render(<LoginPage loginAdapter={loginAdapter} webAuthnSupported />);

    fireEvent.click(screen.getByRole("button", { name: "パスキーでログイン" }));

    expect(await screen.findByRole("status")).toHaveTextContent("キャンセル");
    expect(screen.getByRole("button", { name: "パスキーでログイン" })).toBeEnabled();
  });

  it("keeps SSO enabled when WebAuthn is unsupported", () => {
    render(<LoginPage webAuthnSupported={false} />);

    expect(screen.getByRole("button", { name: "パスキーでログイン" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Googleでログイン" })).toBeEnabled();
    expect(screen.getByText(/このブラウザーではパスキーを利用できません/)).toBeInTheDocument();
  });

  it("detects WebAuthn support in the browser when support is not provided", () => {
    vi.spyOn(webAuthnBrowserAdapter, "isSupported").mockReturnValue(true);

    render(<LoginPage />);

    expect(screen.getByRole("button", { name: "パスキーでログイン" })).toBeEnabled();
    expect(screen.queryByText(/この端末、セキュリティキー/)).not.toBeInTheDocument();
  });
});
