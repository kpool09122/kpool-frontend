import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "./LoginPage";
import { useAuthStore } from "@/gateways/auth/authStore";

describe("LoginPage", () => {
  afterEach(() => cleanup());

  it("renders SSO before passkey and has no password fields", () => {
    render(<LoginPage webAuthnSupported />);

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
});
