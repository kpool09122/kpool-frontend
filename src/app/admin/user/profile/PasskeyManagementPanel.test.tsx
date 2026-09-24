import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { webAuthnBrowserAdapter } from "@/gateways/auth/webAuthnBrowserAdapter";
import { passkeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";
import { PasskeyManagementPanel } from "./PasskeyManagementPanel";

const passkey = {
  passkeyIdentifier: "11111111-1111-4111-8111-111111111111",
  displayName: "MacBook",
  transports: ["internal"],
  backupEligible: true,
  backupState: true,
  lastUsedAt: "2026-09-24T09:00:00Z",
  createdAt: "2026-09-01T09:00:00Z",
};

const options = {
  challengeKey: "22222222-2222-4222-8222-222222222222",
  options: {
    rp: { name: "kpool", id: "example.test" }, user: { name: "member", id: "AQID", displayName: "Member" }, challenge: "AQID",
    pubKeyCredParams: [{ type: "public-key", alg: -7 }], timeout: 60000, excludeCredentials: [],
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" }, attestation: "none",
  },
};
const credential = {
  id: "credential-id", rawId: "AQID", type: "public-key" as const,
  response: { clientDataJSON: "AQID", attestationObject: "AQID", transports: ["internal"] },
  authenticatorAttachment: null, clientExtensionResults: {},
};

const renderPanel = (overrides: Partial<typeof passkeyBrowserApi> = {}) => {
  const api = {
    ...passkeyBrowserApi,
    list: vi.fn().mockResolvedValue({ ok: true, data: { passkeys: [passkey] } }),
    ...overrides,
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <PasskeyManagementPanel
        api={api}
        webAuthnAdapter={{ ...webAuthnBrowserAdapter, isSupported: () => true, create: vi.fn().mockResolvedValue({ ok: true, credential }) }}
      />
    </QueryClientProvider>,
  );
  return api;
};

describe("PasskeyManagementPanel", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("lists only user-facing passkey metadata", async () => {
    renderPanel();
    expect(await screen.findByDisplayValue("MacBook")).toBeInTheDocument();
    expect(screen.getByText("登録日時")).toBeInTheDocument();
    expect(screen.getByText("最終利用日時")).toBeInTheDocument();
    expect(screen.queryByText(passkey.passkeyIdentifier)).not.toBeInTheDocument();
  });

  it("creates a credential and adds a passkey", async () => {
    const createAdditionOptions = vi.fn().mockResolvedValue({ ok: true, data: options });
    const add = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const api = renderPanel({ createAdditionOptions, add });
    await screen.findByDisplayValue("MacBook");
    fireEvent.change(screen.getAllByLabelText("パスキー名")[0] as HTMLElement, { target: { value: "Security key" } });
    fireEvent.click(screen.getByRole("button", { name: "パスキーを追加" }));

    await waitFor(() => expect(add).toHaveBeenCalledWith({ challengeKey: options.challengeKey, displayName: "Security key", credential }));
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("パスキーを追加しました。")).toBeInTheDocument();
  });

  it("renames a passkey", async () => {
    const update = vi.fn().mockResolvedValue({ ok: true, data: {} });
    renderPanel({ update });
    const input = await screen.findByDisplayValue("MacBook");
    fireEvent.change(input, { target: { value: "Work laptop" } });
    fireEvent.click(screen.getByRole("button", { name: "名称を変更" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(passkey.passkeyIdentifier, { displayName: "Work laptop" }));
  });

  it("confirms and deletes a passkey", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const deletePasskey = vi.fn().mockResolvedValue({ ok: true, data: {} });
    renderPanel({ delete: deletePasskey });
    await screen.findByDisplayValue("MacBook");
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    await waitFor(() => expect(deletePasskey).toHaveBeenCalledWith(passkey.passkeyIdentifier));
    expect(window.confirm).toHaveBeenCalledWith("MacBook を削除しますか？");
  });

  it("explains a 409 rejection for the last authentication method", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPanel({ delete: vi.fn().mockResolvedValue({ ok: false, status: 409, message: "Conflict" }) });
    await screen.findByDisplayValue("MacBook");
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("最後の認証手段は削除できません");
  });
});
