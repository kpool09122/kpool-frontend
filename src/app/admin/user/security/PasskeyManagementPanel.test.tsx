import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { webAuthnBrowserAdapter } from "@/gateways/auth/webAuthnBrowserAdapter";
import type { PasskeySummary } from "@/gateways/identity/identityApi";
import { passkeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";
import { PasskeyManagementPanel } from "./PasskeyManagementPanel";

const passkey = {
  passkeyIdentifier: "11111111-1111-4111-8111-111111111111",
  displayName: "MacBook",
  transports: ["internal"],
  backupEligible: true,
  backupState: true,
  lastUsedAt: "2026-09-24T09:00:00Z",
  createdAt: "2026-09-01T09:00:00Z",
};
const secondPasskey = {
  ...passkey,
  passkeyIdentifier: "33333333-3333-4333-8333-333333333333",
  displayName: "Security key",
  lastUsedAt: null,
};
const registrationOptions = {
  challengeKey: "22222222-2222-4222-8222-222222222222",
  options: {
    rp: { name: "kpool", id: "example.test" }, user: { name: "member", id: "AQID", displayName: "Member" }, challenge: "AQID",
    pubKeyCredParams: [{ type: "public-key", alg: -7 }], timeout: 60000, excludeCredentials: [],
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" }, attestation: "none",
  },
};
const authenticationOptions = {
  challengeKey: "44444444-4444-4444-8444-444444444444",
  options: {
    challenge: "AQID", timeout: 60000, rpId: "example.test", allowCredentials: [], userVerification: "required",
  },
};
const registrationCredential = {
  id: "credential-id", rawId: "AQID", type: "public-key" as const,
  response: { clientDataJSON: "AQID", attestationObject: "AQID", transports: ["internal"] },
  authenticatorAttachment: null, clientExtensionResults: {},
};
const authenticationCredential = {
  id: "credential-id", rawId: "AQID", type: "public-key" as const,
  response: { clientDataJSON: "AQID", authenticatorData: "AQID", signature: "AQID", userHandle: null },
  authenticatorAttachment: null, clientExtensionResults: {},
};

type RenderOptions = {
  api?: Partial<typeof passkeyBrowserApi>;
  linkedSocialProviders?: string[];
  navigate?: (url: string) => void;
  passkeyCount?: number;
  passkeys?: PasskeySummary[];
  ssoStepUpCompleted?: boolean;
  onStepUpConsumed?: () => void;
  getResult?: { ok: true; credential: typeof authenticationCredential } | { ok: false; reason: "cancelled" | "error" | "unsupported" | "invalid-response" };
  supported?: boolean;
};

const renderPanel = ({
  api: overrides = {},
  linkedSocialProviders = [],
  navigate = vi.fn(),
  passkeys = [passkey],
  passkeyCount = passkeys.length,
  ssoStepUpCompleted = false,
  onStepUpConsumed = vi.fn(),
  getResult = { ok: true, credential: authenticationCredential },
  supported = true,
}: RenderOptions = {}) => {
  const api = {
    ...passkeyBrowserApi,
    list: vi.fn().mockResolvedValue({ ok: true, data: { passkeys } }),
    createStepUpPasskeyOptions: vi.fn().mockResolvedValue({ ok: true, data: authenticationOptions }),
    completeStepUpWithPasskey: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    createAdditionOptions: vi.fn().mockResolvedValue({ ok: true, data: registrationOptions }),
    add: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    update: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    createStepUpSocialRedirect: vi.fn().mockResolvedValue({ ok: true, data: { redirectUrl: "https://accounts.example.test/reauth" } }),
    ...overrides,
  };
  const adapter = {
    ...webAuthnBrowserAdapter,
    isSupported: () => supported,
    get: vi.fn().mockResolvedValue(getResult),
    create: vi.fn().mockResolvedValue({ ok: true, credential: registrationCredential } as const),
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <PasskeyManagementPanel api={api} linkedSocialProviders={linkedSocialProviders} navigate={navigate} onStepUpConsumed={onStepUpConsumed} passkeyCount={passkeyCount} ssoStepUpCompleted={ssoStepUpCompleted} webAuthnAdapter={adapter} />
    </QueryClientProvider>,
  );
  return { api, adapter, navigate };
};

describe("PasskeyManagementPanel", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("shows the security management UI and multiple passkeys without internal identifiers", async () => {
    renderPanel({ passkeys: [passkey, secondPasskey] });
    expect(await screen.findByText("MacBook")).toBeInTheDocument();
    expect(screen.getByText("Security key")).toBeInTheDocument();
    expect(screen.getByText("パスキー管理")).toBeInTheDocument();
    expect(screen.getByText("未使用")).toBeInTheDocument();
    expect(screen.queryByText(passkey.passkeyIdentifier)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /新しいパスキー/ })).not.toBeInTheDocument();
  });

  it("shows empty and API error states", async () => {
    renderPanel({ passkeys: [] });
    expect(await screen.findByText("登録済みのパスキーはありません。")).toBeInTheDocument();
    cleanup();

    renderPanel({ api: { list: vi.fn().mockResolvedValue({ ok: false, status: 500, message: "一覧を取得できません" }) } });
    expect(await screen.findByRole("alert")).toHaveTextContent("一覧を取得できません");
  });

  it("adds a passkey after management access has been authorized without asking for a name", async () => {
    const { api, adapter } = renderPanel();
    await screen.findByText("MacBook");
    fireEvent.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => expect(api.add).toHaveBeenCalledWith({
      challengeKey: registrationOptions.challengeKey,
      displayName: "新しいパスキー",
      credential: registrationCredential,
    }));
    expect(adapter.get).not.toHaveBeenCalled();
    expect(api.completeStepUpWithPasskey).not.toHaveBeenCalled();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it("deletes a passkey while management access is authorized", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { api } = renderPanel();
    await screen.findByText("MacBook");
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(passkey.passkeyIdentifier));
    expect(api.completeStepUpWithPasskey).not.toHaveBeenCalled();
  });

  it("keeps existing rename behavior", async () => {
    const { api } = renderPanel();
    await screen.findByText("MacBook");
    expect(api.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "MacBookの名前を編集" }));
    let input = await screen.findByRole("textbox", { name: "パスキー名" });
    expect(api.update).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "Work laptop" } });
    expect(api.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByRole("textbox", { name: "パスキー名" })).not.toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "MacBookの名前を編集" }));
    input = await screen.findByRole("textbox", { name: "パスキー名" });
    fireEvent.change(input, { target: { value: "Work laptop" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith(passkey.passkeyIdentifier, { displayName: "Work laptop" }));
    expect(screen.queryByRole("textbox", { name: "パスキー名" })).not.toBeInTheDocument();
  });

  it("explains a backend rejection when the last authentication method cannot be deleted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPanel({ api: { delete: vi.fn().mockResolvedValue({ ok: false, status: 409, message: "Conflict" }) } });
    await screen.findByText("MacBook");
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("最後の認証手段は削除できません");
  });

  it("shows a verification prompt instead of an API error and unlocks management with a passkey", async () => {
    const list = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 403, message: "Recent passkey management authentication is required." })
      .mockResolvedValueOnce({ ok: true, data: { passkeys: [passkey] } });
    const { api, adapter } = renderPanel({ api: { list }, passkeyCount: 1 });

    expect(await screen.findByText("パスキーを管理するには追加の本人確認が必要です。")).toBeInTheDocument();
    expect(screen.queryByText("Recent passkey management authentication is required.")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));

    expect(await screen.findByText("MacBook")).toBeInTheDocument();
    expect(adapter.get).toHaveBeenCalledWith(authenticationOptions);
    expect(api.completeStepUpWithPasskey).toHaveBeenCalledWith({
      challengeKey: authenticationOptions.challengeKey,
      credential: authenticationCredential,
    });
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("uses linked SSO when verification is required before the first passkey", async () => {
    const navigate = vi.fn();
    const { api } = renderPanel({
      api: { list: vi.fn().mockResolvedValue({ ok: false, status: 403, message: "Forbidden" }) },
      linkedSocialProviders: ["google"],
      navigate,
      passkeyCount: 0,
    });
    await screen.findByText("パスキーを管理するには追加の本人確認が必要です。");
    fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://accounts.example.test/reauth"));
    expect(api.createStepUpSocialRedirect).toHaveBeenCalledWith("google");
    expect(api.createAdditionOptions).not.toHaveBeenCalled();
  });

  it("continues first registration after the SSO callback without redirecting again", async () => {
    const onStepUpConsumed = vi.fn();
    const { api } = renderPanel({ passkeys: [], ssoStepUpCompleted: true, onStepUpConsumed });
    await screen.findByText("登録済みのパスキーはありません。");
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    await waitFor(() => expect(api.add).toHaveBeenCalledOnce());
    expect(api.createStepUpSocialRedirect).not.toHaveBeenCalled();
    expect(onStepUpConsumed).toHaveBeenCalledOnce();
  });

  it("clears an expired SSO callback before asking the user to verify again", async () => {
    const onStepUpConsumed = vi.fn();
    renderPanel({
      api: { createAdditionOptions: vi.fn().mockResolvedValue({ ok: false, status: 403, message: "Forbidden" }) },
      passkeys: [],
      ssoStepUpCompleted: true,
      onStepUpConsumed,
    });
    await screen.findByText("登録済みのパスキーはありません。");
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("有効期限が切れました");
    expect(onStepUpConsumed).toHaveBeenCalledOnce();
  });

  it("handles cancellation, expiration, unsupported WebAuthn, and recovery guidance", async () => {
    const verificationRequired = { list: vi.fn().mockResolvedValue({ ok: false, status: 403, message: "Forbidden" }) };
    const cancelled = renderPanel({ api: verificationRequired, getResult: { ok: false, reason: "cancelled" }, passkeyCount: 1 });
    await screen.findByText("パスキーを管理するには追加の本人確認が必要です。");
    fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("本人確認をキャンセルしました");
    expect(cancelled.api.completeStepUpWithPasskey).not.toHaveBeenCalled();
    cleanup();

    renderPanel({ api: { ...verificationRequired, completeStepUpWithPasskey: vi.fn().mockResolvedValue({ ok: false, status: 401, message: "Unauthorized" }) }, passkeyCount: 1 });
    await screen.findByText("パスキーを管理するには追加の本人確認が必要です。");
    fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("有効期限が切れました");
    cleanup();

    renderPanel({ api: verificationRequired, passkeyCount: 1, supported: false });
    await screen.findByText("パスキーを管理するには追加の本人確認が必要です。");
    fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("このブラウザーではパスキーを利用できません");
    cleanup();

    renderPanel({ api: verificationRequired, passkeyCount: 0 });
    expect(await screen.findByText("パスキーを管理するには追加の本人確認が必要です。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("本人確認に利用できるパスキーまたは連携済みSSOがありません");
  });
});
