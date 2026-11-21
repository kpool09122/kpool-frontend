import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OAuthConsentPage } from "./OAuthConsentPage";
import { I18nProvider } from "@/i18n/I18nProvider";

vi.mock("@/components/User/ExternalConnectionVerification", () => ({
  ExternalConnectionVerification: ({ onVerified, beforeRedirect }: { onVerified: () => unknown; beforeRedirect: () => void }) => <><button onClick={() => void onVerified()}>Verify authorization</button><button onClick={beforeRedirect}>SSO redirect</button></>,
}));
const detail = (scopes = ["wiki:read", "wiki-drafts:write"]) => ({ requestIdentifier: "returned-id", expiresAt: new Date(Date.now() + 600000).toISOString(), clientName: "ChatGPT", scopes: scopes.map((scope) => ({ scope, description: scope })) });
const mockApi = () => ({
  start: vi.fn().mockResolvedValue({ ok: true, data: detail() }),
  get: vi.fn().mockResolvedValue({ ok: true, data: detail([]) }),
  approve: vi.fn().mockResolvedValue({ ok: true, data: { redirectUri: "https://client.example/callback?code=code&state=original" } }),
  deny: vi.fn().mockResolvedValue({ ok: true, data: { redirectUri: "https://client.example/callback?error=access_denied&state=original" } }),
});
afterEach(cleanup);
const query = "client_id=client&scope=wiki%3Aread+wiki-drafts%3Awrite&state=original";
const show = (api = mockApi(), navigate = vi.fn()) => { render(<StrictMode><OAuthConsentPage query={query} api={api} navigate={navigate} /></StrictMode>); return { api, navigate }; };
const approve = () => screen.getByRole("button", { name: "承認" });
describe("OAuth consent", () => {
  it("creates once under StrictMode, displays candidates and approves only the explicit selection", async () => {
    const { api, navigate } = show();
    await screen.findByText("ChatGPT");
    expect(api.start).toHaveBeenCalledOnce();
    expect(approve()).toBeDisabled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/現在または将来/)).toBeInTheDocument();
    expect(screen.getByText(/下書き Wiki の作成・編集/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/下書き Wiki の作成・編集/));
    fireEvent.click(approve());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://client.example/callback?code=code&state=original"));
    expect(api.approve).toHaveBeenCalledWith("returned-id", ["wiki-drafts:write"], "ja");
  });
  it("selects all candidates for approval", async () => {
    const { api, navigate } = show();
    await screen.findByText("ChatGPT");
    expect(screen.getByRole("button", { name: "全解除" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "全選択" }));
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).toBeChecked();
    expect(screen.getByRole("button", { name: "全選択" })).toBeDisabled();
    fireEvent.click(approve());
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(api.approve).toHaveBeenCalledWith("returned-id", ["wiki:read", "wiki-drafts:write"], "ja");
  });
  it("clears all selections and allows a fresh individual selection", async () => {
    const { api } = show();
    await screen.findByText("ChatGPT");
    fireEvent.click(screen.getByRole("button", { name: "全選択" }));
    fireEvent.click(screen.getByRole("button", { name: "全解除" }));
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).not.toBeChecked();
    expect(approve()).toBeDisabled();
    expect(screen.getByRole("button", { name: "全解除" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "全選択" })).toBeEnabled();
    expect(api.approve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText(/公開 Wiki の取得/));
    fireEvent.click(approve());
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith("returned-id", ["wiki:read"], "ja"));
  });
  it("offers cancellation back to the app with no candidates", async () => {
    const api = mockApi(); api.start.mockResolvedValue({ ok: true, data: detail([]) });
    const { navigate } = show(api);
    await screen.findByText("ChatGPT");
    expect(screen.queryByRole("button", { name: "承認" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "許可できる操作がありません" })).toBeInTheDocument();
    expect(screen.getByText("キャンセルして、ユーザー設定で権限を追加してから、もう一度お試しください。")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://client.example/callback?error=access_denied&state=original"));
    expect(api.deny).toHaveBeenCalledWith("returned-id", "ja");
  });
  it("refreshes the same request after a settings change and clears stale selections", async () => {
    const api = mockApi(); api.approve.mockResolvedValue({ ok: false, status: 400, message: "internal" });
    show(api); await screen.findByText("ChatGPT");
    fireEvent.click(screen.getByLabelText(/公開 Wiki の取得/)); fireEvent.click(approve());
    await screen.findByText(/許可設定が変更/);
    expect(api.get).toHaveBeenCalledWith("returned-id", "ja");
    expect(screen.queryByRole("button", { name: "承認" })).not.toBeInTheDocument(); expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(api.start).toHaveBeenCalledOnce();
  });
  it.each([404, 409, 403, 401, 419, 500])("handles status %i without repeating creation or exposing backend messages", async (status) => {
    const api = mockApi(); api.approve.mockResolvedValue({ ok: false, status, message: "secret trace" });
    show(api); await screen.findByText("ChatGPT");
    fireEvent.click(screen.getByLabelText(/公開 Wiki の取得/)); fireEvent.click(approve());
    await screen.findByRole("alert");
    expect(screen.queryByText(/secret trace/)).not.toBeInTheDocument();
    expect(api.start).toHaveBeenCalledOnce();
    if (status === 404 || status === 409 || status === 403) expect(screen.getByRole("button", { name: "認可をやり直す" })).toBeInTheDocument();
    if (status === 401 || status === 419) expect(screen.getByRole("link", { name: "ログイン" })).toHaveAttribute("href", `/login?returnTo=${encodeURIComponent(`/auth/oauth/authorize?${query}`)}`);
  });
  it("requires explicit new consent after a changed candidate list", async () => {
    const api = mockApi(); api.approve.mockResolvedValueOnce({ ok: false, status: 400, message: "changed" });
    api.get.mockResolvedValue({ ok: true, data: detail(["wiki-drafts:read"]) });
    show(api); await screen.findByText("ChatGPT");
    fireEvent.click(screen.getByLabelText(/公開 Wiki の取得/)); fireEvent.click(approve());
    await screen.findByLabelText(/下書き Wiki の取得/);
    expect(screen.getByLabelText(/下書き Wiki の取得/)).not.toBeChecked(); expect(approve()).toBeDisabled();
    expect(screen.queryByLabelText(/公開 Wiki の取得/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/下書き Wiki の取得/)); fireEvent.click(approve());
    await waitFor(() => expect(api.approve).toHaveBeenLastCalledWith("returned-id", ["wiki-drafts:read"], "ja"));
  });
  it("locks both operations during submission and ignores late results after unmount", async () => {
    const api = mockApi(); let resolve: (value: unknown) => void = () => undefined;
    api.approve.mockReturnValue(new Promise((done) => { resolve = done; }));
    const navigate = vi.fn(); const view = render(<OAuthConsentPage query={query} api={api} navigate={navigate} />);
    await screen.findByText("ChatGPT"); fireEvent.click(screen.getByLabelText(/公開 Wiki の取得/)); fireEvent.click(approve());
    expect(screen.getByRole("button", { name: "全選択" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "全解除" })).toBeDisabled();
    fireEvent.click(approve()); fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(api.approve).toHaveBeenCalledOnce(); expect(api.deny).not.toHaveBeenCalled();
    view.unmount(); resolve({ ok: true, data: { redirectUri: "https://client.example/callback" } });
    await waitFor(() => expect(navigate).not.toHaveBeenCalled());
  });
  it("does not submit expired details", async () => {
    const api = mockApi(); api.start.mockResolvedValue({ ok: true, data: { ...detail(), expiresAt: "2020-01-01T00:00:00Z" } });
    show(api); await screen.findByText("ChatGPT");
    await waitFor(() => {
      expect(approve()).toBeDisabled();
      expect(screen.getByRole("button", { name: "全選択" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "全解除" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "キャンセル" })).toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" })); expect(api.deny).not.toHaveBeenCalled();
  });
  it.each(["en", "ko"] as const)("localizes the consent page in %s", async (locale) => {
    render(<I18nProvider initialLocale={locale}><OAuthConsentPage query={query} api={mockApi()} navigate={vi.fn()} /></I18nProvider>);
    await screen.findByText("ChatGPT"); expect(screen.queryByRole("button", { name: "承認" })).not.toBeInTheDocument();
  });
});

it("rechecks consent after verification and requires a fresh explicit selection", async () => {
  const api = mockApi();
  api.approve.mockResolvedValue({ ok: false, status: 401, code: "recent_authentication_required", message: "Verify" });
  api.get.mockResolvedValue({ ok: true, data: detail() });
  const { navigate } = show(api);
  await screen.findByText("ChatGPT");
  fireEvent.click(screen.getByRole("button", { name: "全選択" }));
  fireEvent.click(approve());
  fireEvent.click(await screen.findByRole("button", { name: "Verify authorization" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Verify authorization" })).not.toBeInTheDocument());
  expect(approve()).toBeDisabled();
  expect(api.approve).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();
  expect(screen.queryByRole("link", { name: "ログイン" })).not.toBeInTheDocument();
});
it("retains the original OAuth query before SSO verification", async () => {
  const api = mockApi();
  api.approve.mockResolvedValue({ ok: false, status: 401, code: "recent_authentication_required", message: "Verify" });
  show(api);
  await screen.findByText("ChatGPT");
  fireEvent.click(screen.getByRole("button", { name: "全選択" }));
  fireEvent.click(approve());
  fireEvent.click(await screen.findByRole("button", { name: "SSO redirect" }));
  expect(sessionStorage.getItem("oauth-step-up-query")).toBe(query);
  sessionStorage.clear();
});
