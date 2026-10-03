import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "@/i18n/dictionaries";
import { UserOtherClient } from "./UserOtherClient";

const mocks = vi.hoisted(() => ({
  performRecentAuthentication: vi.fn(),
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
vi.mock("@/gateways/identity/withdrawIdentityBrowserApi", () => ({
  withdrawFromService: mocks.withdraw,
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

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <UserOtherClient />
    </QueryClientProvider>,
  );
  return queryClient;
};

const openDialog = () => {
  fireEvent.click(screen.getByRole("button", { name: "退会手続きへ" }));
  return screen.getByRole("dialog", { name: "サービスから退会しますか？" });
};

describe("UserOtherClient", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.searchParams = new URLSearchParams();
  });

  it("shows retained-data and irreversible notices and does not call DELETE on cancel", () => {
    renderPage();
    openDialog();

    expect(screen.getByText(/お問い合わせと返信、および決済関連データは保持/)).toBeInTheDocument();
    expect(screen.getByText(/旧利用者として復元できません/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });

  it("traps focus in the dialog and restores it after Escape", async () => {
    renderPage();
    const start = screen.getByRole("button", { name: "退会手続きへ" });
    openDialog();
    const cancel = screen.getByRole("button", { name: "キャンセル" });
    const confirm = screen.getByRole("button", { name: "退会する" });

    expect(cancel).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(start).toHaveFocus());
  });

  it("prevents duplicate withdrawal requests while the first request is pending", async () => {
    let resolveWithdrawal: ((value: { ok: false; status: number; message: string }) => void) | undefined;
    mocks.withdraw.mockReturnValue(new Promise((resolve) => { resolveWithdrawal = resolve; }));
    renderPage();
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
    mocks.performRecentAuthentication.mockResolvedValue({ status: "verified" });
    renderPage();
    openDialog();

    fireEvent.click(screen.getByRole("button", { name: "退会する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("直近の本人確認が必要です");
    expect(mocks.withdraw).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));
    expect(await screen.findByText(/本人確認が完了しました/)).toBeInTheDocument();
    expect(mocks.performRecentAuthentication).toHaveBeenCalledWith(
      expect.objectContaining({ returnTo: "withdrawal" }),
    );
    expect(mocks.withdraw).toHaveBeenCalledOnce();
  });

  it("opens the confirmation after social step-up without executing withdrawal", () => {
    mocks.searchParams = new URLSearchParams("stepUp=complete");
    renderPage();

    expect(screen.getByRole("dialog", { name: "サービスから退会しますか？" })).toBeInTheDocument();
    expect(screen.getByText(/本人確認が完了しました/)).toBeInTheDocument();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });

  it("routes an expired login back through login without showing success", async () => {
    mocks.withdraw.mockResolvedValue({
      ok: false,
      status: 401,
      code: "authentication_required",
      message: "Authentication required",
    });
    renderPage();
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "退会する" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login?returnTo=%2Fadmin%2Fuser%2Fother"));
    expect(screen.queryByText(/退会が完了しました/)).not.toBeInTheDocument();
  });

  it("clears client data and navigates to the completion notice only after 204 success", async () => {
    mocks.withdraw.mockResolvedValue({ ok: true, data: {} });
    const queryClient = renderPage();
    queryClient.setQueryData(["private"], { name: "member" });
    openDialog();

    fireEvent.click(screen.getByRole("button", { name: "退会する" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/ja?withdrawal=complete"));
    expect(queryClient.getQueryData(["private"])).toBeUndefined();
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it.each([
    [403, "identity_withdrawal_not_allowed", "通常の退会手続きを利用できません"],
    [419, "csrf_token_mismatch", "安全確認の有効期限が切れました"],
    [500, undefined, "退会処理を完了できませんでした"],
  ])("shows a non-success error for status %s", async (status, code, message) => {
    mocks.withdraw.mockResolvedValue({ ok: false, status, code, message: "upstream" });
    mocks.refreshIdentity.mockResolvedValue(null);
    renderPage();
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "退会する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
