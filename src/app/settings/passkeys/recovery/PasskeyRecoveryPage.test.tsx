import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { passkeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";
import { PasskeyRecoveryPage } from "./PasskeyRecoveryPage";

const recoveryKey = "11111111-1111-4111-8111-111111111111";

describe("PasskeyRecoveryPage", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("is reachable from the login flow and prioritizes SSO before email", () => {
    render(<PasskeyRecoveryPage />);

    const headings = screen.getAllByRole("heading");
    expect(headings[1]).toHaveTextContent("SSOで本人確認");
    expect(headings[2]).toHaveTextContent("メールで本人確認");
    expect(screen.getByLabelText("Identity ID")).toBeInTheDocument();
    expect(screen.getByLabelText("登録済みメールアドレス")).toBeInTheDocument();
  });

  it("starts linked SSO recovery with a validated identity identifier", async () => {
    const createRecoverySocialRedirect = vi.fn().mockResolvedValue({ ok: true, data: { redirectUrl: "https://accounts.example.test/reauth" } });
    const navigate = vi.fn();
    render(<PasskeyRecoveryPage api={{ ...passkeyBrowserApi, createRecoverySocialRedirect }} navigate={navigate} />);

    const identityInput = screen.getByLabelText("Identity ID");
    fireEvent.change(identityInput, { target: { value: "invalid" } });
    expect(screen.getByRole("button", { name: "Googleで本人確認" })).toBeDisabled();
    fireEvent.change(identityInput, { target: { value: recoveryKey } });
    fireEvent.click(screen.getByRole("button", { name: "Googleで本人確認" }));

    await waitFor(() => expect(createRecoverySocialRedirect).toHaveBeenCalledWith("google", recoveryKey, "ja"));
    expect(navigate).toHaveBeenCalledWith("https://accounts.example.test/reauth");
  });

  it("masks SSO cancellation or linkage failures", async () => {
    const createRecoverySocialRedirect = vi.fn().mockResolvedValue({ ok: false, status: 422, message: "Provider is not linked" });
    render(<PasskeyRecoveryPage api={{ ...passkeyBrowserApi, createRecoverySocialRedirect }} />);

    fireEvent.change(screen.getByLabelText("Identity ID"), { target: { value: recoveryKey } });
    fireEvent.click(screen.getByRole("button", { name: "LINEで本人確認" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("SSOによる本人確認を開始できませんでした");
    expect(screen.queryByText("Provider is not linked")).not.toBeInTheDocument();
  });

  it.each(["registered@example.com", "missing@example.com"])(
    "shows the same email-sent message for %s",
    async (email) => {
      const sendRecoveryEmail = vi.fn().mockResolvedValue({ ok: true, data: {} });
      render(<PasskeyRecoveryPage api={{ ...passkeyBrowserApi, sendRecoveryEmail }} />);

      fireEvent.change(screen.getByLabelText("登録済みメールアドレス"), { target: { value: email } });
      fireEvent.click(screen.getByRole("button", { name: "確認コードを送信" }));

      expect(await screen.findByRole("status")).toHaveTextContent("入力されたメールアドレスが登録済みの場合");
      expect(screen.queryByLabelText("登録済みメールアドレス")).not.toBeInTheDocument();
      expect(screen.getByText(email, { exact: false })).toBeInTheDocument();
    },
  );

  it("shows expiry safely and resends only to the locked email address", async () => {
    const sendRecoveryEmail = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const verifyRecoveryEmail = vi.fn().mockResolvedValue({ ok: false, status: 422, message: "Recovery session expired for identity 123" });
    render(<PasskeyRecoveryPage api={{ ...passkeyBrowserApi, sendRecoveryEmail, verifyRecoveryEmail }} />);

    fireEvent.change(screen.getByLabelText("登録済みメールアドレス"), { target: { value: "member@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "確認コードを送信" }));
    await screen.findByLabelText("確認コード");
    fireEvent.change(screen.getByLabelText("確認コード"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "確認する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("正しくないか、有効期限が切れています");
    expect(screen.queryByText(/identity 123/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "同じメールアドレスへ確認コードを再送" }));
    await waitFor(() => expect(sendRecoveryEmail).toHaveBeenCalledTimes(2));
    expect(sendRecoveryEmail).toHaveBeenLastCalledWith({ email: "member@example.com" }, "ja");
  });

  it("verifies email, requires destructive confirmation, and returns to login after replacement", async () => {
    const sendRecoveryEmail = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const verifyRecoveryEmail = vi.fn().mockResolvedValue({ ok: true, data: { recoveryKey } });
    const recoveryAdapter = vi.fn().mockResolvedValue({ ok: true });
    render(<PasskeyRecoveryPage api={{ ...passkeyBrowserApi, sendRecoveryEmail, verifyRecoveryEmail }} recoveryAdapter={recoveryAdapter} />);

    fireEvent.change(screen.getByLabelText("登録済みメールアドレス"), { target: { value: "member@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "確認コードを送信" }));
    await screen.findByLabelText("確認コード");
    fireEvent.change(screen.getByLabelText("確認コード"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "確認する" }));

    expect(await screen.findByText("古いパスキーはすべて削除されます。")).toBeInTheDocument();
    expect(screen.getByText("連携済みSSOは維持されます。")).toBeInTheDocument();
    const recoverButton = screen.getByRole("button", { name: "新しいパスキーを登録して全置換" });
    expect(recoverButton).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /全置換と全セッション失効/ }));
    fireEvent.click(recoverButton);

    await waitFor(() => expect(recoveryAdapter).toHaveBeenCalledWith(expect.objectContaining({ recoveryKey, language: "ja" })));
    expect(await screen.findByText("パスキーの復旧が完了しました")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ログインへ進む" })).toHaveAttribute("href", "/login");
  });

  it("supports SSO callback recovery keys, scrubs them from the URL, and retries cancellation", async () => {
    window.history.pushState({}, "", `/settings/passkeys/recovery?recoveryKey=${recoveryKey}`);
    const recoveryAdapter = vi.fn()
      .mockResolvedValueOnce({ ok: false, reason: "cancelled" })
      .mockResolvedValueOnce({ ok: true });
    render(<PasskeyRecoveryPage initialRecoveryKey={recoveryKey} recoveryAdapter={recoveryAdapter} />);

    await waitFor(() => expect(window.location.search).toBe(""));
    fireEvent.click(screen.getByRole("checkbox", { name: /全置換と全セッション失効/ }));
    fireEvent.click(screen.getByRole("button", { name: "新しいパスキーを登録して全置換" }));
    expect(await screen.findByRole("status")).toHaveTextContent("安全に再試行");
    expect(screen.getByRole("button", { name: "新しいパスキーを登録して全置換" })).toBeEnabled();
  });
});
