import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SignupAdapter } from "@/gateways/auth/signupFlow";
import { webAuthnBrowserAdapter } from "@/gateways/auth/webAuthnBrowserAdapter";
import { SignupPage } from "./SignupPage";

const options = {
  challengeKey: "11111111-1111-4111-8111-111111111111",
  options: {
    rp: { name: "kpool", id: "example.test" },
    user: { name: "member@example.com", id: "AQID", displayName: "Member" },
    challenge: "AQID",
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    timeout: 60000,
    excludeCredentials: [],
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    attestation: "none",
  },
};

const credential = {
  id: "credential-id",
  rawId: "AQID",
  type: "public-key" as const,
  response: { clientDataJSON: "AQID", attestationObject: "AQID", transports: ["internal"] },
  authenticatorAttachment: null,
  clientExtensionResults: {},
};

const createAdapter = (): SignupAdapter => ({
  sendAuthCode: vi.fn().mockResolvedValue(undefined),
  verifyEmail: vi.fn().mockResolvedValue({ email: "member@example.com", verifiedAt: "2026-09-25T00:00:00Z" }),
  createRegistrationOptions: vi.fn().mockResolvedValue(options),
  registerWithPasskey: vi.fn().mockResolvedValue({ identityIdentifier: "id", identityName: "Member", email: "member@example.com", language: "ja" }),
});

const webAuthn = {
  ...webAuthnBrowserAdapter,
  isSupported: () => true,
  create: vi.fn().mockResolvedValue({ ok: true, credential }),
};

describe("SignupPage", () => {
  afterEach(() => cleanup());

  it("renders only the email and passkey signup flow", () => {
    render(<SignupPage signupAdapter={createAdapter()} webAuthnAdapter={webAuthn} />);

    expect(screen.queryByText(/メールアドレスを確認してパスキー/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "SSOで登録" })).not.toBeInTheDocument();
    expect(screen.queryByText("普段お使いのサービスで簡単に登録できます。")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "パスキーで登録" })).not.toBeInTheDocument();
    expect(screen.queryByText("メールアドレスを確認してからパスキーを作成します。")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "認証コードを送信" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/パスワード/)).not.toBeInTheDocument();

    const individualTab = screen.getByRole("tab", { name: "個人" });
    const corporationTab = screen.getByRole("tab", { name: "法人" });
    expect(individualTab).toHaveAttribute("aria-selected", "true");
    fireEvent.click(corporationTab);
    expect(corporationTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", "corporation-account-panel");
  });

  it("sends and verifies the email before options, credential, and registration", async () => {
    const adapter = createAdapter();
    const navigate = vi.fn();
    render(<SignupPage signupAdapter={adapter} webAuthnAdapter={webAuthn} navigate={navigate} />);

    fireEvent.change(screen.getByLabelText("登録用メールアドレス"), { target: { value: "member@example.com" } });
    fireEvent.change(screen.getByLabelText("アカウント名"), { target: { value: "Member Account" } });
    fireEvent.click(screen.getByRole("button", { name: "認証コードを送信" }));
    await screen.findByRole("heading", { name: "認証コード入力" });

    fireEvent.change(screen.getByLabelText("認証コード"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "認証コードを確認" }));
    await screen.findByRole("heading", { name: "パスキー登録" });
    fireEvent.change(screen.getByLabelText("パスキー名"), { target: { value: "MacBook" } });
    fireEvent.click(screen.getByRole("button", { name: "パスキーを登録して完了" }));

    await waitFor(() => expect(adapter.createRegistrationOptions).toHaveBeenCalledWith({
      email: "member@example.com",
      accountType: "individual",
      oneTimeToken: null,
      return_to: "/admin",
    }, { language: "ja" }));
    expect(adapter.registerWithPasskey).toHaveBeenCalledWith(expect.objectContaining({
      challengeKey: options.challengeKey,
      identityName: "Member Account",
      displayName: "MacBook",
      credential,
    }), { language: "ja" });
    expect(navigate).toHaveBeenCalledWith("/admin");
  });
});
