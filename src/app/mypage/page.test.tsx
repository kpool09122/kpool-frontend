import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MyPageClient, type MyPagePrincipalAdapter } from "./MyPageClient";

const identity = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  username: "member",
  email: "member@example.com",
  language: "ja",
  accountIdentifier: "22222222-2222-2222-2222-222222222222",
};

const principal = {
  principalIdentifier: "33333333-3333-3333-3333-333333333333",
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  isDelegatedPrincipal: false,
  isEnabled: true,
};

const createAdapter = (
  overrides: Partial<MyPagePrincipalAdapter> = {},
): MyPagePrincipalAdapter => ({
  getCurrentPrincipal: vi.fn().mockResolvedValue({
    status: "available",
    principal,
  }),
  createPrincipal: vi.fn().mockResolvedValue({
    status: "available",
    principal,
  }),
  ...overrides,
});

describe("MyPageClient", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the sidebar and keeps Wiki selectable", () => {
    render(<MyPageClient initialIdentity={identity} principalAdapter={createAdapter()} />);

    expect(screen.getByRole("complementary", { name: "マイページメニュー" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "概要" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Wiki" })).toBeInTheDocument();
  });

  it("loads the current principal when Wiki is selected", async () => {
    const adapter = createAdapter();

    render(<MyPageClient initialIdentity={identity} principalAdapter={adapter} />);
    fireEvent.click(screen.getByRole("button", { name: "Wiki" }));

    expect(screen.getByText("Wiki principal を確認中")).toBeInTheDocument();
    expect(await screen.findByText("Wiki collaborator が有効です")).toBeInTheDocument();
    expect(screen.getByText(principal.principalIdentifier)).toBeInTheDocument();
    expect(adapter.getCurrentPrincipal).toHaveBeenCalledOnce();
  });

  it("shows the activation guide when the current principal is missing", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({ status: "missing" }),
    });

    render(<MyPageClient initialIdentity={identity} principalAdapter={adapter} />);
    fireEvent.click(screen.getByRole("button", { name: "Wiki" }));

    expect(
      await screen.findByRole("heading", { name: "Wiki collaborator を有効化" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("この機能を有効にするには Wiki のコラボレータになる必要があります。"),
    ).toBeInTheDocument();
  });

  it("creates a principal and updates the page immediately", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({ status: "missing" }),
      createPrincipal: vi.fn().mockResolvedValue({ status: "available", principal }),
    });

    render(<MyPageClient initialIdentity={identity} principalAdapter={adapter} />);
    fireEvent.click(screen.getByRole("button", { name: "Wiki" }));
    fireEvent.click(await screen.findByRole("button", { name: "Wiki collaborator を有効化" }));

    await waitFor(() =>
      expect(adapter.createPrincipal).toHaveBeenCalledWith({
        identityIdentifier: "11111111-1111-1111-1111-111111111111",
        accountIdentifier: "22222222-2222-2222-2222-222222222222",
      }),
    );
    expect(await screen.findByText("Wiki collaborator が有効です")).toBeInTheDocument();
  });

  it("shows a retry path when the principal lookup fails", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({
        status: "error",
        message: "Wiki principal request failed with status 500.",
      }),
    });

    render(<MyPageClient initialIdentity={identity} principalAdapter={adapter} />);
    fireEvent.click(screen.getByRole("button", { name: "Wiki" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Wiki principal request failed with status 500.",
    );
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
  });

  it("does not submit principal creation when accountIdentifier is unavailable", async () => {
    const adapter = createAdapter({
      getCurrentPrincipal: vi.fn().mockResolvedValue({ status: "missing" }),
    });
    const identityWithoutAccount = {
      identityIdentifier: "11111111-1111-1111-1111-111111111111",
      username: "member",
      email: "member@example.com",
      language: "ja",
    };

    render(
      <MyPageClient
        initialIdentity={identityWithoutAccount}
        principalAdapter={adapter}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Wiki" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "principal 作成に必要な accountIdentifier を取得できません。",
    );
    expect(screen.getByRole("button", { name: "Wiki collaborator を有効化" })).toBeDisabled();
    expect(adapter.createPrincipal).not.toHaveBeenCalled();
  });
});
