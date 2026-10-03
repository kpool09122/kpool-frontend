import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "@/i18n/dictionaries";
import { UserOtherClient } from "./UserOtherClient";

const mocks = vi.hoisted(() => ({
  performRecentAuthentication: vi.fn(),
  listPasskeys: vi.fn(),
  getWithdrawalEligibility: vi.fn(),
  refreshIdentity: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  searchParams: new URLSearchParams(),
  withdraw: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
  useSearchParams: () => mocks.searchParams,
}));
vi.mock("@/gateways/auth/recentAuthentication", () => ({
  performRecentAuthentication: mocks.performRecentAuthentication,
}));
vi.mock("@/gateways/identity/passkeyBrowserApi", () => ({
  passkeyBrowserApi: { list: mocks.listPasskeys },
}));
vi.mock("@/gateways/identity/withdrawIdentityBrowserApi", () => ({
  withdrawFromService: mocks.withdraw,
  getWithdrawalEligibility: mocks.getWithdrawalEligibility,
}));
vi.mock("../UserSectionContext", () => ({
  useUserSection: () => ({
    currentIdentity: {
      identityIdentifier: "11111111-1111-4111-8111-111111111111",
      identityName: "Member",
      email: "member@example.com",
      language: "ja",
      authenticationMethods: { passkeyCount: 1, linkedSocialProviders: [] },
    },
    t: dictionaries.ja.admin,
  }),
}));
vi.mock("@/gateways/auth/authStore", () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    clearIdentity: vi.fn(),
    refreshIdentity: mocks.refreshIdentity,
  }),
}));

