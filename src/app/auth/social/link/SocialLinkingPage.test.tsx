import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/gateways/auth/authStore";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SocialLinkingPage } from "./SocialLinkingPage";

const session = () => ({ provider: "google", email: "member@example.com", expiresAt: new Date(Date.now() + 600_000).toISOString() });
const apiMock = () => ({
  get: vi.fn().mockResolvedValue({ ok: true, data: session() }),
  sendEmail: vi.fn().mockResolvedValue({ ok: true, data: { accepted: true } }),
  verifyEmail: vi.fn().mockResolvedValue({ ok: true, data: { redirectUrl: "/wiki/ja/example?tab=edit" } }),
});
const failure = { ok: false, status: 422, message: "private backend details" };
const originalRefresh = useAuthStore.getState().refreshIdentity;
const submitCode = () => {
  fireEvent.change(screen.getByLabelText("確認コード"), { target: { value: "012345" } });
  fireEvent.click(screen.getByRole("button", { name: "確認して連携・ログイン" }));
};

describe("SocialLinkingPage", () => {
  beforeEach(() => useAuthStore.setState({ refreshIdentity: vi.fn().mockResolvedValue(null) }));
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    useAuthStore.setState({ refreshIdentity: originalRefresh });
  });

  it("loads the fixed target without sending email until requested", async () => {
    const api = apiMock();
    render(<SocialLinkingPage api={api} />);
    expect(await screen.findByText("member@example.com")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(api.sendEmail).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "確認コードを送信" }));
    expect(await screen.findByRole("status")).toHaveTextContent("送信リクエストを受け付けました");
    expect(api.sendEmail).toHaveBeenCalledWith("ja");
    expect(screen.getByRole("button", { name: /再送まであと/ })).toBeDisabled();
  });

  it("refreshes authentication and follows the return path after verification, including after a page reload", async () => {
    const api = apiMock();
    const navigate = vi.fn();
    render(<SocialLinkingPage api={api} navigate={navigate} />);
    await screen.findByLabelText("確認コード");
    submitCode();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/wiki/ja/example?tab=edit"));
    expect(api.verifyEmail).toHaveBeenCalledWith("012345", "ja");
    expect(useAuthStore.getState().refreshIdentity).toHaveBeenCalledOnce();
    expect(api.sendEmail).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/\n/evil.example"])("rejects an unsafe return path %s", async (redirectUrl) => {
    const api = apiMock();
    api.verifyEmail.mockResolvedValue({ ok: true, data: { redirectUrl } });
    const navigate = vi.fn();
    render(<SocialLinkingPage api={api} navigate={navigate} />);
    await screen.findByLabelText("確認コード");
    submitCode();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/admin"));
  });

  it("does not repeat consumed verification when refreshing authentication fails", async () => {
    useAuthStore.setState({ refreshIdentity: vi.fn().mockRejectedValue(new Error("network")) });
    const api = apiMock();
    const navigate = vi.fn();
    render(<SocialLinkingPage api={api} navigate={navigate} />);
    await screen.findByLabelText("確認コード");
    submitCode();
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
    expect(api.verifyEmail).toHaveBeenCalledOnce();
  });

  it("allows retrying an incorrect code while the pending session remains valid", async () => {
    const api = apiMock();
    api.verifyEmail.mockResolvedValueOnce(failure);
    const navigate = vi.fn();
    render(<SocialLinkingPage api={api} navigate={navigate} />);
    await screen.findByLabelText("確認コード");
    submitCode();
    expect(await screen.findByRole("alert")).toHaveTextContent("コードを確認して再度お試しください");
    expect(screen.queryByText(failure.message)).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "確認して連携・ログイン" })).toBeEnabled());
    submitCode();
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
  });

  it("requires restarting OAuth when verification exhausts or consumes the session", async () => {
    const api = apiMock();
    api.get.mockResolvedValueOnce({ ok: true, data: session() }).mockResolvedValue(failure);
    api.verifyEmail.mockResolvedValue(failure);
    render(<SocialLinkingPage api={api} />);
    await screen.findByLabelText("確認コード");
    submitCode();
    expect(await screen.findByRole("alert")).toHaveTextContent("SSOログインをやり直してください");
    expect(screen.getByRole("button", { name: "確認コードを送信" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "ログインへ戻る" })).toHaveAttribute("href", "/login");
  });

  it("shows a restart link for an absent session without showing the form", async () => {
    const api = apiMock();
    api.get.mockResolvedValue(failure);
    render(<SocialLinkingPage api={api} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("SSOログインをやり直してください");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(api.sendEmail).not.toHaveBeenCalled();
  });

  it("expires an open page and enables resending only after sixty seconds", async () => {
    vi.useFakeTimers();
    const api = apiMock();
    render(<SocialLinkingPage api={api} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "確認コードを送信" }));
    await act(async () => {});
    expect(screen.getByRole("button", { name: /再送まであと/ })).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(60_000); });
    fireEvent.click(screen.getByRole("button", { name: "確認コードを再送" }));
    await act(async () => {});
    expect(api.sendEmail).toHaveBeenCalledTimes(2);
    await act(async () => { vi.advanceTimersByTime(540_000); });
    expect(screen.getByRole("alert")).toHaveTextContent("SSOログインをやり直してください");
    expect(screen.getByRole("button", { name: "確認コードを再送" })).toBeDisabled();
    expect(screen.getByLabelText("確認コード")).toBeDisabled();
  });

  it("allows a send retry after a network error and prevents duplicate requests", async () => {
    const api = apiMock();
    api.sendEmail.mockRejectedValueOnce(new Error("network"));
    render(<SocialLinkingPage api={api} />);
    await screen.findByLabelText("確認コード");
    const button = screen.getByRole("button", { name: "確認コードを送信" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("確認コードを送信できませんでした");
    expect(api.sendEmail).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "確認コードを送信" }));
    expect(await screen.findByRole("status")).toHaveTextContent("送信リクエストを受け付けました");
  });

  it("does not submit a non-numeric code", async () => {
    const api = apiMock();
    render(<SocialLinkingPage api={api} />);
    const input = await screen.findByLabelText("確認コード");
    fireEvent.change(input, { target: { value: "abcdef" } });
    expect(screen.getByRole("button", { name: "確認して連携・ログイン" })).toBeDisabled();
    fireEvent.submit(input.closest("form")!);
    expect(api.verifyEmail).not.toHaveBeenCalled();
  });

  it("uses the selected language for requests and copy", async () => {
    const api = apiMock();
    render(<I18nProvider initialLocale="en"><SocialLinkingPage api={api} /></I18nProvider>);
    expect(await screen.findByText("member@example.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confirm SSO linking" })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("en");
  });
});
