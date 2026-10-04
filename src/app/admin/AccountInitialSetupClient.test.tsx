import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountInitialSetupClient } from "./AccountInitialSetupClient";

const activeIdentity = {
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  profileImage: null,
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  accountPrincipalIdentifier: "33333333-3333-4333-8333-333333333333",
  accountType: "corporation",
  accountPolicies: [],
  account: {
    accountIdentifier: "22222222-2222-4222-8222-222222222222",
    email: "member@example.com",
    type: "corporation",
    name: "Member",
    status: "active",
    accountCategory: "general",
  },
  originalAccount: null,
  delegationIdentifier: null,
  switchableAccounts: [],
  authenticationMethods: { passkeyCount: 1, linkedSocialProviders: [] },
};

describe("AccountInitialSetupClient", () => {
  afterEach(() => cleanup());

  it("defaults to individual and submits it without changing the selection", async () => {
    const completeSetup = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();
    const refreshIdentity = vi.fn().mockResolvedValue({
      ...activeIdentity,
      accountType: "individual",
      account: { ...activeIdentity.account, type: "individual" },
    });
    render(
      <AccountInitialSetupClient
        completeSetup={completeSetup}
        navigate={navigate}
        refreshIdentity={refreshIdentity}
      />,
    );

    expect(screen.getByText("確定後は区分を変更できません。内容を確認して選択してください。")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "個人" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "法人" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "区分を確定してサービスを開始" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/admin"));
    expect(completeSetup).toHaveBeenCalledWith({
      fallbackErrorMessage: expect.any(String),
      requestBody: { accountType: "individual" },
    });
  });

  it("submits once, refreshes identity after 204, and continues only after active is confirmed", async () => {
    const completeSetup = vi.fn().mockResolvedValue(undefined);
    const refreshIdentity = vi.fn().mockResolvedValue(activeIdentity);
    const navigate = vi.fn();
    render(
      <AccountInitialSetupClient
        completeSetup={completeSetup}
        navigate={navigate}
        refreshIdentity={refreshIdentity}
        returnTo="/wiki/ja/example"
      />,
    );

    fireEvent.click(screen.getByLabelText("法人"));
    fireEvent.click(screen.getByRole("button", { name: "区分を確定してサービスを開始" }));
    fireEvent.click(screen.getByRole("button", { name: "設定中" }));

    await waitFor(() => expect(completeSetup).toHaveBeenCalledTimes(1));
    expect(completeSetup).toHaveBeenCalledWith({
      fallbackErrorMessage: expect.any(String),
      requestBody: { accountType: "corporation" },
    });
    expect(refreshIdentity).toHaveBeenCalledWith({ preserveOnNull: true });
    expect(navigate).toHaveBeenCalledWith("/wiki/ja/example");
  });

  it("recovers from a 409 completed in another tab after refreshing identity", async () => {
    const conflict = Object.assign(new Error("already completed"), { accountRouteStatus: 409 });
    const navigate = vi.fn();
    render(
      <AccountInitialSetupClient
        completeSetup={vi.fn().mockRejectedValue(conflict)}
        navigate={navigate}
        refreshIdentity={vi.fn().mockResolvedValue(activeIdentity)}
      />,
    );

    fireEvent.click(screen.getByLabelText("法人"));
    fireEvent.click(screen.getByRole("button", { name: "区分を確定してサービスを開始" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/admin"));
  });

  it("keeps the form retryable when setup or identity refresh fails", async () => {
    const completeSetup = vi.fn()
      .mockRejectedValueOnce(new Error("通信に失敗しました"))
      .mockResolvedValueOnce(undefined);
    const refreshIdentity = vi.fn().mockResolvedValue(null);
    render(<AccountInitialSetupClient completeSetup={completeSetup} refreshIdentity={refreshIdentity} />);

    fireEvent.click(screen.getByLabelText("個人"));
    fireEvent.click(screen.getByRole("button", { name: "区分を確定してサービスを開始" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("通信に失敗しました");

    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("設定後のアカウント状態を確認できませんでした");
    expect(screen.getByRole("button", { name: "再試行" })).toBeEnabled();
  });
});
