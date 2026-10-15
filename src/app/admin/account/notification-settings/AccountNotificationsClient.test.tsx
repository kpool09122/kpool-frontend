import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "../../../../i18n/dictionaries";
import {
  AccountSectionProvider,
  type AccountSectionContextValue,
} from "../AccountSectionContext";
import { AccountNotificationsClient } from "./AccountNotificationsClient";
const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/gateways/account/accountNotificationApi", () => ({
  requestAccountNotificationSettings: api.request,
}));
const candidates = Array.from({ length: 6 }, (_, index) => ({
  identityIdentifier: `00000000-0000-4000-8000-00000000000${index}`,
  name: `Member ${index}`,
  email: `member${index}@example.com`,
  language: "ja",
}));
const settings = (count = 1) => ({
  candidates,
  maxRecipients: 5,
  recipients: candidates.slice(0, count).map(({ identityIdentifier }) => ({
    identityIdentifier,
    channel: "email",
  })),
});
const reject = vi.fn();
const base: AccountSectionContextValue = {
  accountIdentifier: "account-a",
  accountPrincipalIdentifier: "principal-a",
  canReadNotifications: true,
  canUpdateNotifications: true,
  canEdit: false,
  canInvite: false,
  canManagePrincipalGroups: false,
  canManageCategoryChangeRequests: false,
  canRequestAffiliation: false,
  canRequestDelegation: false,
  canApproveDelegations: false,
  canRejectDelegations: false,
  canReceiveAffiliationRequests: false,
  canApproveAffiliations: false,
  canRejectAffiliations: false,
  t: dictionaries.ja.admin,
  onAuthorizationRejected: reject,
};
const setup = (overrides: Partial<AccountSectionContextValue> = {}) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = (value: AccountSectionContextValue) => (
    <QueryClientProvider client={client}>
      <AccountSectionProvider value={value}>
        <AccountNotificationsClient />
      </AccountSectionProvider>
    </QueryClientProvider>
  );
  return { ...render(view({ ...base, ...overrides })), view };
};
const recipient = (index: number) =>
  screen.getByRole("checkbox", { name: `Member ${index}` });
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("notification settings", () => {
  it.each([0, 1])(
    "uses API limit %i for the actual member count",
    async (limit) => {
      api.request.mockResolvedValue({
        candidates: candidates.slice(0, limit),
        recipients: [],
        maxRecipients: limit,
      });
      setup();
      await screen.findByRole("button", { name: "保存" });
      expect(screen.getAllByRole("button", { name: "保存" })).toHaveLength(1);
      if (limit) {
        fireEvent.click(recipient(0));
        expect(recipient(0)).toBeChecked();
      } else expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    },
  );
  it.each([401, 403])(
    "stops after PUT authorization failure %i",
    async (status) => {
      api.request.mockResolvedValueOnce(settings());
      setup();
      await screen.findByRole("checkbox", { name: "Member 0" });
      api.request.mockRejectedValueOnce(
        Object.assign(new Error("denied"), { accountRouteStatus: status }),
      );
      fireEvent.click(screen.getByRole("button", { name: "保存" }));
      await screen.findByText(
        dictionaries.ja.admin.accountNotifications.saveFailed,
      );
      expect(reject).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    },
  );

  it("does not fetch without read access", () => {
    setup({ canReadNotifications: false });
    expect(api.request).not.toHaveBeenCalled();
  });
  it("restores creator selection and disables editing for read-only users", async () => {
    api.request.mockResolvedValue(settings());
    setup({ canUpdateNotifications: false });
    expect(
      await screen.findByRole("checkbox", { name: "Member 0" }),
    ).toBeChecked();
    expect(recipient(0)).toBeDisabled();
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
    expect(
      screen
        .getAllByRole("radio", { name: "LINE" })
        .every((item) => item.hasAttribute("disabled")),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("radio", { name: "Kakao" })
        .every((item) => item.hasAttribute("disabled")),
    ).toBe(true);
    expect(
      screen.getByText(dictionaries.ja.admin.accountNotifications.unavailable),
    ).toBeInTheDocument();
  });
  it.each([0, 1, 5])(
    "saves %i email recipients and refetches authoritative state",
    async (count) => {
      api.request.mockResolvedValue(settings(count));
      setup();
      await screen.findByRole("checkbox", { name: "Member 0" });
      api.request
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(settings(count));
      fireEvent.click(screen.getByRole("button", { name: "保存" }));
      await screen.findByText("通知設定を保存しました。");
      expect(api.request).toHaveBeenCalledWith("account-a", "ja", {
        recipients: settings(count).recipients,
      });
      expect(api.request).toHaveBeenLastCalledWith("account-a", "ja");
    },
  );
  it("enforces limit but permits deselection, reselection and clearing", async () => {
    api.request.mockResolvedValue(settings(5));
    setup();
    await screen.findByRole("checkbox", { name: "Member 0" });
    expect(recipient(5)).toBeDisabled();
    fireEvent.click(recipient(0));
    expect(recipient(5)).not.toBeDisabled();
    fireEvent.click(recipient(5));
    expect(recipient(0)).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "全解除" }));
    expect(recipient(5)).not.toBeChecked();
    api.request.mockResolvedValueOnce(null).mockResolvedValueOnce(settings(0));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await screen.findByText("通知設定を保存しました。");
    expect(api.request).toHaveBeenCalledWith("account-a", "ja", {
      recipients: [],
    });
  });
  it("selects email through the radio without toggling off the recipient", async () => {
    api.request.mockResolvedValue(settings(0));
    setup();
    const emailRadio = await screen.findByRole("radio", {
      name: "メール: member0@example.com",
    });
    fireEvent.click(emailRadio);
    expect(recipient(0)).toBeChecked();
    expect(emailRadio).toBeChecked();
    fireEvent.click(emailRadio);
    expect(recipient(0)).toBeChecked();
    fireEvent.click(recipient(0));
    expect(recipient(0)).not.toBeChecked();
    expect(emailRadio).not.toBeChecked();
  });
  it("displays load failures", async () => {
    api.request.mockRejectedValueOnce(new Error("offline"));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      dictionaries.ja.admin.accountNotifications.loadFailed,
    );
  });
  it("allows retry after save failures", async () => {
    api.request.mockResolvedValueOnce(settings());
    setup();
    await screen.findByRole("checkbox", { name: "Member 0" });
    api.request.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await screen.findByText(
      dictionaries.ja.admin.accountNotifications.saveFailed,
    );
    api.request.mockResolvedValueOnce(null).mockResolvedValueOnce(settings());
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await screen.findByText("通知設定を保存しました。");
  });
  it("distinguishes committed save from failed refresh and disables stale editing", async () => {
    api.request.mockResolvedValueOnce(settings());
    setup();
    await screen.findByRole("checkbox", { name: "Member 0" });
    api.request
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await screen.findByText(
      dictionaries.ja.admin.accountNotifications.refreshFailed,
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存" })).not.toBeInTheDocument();
  });
  it.each([401, 403])(
    "stops editing and refreshes auth on %i",
    async (status) => {
      api.request.mockRejectedValueOnce(
        Object.assign(new Error("denied"), { accountRouteStatus: status }),
      );
      setup();
      await waitFor(() => expect(reject).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    },
  );
  it("isolates drafts and late save responses when accounts change", async () => {
    api.request.mockResolvedValueOnce(settings());
    const { rerender, view } = setup();
    await screen.findByRole("checkbox", { name: "Member 0" });
    let finish: (value: null) => void = () => {};
    api.request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    api.request.mockResolvedValueOnce(settings(0));
    rerender(view({ ...base, accountIdentifier: "account-b" }));
    await waitFor(() => expect(recipient(0)).not.toBeChecked());
    finish(null);
    await waitFor(() => expect(api.request).toHaveBeenCalledTimes(3));
    expect(
      screen.queryByText("通知設定を保存しました。"),
    ).not.toBeInTheDocument();
  });
  it.each(["ja", "en", "ko"] as const)("displays %s copy", async (locale) => {
    api.request.mockResolvedValue(settings());
    setup({ t: dictionaries[locale].admin });
    await screen.findByRole("button", {
      name: dictionaries[locale].admin.accountNotifications.save,
    });
  });
});
