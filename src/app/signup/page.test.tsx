import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignupPage } from "./SignupPage";
import type { SignupAdapter } from "./signupFlow";

const createAdapter = (overrides: Partial<SignupAdapter> = {}): SignupAdapter => ({
  createAccount: vi.fn().mockResolvedValue({
    accountIdentifier: "22222222-2222-2222-2222-222222222222",
    email: "member@example.com",
    type: "individual",
    name: "Member Account",
    status: "active",
    accountCategory: "standard",
  }),
  verifyEmail: vi.fn().mockResolvedValue({
    email: "member@example.com",
    verifiedAt: "2026-05-05T00:00:00+00:00",
  }),
  createIdentity: vi.fn().mockResolvedValue({
    identityIdentifier: "11111111-1111-1111-1111-111111111111",
    username: "member",
    email: "member@example.com",
    language: "ja",
  }),
  ...overrides,
});

const fillAccountForm = () => {
  fireEvent.change(screen.getByLabelText("登録用メールアドレス"), {
    target: { value: "member@example.com" },
  });
  fireEvent.change(screen.getByLabelText("アカウント名"), {
    target: { value: "Member Account" },
  });
};

describe("SignupPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("creates an account, verifies email, creates identity, and opens mypage", async () => {
    const adapter = createAdapter();
    const navigate = vi.fn();

    render(<SignupPage signupAdapter={adapter} navigate={navigate} />);
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "認証コードを送信" }));

    await waitFor(() =>
      expect(adapter.createAccount).toHaveBeenCalledWith(
        {
          email: "member@example.com",
          accountName: "Member Account",
          accountType: "individual",
          identityIdentifier: null,
        },
        { language: "ja" },
      ),
    );
    expect(await screen.findByRole("heading", { name: "認証コード入力" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("認証コード"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "認証コードを確認" }));

    await waitFor(() =>
      expect(adapter.verifyEmail).toHaveBeenCalledWith(
        {
          email: "member@example.com",
          authCode: "123456",
        },
        { language: "ja" },
      ),
    );
    expect(await screen.findByRole("heading", { name: "登録情報設定" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "secret-password" },
    });
    fireEvent.change(screen.getByLabelText("確認用パスワード"), {
      target: { value: "secret-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登録を完了" }));

    await waitFor(() =>
      expect(adapter.createIdentity).toHaveBeenCalledWith(
        {
          username: "Member Account",
          email: "member@example.com",
          password: "secret-password",
          confirmedPassword: "secret-password",
          base64EncodedImage: null,
          invitationToken: null,
          requestLanguage: "ja",
        },
        { language: "ja" },
      ),
    );
    expect(navigate).toHaveBeenCalledWith("/mypage");
  });

  it("keeps typed account values and shows an error when account creation fails", async () => {
    const adapter = createAdapter({
      createAccount: vi.fn().mockRejectedValue(new Error("このメールアドレスは登録済みです。")),
    });

    render(<SignupPage signupAdapter={adapter} />);
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "認証コードを送信" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "このメールアドレスは登録済みです。",
    );
    expect(screen.getByLabelText("登録用メールアドレス")).toHaveValue("member@example.com");
    expect(screen.getByLabelText("アカウント名")).toHaveValue("Member Account");
  });

  it("uses the selected corporation account type when the corporation tab is selected", async () => {
    const adapter = createAdapter();

    render(<SignupPage signupAdapter={adapter} />);
    fillAccountForm();
    fireEvent.click(screen.getByRole("tab", { name: "法人" }));
    fireEvent.click(screen.getByRole("button", { name: "認証コードを送信" }));

    await waitFor(() =>
      expect(adapter.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          accountType: "corporation",
        }),
        { language: "ja" },
      ),
    );
  });
});