const renderPage = (queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => {
  render(
    <QueryClientProvider client={queryClient}>
      <UserOtherClient />
    </QueryClientProvider>,
  );
  return queryClient;
};

const renderVerifiedPage = async () => {
  mocks.listPasskeys.mockResolvedValue({ ok: true, data: { passkeys: [] } });
  const queryClient = renderPage();
  await screen.findByRole("button", { name: "退会手続きへ" });
  return queryClient;
};

const openDialog = (confirmationName: string | null = "Member") => {
  fireEvent.click(screen.getByRole("button", { name: "退会手続きへ" }));
  if (confirmationName !== null) {
    fireEvent.change(screen.getByRole("textbox", { name: "署名（ユーザー名）" }), { target: { value: confirmationName } });
  }
  return screen.getByRole("dialog", { name: "サービスから退会しますか？" });
};

describe("UserOtherClient", () => {
  beforeEach(() => {
    mocks.getWithdrawalEligibility.mockReset().mockResolvedValue({ ok: true, data: { canWithdraw: true } });
    mocks.listPasskeys.mockReset().mockResolvedValue({ ok: false, status: 401, code: "recent_authentication_required", message: "Recent authentication required" });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.searchParams = new URLSearchParams();
  });

  it("masks every user before verification and then shows support contact when ineligible", async () => {
    mocks.getWithdrawalEligibility.mockResolvedValue({ ok: true, data: { canWithdraw: false } });
    mocks.performRecentAuthentication.mockImplementation(async () => {
      mocks.listPasskeys.mockResolvedValue({ ok: true, data: { passkeys: [] } });
      return { status: "verified" };
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["identity-withdrawal-eligibility"], { ok: true, data: { canWithdraw: false } });
    renderPage(queryClient);
    const verify = await screen.findByRole("button", { name: "本人確認を行う" });
    expect(mocks.getWithdrawalEligibility).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: "運営に問い合わせる" })).not.toBeInTheDocument();
    fireEvent.click(verify);
    expect(await screen.findByRole("link", { name: "運営に問い合わせる" })).toHaveAttribute("href", "/contact");
    expect(screen.queryByText(dictionaries.ja.admin.withdrawalDescription)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "退会手続きへ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "本人確認を行う" })).not.toBeInTheDocument();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });

  it("switches to support contact if the server rejects withdrawal after eligibility changes", async () => {
    mocks.withdraw.mockResolvedValue({ ok: false, status: 403, code: "identity_withdrawal_not_allowed" });
    await renderVerifiedPage();
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "退会する" }));
    expect(await screen.findByRole("link", { name: "運営に問い合わせる" })).toHaveAttribute("href", "/contact");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "退会手続きへ" })).not.toBeInTheDocument();
  });

  it("masks withdrawal until verification succeeds without automatically withdrawing", async () => {
    mocks.performRecentAuthentication.mockImplementation(async () => {
      mocks.listPasskeys.mockResolvedValue({ ok: true, data: { passkeys: [] } });
      return { status: "verified" };
    });
    renderPage();

    expect(await screen.findByText("退会手続きを行うには追加の本人確認が必要です。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "退会手続きへ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "本人確認を行う" }));

    expect(await screen.findByRole("button", { name: "退会手続きへ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "本人確認を行う" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.performRecentAuthentication).toHaveBeenCalledWith(
      expect.objectContaining({ returnTo: "withdrawal", passkeyCount: 1 }),
    );
    expect(mocks.withdraw).not.toHaveBeenCalled();
    openDialog();
    expect(screen.getByRole("button", { name: "退会する" })).toBeInTheDocument();
  });

  it.each(["cancelled", "failed", "unavailable"])("keeps withdrawal masked when verification is %s", async (kind) => {
    mocks.performRecentAuthentication.mockResolvedValue({ status: "error", kind });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "本人確認を行う" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "本人確認を行う" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "退会手続きへ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });

  it.each([
    ["unsupported", dictionaries.ja.admin.passkeyUnsupported],
    ["expired", dictionaries.ja.admin.passkeyVerificationExpired],
  ])("explains why verification is %s while keeping withdrawal masked", async (kind, message) => {
    mocks.performRecentAuthentication.mockResolvedValue({ status: "error", kind, message: "upstream" });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "本人確認を行う" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: "本人確認を行う" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "退会手続きへ" })).not.toBeInTheDocument();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });

  it.each([true, false])("retries an eligibility error and displays the resulting eligibility %s", async (canWithdraw) => {
    mocks.listPasskeys.mockResolvedValue({ ok: true, data: { passkeys: [] } });
    mocks.getWithdrawalEligibility.mockResolvedValueOnce({ ok: false, status: 503, message: "Temporarily unavailable" });
    let resolveEligibility: ((value: { ok: true; data: { canWithdraw: boolean } }) => void) | undefined;
    mocks.getWithdrawalEligibility.mockImplementationOnce(() => new Promise((resolve) => { resolveEligibility = resolve; }));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Temporarily unavailable");
    const retry = screen.getByRole("button", { name: "再試行" });
    fireEvent.click(retry);
    await waitFor(() => expect(retry).toBeDisabled());
    expect(mocks.getWithdrawalEligibility).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: "退会手続きへ" })).not.toBeInTheDocument();

    resolveEligibility?.({ ok: true, data: { canWithdraw } });
    if (canWithdraw) {
      expect(await screen.findByRole("button", { name: "退会手続きへ" })).toBeEnabled();
    } else {
      expect(await screen.findByRole("link", { name: "運営に問い合わせる" })).toHaveAttribute("href", "/contact");
    }
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "再試行" })).not.toBeInTheDocument();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });

  it("unmasks withdrawal when passkey management has already verified the same session", async () => {
    await renderVerifiedPage();

    expect(mocks.listPasskeys).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "本人確認を行う" })).not.toBeInTheDocument();
    expect(mocks.performRecentAuthentication).not.toHaveBeenCalled();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });

  it("shows loading without flashing the verification gate before the server responds", async () => {
    let resolveList: ((value: { ok: true; data: { passkeys: [] } }) => void) | undefined;
    mocks.listPasskeys.mockReturnValue(new Promise((resolve) => { resolveList = resolve; }));
    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("本人確認の状態を確認中");
    expect(screen.queryByText("退会手続きを行うには追加の本人確認が必要です。")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "本人確認を行う" })).not.toBeInTheDocument();
    resolveList?.({ ok: true, data: { passkeys: [] } });
    await screen.findByRole("button", { name: "退会手続きへ" });
  });

  it("keeps the verified entry visible while refreshing a cached passkey result", async () => {
    let resolveList: ((value: { ok: true; data: { passkeys: [] } }) => void) | undefined;
    mocks.listPasskeys.mockReturnValue(new Promise((resolve) => { resolveList = resolve; }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["identity-passkeys"], { ok: true, data: { passkeys: [] } });
    renderPage(queryClient);

    expect(await screen.findByRole("button", { name: "退会手続きへ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "本人確認を行う" })).not.toBeInTheDocument();
    resolveList?.({ ok: true, data: { passkeys: [] } });
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it("rechecks the server even when a successful passkey result is cached", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    queryClient.setQueryData(["identity-passkeys"], { ok: true, data: { passkeys: [] } });
    renderPage(queryClient);

    await screen.findByRole("button", { name: "本人確認を行う" });
    expect(mocks.listPasskeys).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "退会手続きへ" })).not.toBeInTheDocument();
  });

  it("keeps withdrawal masked when a social return marker has no valid server verification", async () => {
    mocks.searchParams = new URLSearchParams("stepUp=complete");
    renderPage();

    await screen.findByRole("button", { name: "本人確認を行う" });
    expect(screen.queryByRole("button", { name: "退会手続きへ" })).not.toBeInTheDocument();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });

  it("prevents duplicate verification requests while verification is pending", async () => {
    let completeVerification: ((value: { status: "verified" }) => void) | undefined;
    mocks.performRecentAuthentication.mockReturnValue(new Promise((resolve) => { completeVerification = resolve; }));
    renderPage();
    const verify = await screen.findByRole("button", { name: "本人確認を行う" });
    fireEvent.click(verify);
    fireEvent.click(verify);

    expect(screen.getByRole("button", { name: "本人確認中" })).toBeDisabled();
    expect(mocks.performRecentAuthentication).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "退会手続きへ" })).not.toBeInTheDocument();
    mocks.listPasskeys.mockResolvedValue({ ok: true, data: { passkeys: [] } });
    completeVerification?.({ status: "verified" });
    await screen.findByRole("button", { name: "退会手続きへ" });
  });

  it("requires an exact manually entered username and clears it when the dialog is reopened", async () => {
    await renderVerifiedPage();
    openDialog(null);
    const input = screen.getByRole("textbox", { name: "署名（ユーザー名）" });
    const confirm = screen.getByRole("button", { name: "退会する" });
    expect(input).toHaveAttribute("placeholder", "Member");
    expect(confirm).toBeDisabled();
    for (const value of ["member", "Member ", " Member", "Wrong"]) {
      fireEvent.change(input, { target: { value } });
      expect(confirm).toBeDisabled();
      fireEvent.click(confirm);
    }
    expect(mocks.withdraw).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "Member" } });
    expect(confirm).toBeEnabled();
    fireEvent.compositionStart(input);
    expect(confirm).toBeDisabled();
    fireEvent.compositionEnd(input);
    expect(confirm).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    openDialog(null);
    expect(screen.getByRole("textbox", { name: "署名（ユーザー名）" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "退会する" })).toBeDisabled();
  });

  it("blocks copy, paste and drop into the username confirmation", async () => {
    await renderVerifiedPage();
    openDialog(null);
    const input = screen.getByRole("textbox", { name: "署名（ユーザー名）" });
    expect(fireEvent.copy(input)).toBe(false);
    expect(fireEvent.paste(input, { clipboardData: { getData: () => "Member" } })).toBe(false);
    expect(fireEvent.drop(input, { dataTransfer: { getData: () => "Member" } })).toBe(false);
    expect(input).toHaveValue("");
    expect(screen.getByRole("button", { name: "退会する" })).toBeDisabled();
  });

  it("asks for the current name again if the server rejects the confirmation", async () => {
    mocks.withdraw.mockResolvedValue({ ok: false, status: 422, code: "identity_name_confirmation_mismatch" });
    await renderVerifiedPage();
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "退会する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ユーザー名が一致しません");
    expect(mocks.withdraw).toHaveBeenCalledWith("Member");
    expect(mocks.refreshIdentity).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox", { name: "署名（ユーザー名）" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "退会する" })).toBeDisabled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("shows the irreversible notice and does not call DELETE on cancel", async () => {
    await renderVerifiedPage();
    openDialog();

    expect(screen.getByText(/旧利用者として復元できません/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });

  it("traps focus in the dialog and restores it after Escape", async () => {
    await renderVerifiedPage();
    const start = screen.getByRole("button", { name: "退会手続きへ" });
    openDialog();
    const cancel = screen.getByRole("button", { name: "キャンセル" });
    const confirm = screen.getByRole("button", { name: "退会する" });

    expect(cancel).toHaveFocus();
    const input = screen.getByRole("textbox", { name: "署名（ユーザー名）" });
    input.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(input).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(start).toHaveFocus());
  });

  it("prevents duplicate withdrawal requests while the first request is pending", async () => {
    let resolveWithdrawal: ((value: { ok: false; status: number; message: string }) => void) | undefined;
    mocks.withdraw.mockReturnValue(new Promise((resolve) => { resolveWithdrawal = resolve; }));
    await renderVerifiedPage();
    openDialog();
    const confirm = screen.getByRole("button", { name: "退会する" });

    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(mocks.withdraw).toHaveBeenCalledOnce();
    resolveWithdrawal?.({ ok: false, status: 500, message: "failed" });
    expect(await screen.findByRole("alert")).toHaveTextContent("退会処理を完了できませんでした");
  });

  it("does not auto-retry after recent authentication is required", async () => {
    mocks.withdraw.mockResolvedValue({
      ok: false,
      status: 401,
      code: "recent_authentication_required",
      message: "Recent authentication required",
    });
    mocks.performRecentAuthentication.mockImplementation(async () => {
      mocks.listPasskeys.mockResolvedValue({ ok: true, data: { passkeys: [] } });
      return { status: "verified" };
    });
    await renderVerifiedPage();
    openDialog();

    fireEvent.click(screen.getByRole("button", { name: "退会する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("直近の本人確認が必要です");
    expect(mocks.withdraw).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "退会手続きへ" })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "本人確認を行う" }));
    expect(await screen.findByRole("button", { name: "退会手続きへ" })).toBeInTheDocument();
    expect(mocks.performRecentAuthentication).toHaveBeenCalledWith(
      expect.objectContaining({ returnTo: "withdrawal" }),
    );
    expect(mocks.withdraw).toHaveBeenCalledOnce();
  });

  it("unmasks the withdrawal entry after social step-up without executing withdrawal", async () => {
    mocks.searchParams = new URLSearchParams("stepUp=complete");
    await renderVerifiedPage();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "退会手続きへ" })).toBeInTheDocument();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });

  it("routes an expired login back through login without showing success", async () => {
    mocks.withdraw.mockResolvedValue({
      ok: false,
      status: 401,
      code: "authentication_required",
      message: "Authentication required",
    });
    await renderVerifiedPage();
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "退会する" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login?returnTo=%2Fadmin%2Fuser%2Fother"));
    expect(screen.queryByText(/退会が完了しました/)).not.toBeInTheDocument();
  });

  it("clears client data and navigates home only after 204 success", async () => {
    mocks.withdraw.mockResolvedValue({ ok: true, data: {} });
    const queryClient = await renderVerifiedPage();
    queryClient.setQueryData(["private"], { name: "member" });
    openDialog();

    fireEvent.click(screen.getByRole("button", { name: "退会する" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/ja"));
    expect(queryClient.getQueryData(["private"])).toBeUndefined();
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it.each([
    [419, "csrf_token_mismatch", "安全確認の有効期限が切れました"],
    [500, undefined, "退会処理を完了できませんでした"],
  ])("shows a non-success error for status %s", async (status, code, message) => {
    mocks.withdraw.mockResolvedValue({ ok: false, status, code, message: "upstream" });
    mocks.refreshIdentity.mockResolvedValue(null);
    await renderVerifiedPage();
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "退会する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
