import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OAuthConsentPage } from "./OAuthConsentPage";
import { I18nProvider } from "@/i18n/I18nProvider";

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
    expect(screen.getByText(/現在または将来/)).toBeInTheDocument();
    expect(screen.getByText(/自動作成は含みません/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/wiki-drafts:write/));
    fireEvent.click(approve());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://client.example/callback?code=code&state=original"));
    expect(api.approve).toHaveBeenCalledWith("returned-id", ["wiki-drafts:write"], "ja");
  });
  it("keeps cancellation and settings available with no candidates", async () => {
    const api = mockApi(); api.start.mockResolvedValue({ ok: true, data: detail([]) });
    const { navigate } = show(api);
    await screen.findByText("ChatGPT");
    expect(approve()).toBeDisabled();
    expect(screen.getByRole("link", { name: "許可 Scope の設定" })).toHaveAttribute("href", "/admin/user/security");
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://client.example/callback?error=access_denied&state=original"));
    expect(api.deny).toHaveBeenCalledWith("returned-id", "ja");
  });
  it("refreshes the same request after a settings change and clears stale selections", async () => {
    const api = mockApi(); api.approve.mockResolvedValue({ ok: false, status: 400, message: "internal" });
    show(api); await screen.findByText("ChatGPT");
    fireEvent.click(screen.getByLabelText(/wiki:read/)); fireEvent.click(approve());
    await screen.findByText(/許可設定が変更/);
    expect(api.get).toHaveBeenCalledWith("returned-id", "ja");
    expect(approve()).toBeDisabled(); expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(api.start).toHaveBeenCalledOnce();
  });
  it.each([404, 409, 403, 401, 419, 500])("handles status %i without repeating creation or exposing backend messages", async (status) => {
    const api = mockApi(); api.approve.mockResolvedValue({ ok: false, status, message: "secret trace" });
    show(api); await screen.findByText("ChatGPT");
    fireEvent.click(screen.getByLabelText(/wiki:read/)); fireEvent.click(approve());
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
    fireEvent.click(screen.getByLabelText(/wiki:read/)); fireEvent.click(approve());
    await screen.findByLabelText(/wiki-drafts:read/);
    expect(screen.getByLabelText(/wiki-drafts:read/)).not.toBeChecked(); expect(approve()).toBeDisabled();
    expect(screen.queryByLabelText(/wiki:read/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/wiki-drafts:read/)); fireEvent.click(approve());
    await waitFor(() => expect(api.approve).toHaveBeenLastCalledWith("returned-id", ["wiki-drafts:read"], "ja"));
  });
  it("locks both operations during submission and ignores late results after unmount", async () => {
    const api = mockApi(); let resolve: (value: unknown) => void = () => undefined;
    api.approve.mockReturnValue(new Promise((done) => { resolve = done; }));
    const navigate = vi.fn(); const view = render(<OAuthConsentPage query={query} api={api} navigate={navigate} />);
    await screen.findByText("ChatGPT"); fireEvent.click(screen.getByLabelText(/wiki:read/)); fireEvent.click(approve());
    fireEvent.click(approve()); fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(api.approve).toHaveBeenCalledOnce(); expect(api.deny).not.toHaveBeenCalled();
    view.unmount(); resolve({ ok: true, data: { redirectUri: "https://client.example/callback" } });
    await waitFor(() => expect(navigate).not.toHaveBeenCalled());
  });
  it("does not submit expired details", async () => {
    const api = mockApi(); api.start.mockResolvedValue({ ok: true, data: { ...detail(), expiresAt: "2020-01-01T00:00:00Z" } });
    show(api); await screen.findByText("ChatGPT"); expect(approve()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" })); expect(api.deny).not.toHaveBeenCalled();
  });
  it.each(["en", "ko"] as const)("localizes the consent page in %s", async (locale) => {
    render(<I18nProvider initialLocale={locale}><OAuthConsentPage query={query} api={mockApi()} navigate={vi.fn()} /></I18nProvider>);
    await screen.findByText("ChatGPT"); expect(screen.queryByRole("button", { name: "承認" })).not.toBeInTheDocument();
  });
});
