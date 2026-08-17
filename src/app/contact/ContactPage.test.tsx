import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SubmitContactAdapter } from "@/gateways/contact/contactBrowserApi";
import { I18nProvider } from "../../i18n/I18nProvider";
import { ContactPage } from "./ContactPage";

const renderPage = (
  props: {
    initialEmail?: string;
    initialName?: string;
    submitContactAdapter?: SubmitContactAdapter;
  } = {},
) =>
  render(
    <I18nProvider initialLocale="ja">
      <ContactPage {...props} />
    </I18nProvider>,
  );

describe("ContactPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the contact fields and backend-compatible limits", () => {
    renderPage();

    expect(screen.queryByRole("link", { name: "トップページへ戻る" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "お問い合わせ" })).toBeInTheDocument();
    expect(screen.getByLabelText("お問い合わせ種別")).toHaveValue("1");
    expect(screen.getByLabelText("お名前")).toHaveAttribute("maxlength", "32");
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("お問い合わせ内容")).toHaveAttribute("maxlength", "512");
    expect(screen.getByText("0 / 512文字")).toBeInTheDocument();
  });

  it("prefills name and email for an authenticated identity", () => {
    renderPage({
      initialEmail: "member@example.com",
      initialName: "member",
    });

    expect(screen.getByLabelText("お名前")).toHaveValue("member");
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("member@example.com");
  });

  it("keeps identity fields empty for a guest", () => {
    renderPage();

    expect(screen.getByLabelText("お名前")).toHaveValue("");
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("");
  });

  it("submits the contact form and shows a success message", async () => {
    const submitContactAdapter = vi.fn<SubmitContactAdapter>().mockResolvedValue({
      ok: true,
      contact: {
        contactIdentifier: "11111111-1111-4111-8111-111111111111",
        identityIdentifier: null,
        category: 1,
        name: "member",
        email: "member@example.com",
        content: "お問い合わせ内容です。",
      },
    });
    renderPage({
      initialEmail: "member@example.com",
      initialName: "member",
      submitContactAdapter,
    });
    const content = screen.getByLabelText("お問い合わせ内容");

    fireEvent.change(content, { target: { value: "お問い合わせ内容です。" } });
    fireEvent.submit(screen.getByRole("button", { name: "送信する" }).closest("form")!);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(
      "お問い合わせを送信しました。",
    ));
    expect(submitContactAdapter).toHaveBeenCalledWith({
      locale: "ja",
      requestBody: {
        category: 1,
        content: "お問い合わせ内容です。",
        email: "member@example.com",
        name: "member",
      },
    });
    expect(screen.getByText("11 / 512文字")).toBeInTheDocument();

    fireEvent.change(content, { target: { value: "修正しました。" } });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an error when contact submission fails", async () => {
    const submitContactAdapter = vi.fn<SubmitContactAdapter>().mockResolvedValue({ ok: false });
    renderPage({
      initialEmail: "member@example.com",
      initialName: "member",
      submitContactAdapter,
    });

    fireEvent.change(screen.getByLabelText("お問い合わせ内容"), {
      target: { value: "お問い合わせ内容です。" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "送信する" }).closest("form")!);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(
      "送信できませんでした。時間をおいてもう一度お試しください。",
    ));
  });

  it("disables the form while the inquiry is being submitted", async () => {
    const submitContactAdapter = vi.fn<SubmitContactAdapter>().mockReturnValue(
      new Promise(() => undefined),
    );
    renderPage({
      initialEmail: "member@example.com",
      initialName: "member",
      submitContactAdapter,
    });

    fireEvent.change(screen.getByLabelText("お問い合わせ内容"), {
      target: { value: "お問い合わせ内容です。" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "送信する" }).closest("form")!);

    const submittingButton = await screen.findByRole("button", { name: "送信中…" });
    expect(submittingButton).toBeDisabled();
    expect(screen.getByLabelText("お問い合わせ種別")).toBeDisabled();
    expect(screen.getByLabelText("お名前")).toBeDisabled();
    expect(screen.getByLabelText("メールアドレス")).toBeDisabled();
    expect(screen.getByLabelText("お問い合わせ内容")).toBeDisabled();
    expect(submittingButton.closest("form")).toHaveAttribute("aria-busy", "true");
  });
});
