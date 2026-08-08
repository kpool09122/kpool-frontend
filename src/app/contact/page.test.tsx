import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchAuthenticatedIdentity } from "@/gateways/identity/authIdentity";
import { I18nProvider } from "../../i18n/I18nProvider";
import Page from "./page";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    toString: vi.fn(() => "session=contact-test"),
  })),
}));

vi.mock("@/gateways/identity/authIdentity", () => ({
  fetchAuthenticatedIdentity: vi.fn(),
}));

describe("contact page", () => {
  beforeEach(() => {
    vi.mocked(fetchAuthenticatedIdentity).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("passes the authenticated identity to the form", async () => {
    vi.mocked(fetchAuthenticatedIdentity).mockResolvedValue({
      email: "member@example.com",
      identityIdentifier: "identity-1",
      identityName: "member",
      language: "ja",
      profileImage: null,
    });

    render(
      <I18nProvider initialLocale="ja">
        {await Page()}
      </I18nProvider>,
    );

    expect(fetchAuthenticatedIdentity).toHaveBeenCalledWith({
      cookieHeader: "session=contact-test",
    });
    expect(screen.getByLabelText("お名前")).toHaveValue("member");
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("member@example.com");
  });

  it("renders empty identity fields for a guest", async () => {
    vi.mocked(fetchAuthenticatedIdentity).mockResolvedValue(null);

    render(
      <I18nProvider initialLocale="ja">
        {await Page()}
      </I18nProvider>,
    );

    expect(screen.getByLabelText("お名前")).toHaveValue("");
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("");
  });
});
