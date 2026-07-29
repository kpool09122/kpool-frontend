import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvitationAcceptPage } from "./InvitationAcceptPage";
import { useAuthStore } from "@/gateways/auth/authStore";
import { fetchCurrentAuthenticatedIdentity } from "@/gateways/identity/authIdentityBrowserApi";

const identityMocks = vi.hoisted(() => ({
  fetchCurrentAuthenticatedIdentity: vi.fn(),
}));

vi.mock("@/gateways/identity/authIdentityBrowserApi", () => ({
  fetchCurrentAuthenticatedIdentity: identityMocks.fetchCurrentAuthenticatedIdentity,
}));

const authenticatedIdentity = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  identityName: "Invited Member",
  email: "invited@example.com",
  language: "ja",
  accountIdentifier: "22222222-2222-2222-2222-222222222222",
  accountType: "corporation",
  accountEffectivePolicies: [],
};

describe("InvitationAcceptPage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      identity: null,
      status: "loading",
    });
    vi.mocked(fetchCurrentAuthenticatedIdentity).mockResolvedValue(authenticatedIdentity);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the invited email as readonly and shows invitation actions", () => {
    render(<InvitationAcceptPage token="invite-token-123" email="invited@example.com" />);

    expect(screen.getByRole("heading", { name: "招待を受諾" })).toBeInTheDocument();
    expect(screen.getByLabelText("招待メールアドレス")).toHaveValue("invited@example.com");
    expect(screen.getByLabelText("招待メールアドレス")).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Googleで招待を受諾" })).toBeInTheDocument();
    expect(screen.queryByText(/アカウント種別/)).not.toBeInTheDocument();
  });

  it("skips account creation and creates only identity with oneTimeToken", async () => {
    const createIdentity = vi.fn().mockResolvedValue({
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
      identityName: "Invited Member",
      email: "invited@example.com",
      language: "ja",
    });
    const navigate = vi.fn();

    render(
      <InvitationAcceptPage
        token="invite-token-123"
        email="invited@example.com"
        signupAdapter={{ createIdentity }}
        navigate={navigate}
      />,
    );

    fireEvent.change(screen.getByLabelText("プロフィール名"), {
      target: { value: "Invited Member" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "secret-password" },
    });
    fireEvent.change(screen.getByLabelText("確認用パスワード"), {
      target: { value: "secret-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "招待を受諾" }));

    await waitFor(() =>
      expect(createIdentity).toHaveBeenCalledWith(
        {
          identityName: "Invited Member",
          email: "invited@example.com",
          password: "secret-password",
          confirmedPassword: "secret-password",
          base64EncodedImage: null,
          oneTimeToken: "invite-token-123",
          requestLanguage: "ja",
        },
        { language: "ja" },
      ),
    );
    await waitFor(() => expect(fetchCurrentAuthenticatedIdentity).toHaveBeenCalledTimes(1));
    expect(navigate).toHaveBeenCalledWith("/admin");
  });

  it("passes oneTimeToken to social redirect acceptance", async () => {
    const socialRedirectAdapter = vi.fn().mockResolvedValue({
      ok: true,
      redirectUrl: "https://accounts.example.test/oauth",
    });
    const navigate = vi.fn();

    render(
      <InvitationAcceptPage
        token="invite-token-123"
        email="invited@example.com"
        socialRedirectAdapter={socialRedirectAdapter}
        navigate={navigate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Googleで招待を受諾" }));

    await waitFor(() =>
      expect(socialRedirectAdapter).toHaveBeenCalledWith(
        "google",
        "/admin",
        "invite-token-123",
      ),
    );
    expect(navigate).toHaveBeenCalledWith("https://accounts.example.test/oauth");
  });

  it("shows a helpful error and disables actions when token or email is missing", () => {
    render(<InvitationAcceptPage token="" email="invited@example.com" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "招待リンクに必要な token または email が見つかりません。",
    );
    expect(screen.getByRole("button", { name: "招待を受諾" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Googleで招待を受諾" })).toBeDisabled();
  });
});
