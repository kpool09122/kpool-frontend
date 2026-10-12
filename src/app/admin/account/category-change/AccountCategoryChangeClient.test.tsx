import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "../../../../i18n/dictionaries";
import { AccountSectionProvider } from "../AccountSectionContext";
import { AccountCategoryChangeClient } from "./AccountCategoryChangeClient";

const accountId = "11111111-1111-4111-8111-111111111111";
const account = {
  accountIdentifier: accountId,
  name: "Test",
  email: "test@example.com",
  type: "individual",
  status: "active",
  accountCategory: "general",
};
const pending = {
  requestIdentifier: "22222222-2222-4222-8222-222222222222",
  accountIdentifier: accountId,
  currentAccountCategory: "general",
  requestedAccountCategory: "agency",
  status: "pending",
  requestedAt: "2026-10-12T00:00:00Z",
};
const t = dictionaries.ja.admin;
const clientElement = (
  identifier: string | null = accountId,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) => (
  <QueryClientProvider client={client}>
    <AccountSectionProvider
      value={{
        accountIdentifier: identifier,
        accountPrincipalIdentifier: null,
        canEdit: false,
        canInvite: false,
        canManageCategoryChangeRequests: false,
        canManagePrincipalGroups: false,
        canRequestAffiliation: false,
        canRequestDelegation: false,
        canApproveDelegations: false,
        canRejectDelegations: false,
        canReceiveAffiliationRequests: false,
        canApproveAffiliations: false,
        canRejectAffiliations: false,
        onAuthorizationRejected: vi.fn(),
        t,
      }}
    >
      <AccountCategoryChangeClient />
    </AccountSectionProvider>
  </QueryClientProvider>
);
const renderClient = (
  identifier: string | null = accountId,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) => render(clientElement(identifier, client));

describe("AccountCategoryChangeClient", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.cookie = "XSRF-TOKEN=; Max-Age=0";
  });
  it("only displays the authoritative current category after approval", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            Response.json(
              url.endsWith("/latest")
                ? { request: { ...pending, status: "approved" } }
                : { ...account, accountCategory: "agency" },
            ),
          ),
        ),
    );
    renderClient();
    expect(await screen.findByText("事務所")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("radio")).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("一般")).not.toBeInTheDocument();
    expect(screen.queryByText(pending.requestedAt)).not.toBeInTheDocument();
  });
  it("withdraws pending and uses the refetched null to allow a new request", async () => {
    document.cookie = "XSRF-TOKEN=test";
    let latest: unknown = pending;
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          latest = null;
          return Promise.resolve(
            Response.json({ ...pending, status: "withdrawn" }),
          );
        }
        return Promise.resolve(
          Response.json(
            url.endsWith("/latest") ? { request: latest } : account,
          ),
        );
      });
    vi.stubGlobal("fetch", fetchMock);
    renderClient();
    fireEvent.click(
      await screen.findByRole("button", { name: "申請を取り下げる" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "申請する" })).toBeEnabled(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/account/accounts/${accountId}/category-change-requests/${pending.requestIdentifier}/withdraw`,
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });
  it("blocks operations until both queries load and recovers a load error through retry", async () => {
    let fail = true;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            url.endsWith("/latest") && fail
              ? Response.json({ message: "load failed" }, { status: 500 })
              : Response.json(
                  url.endsWith("/latest") ? { request: null } : account,
                ),
          ),
        ),
    );
    renderClient();
    expect(
      screen.queryByRole("button", { name: "申請する" }),
    ).not.toBeInTheDocument();
    expect(await screen.findByText("load failed")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "再取得" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "申請する" })).toBeEnabled(),
    );
  });
  it("shows rejection reason and creates a new request then refetches pending", async () => {
    document.cookie = "XSRF-TOKEN=test";
    let latest = {
      ...pending,
      status: "rejected",
      rejectionReason: { code: "other", detail: "Please send a clearer copy" },
    };
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          latest = {
            ...latest,
            status: "pending",
            requestIdentifier: "new-request",
          };
          return Promise.resolve(Response.json(latest, { status: 201 }));
        }
        return Promise.resolve(
          Response.json(
            url.endsWith("/latest") ? { request: latest } : account,
          ),
        );
      });
    vi.stubGlobal("fetch", fetchMock);
    renderClient();
    expect(
      await screen.findByText(/Please send a clearer copy/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "タレント" }));
    fireEvent.click(screen.getByRole("button", { name: "申請する" }));
    expect(
      await screen.findByRole("button", { name: "申請を取り下げる" }),
    ).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/account/accounts/${accountId}/category-change-requests`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ requestedAccountCategory: "talent" }),
      }),
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
  it.each(["approved", "rejected"])(
    "refreshes after a withdrawal conflict when review already %s",
    async (status) => {
      document.cookie = "XSRF-TOKEN=test";
      let latest = pending;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (init?.method === "POST") {
            latest = { ...pending, status };
            return Promise.resolve(
              Response.json({ message: "already reviewed" }, { status: 422 }),
            );
          }
          return Promise.resolve(
            Response.json(
              url.endsWith("/latest")
                ? { request: latest }
                : {
                    ...account,
                    accountCategory:
                      status === "approved" && latest.status === "approved"
                        ? "agency"
                        : "general",
                  },
            ),
          );
        }),
      );
      renderClient();
      fireEvent.click(
        await screen.findByRole("button", { name: "申請を取り下げる" }),
      );
      expect(await screen.findByText("already reviewed")).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: "申請を取り下げる" }),
        ).not.toBeInTheDocument(),
      );
      if (status === "rejected")
        expect(screen.getByRole("button", { name: "申請する" })).toBeEnabled();
      else {
        expect(screen.queryByRole("radio")).not.toBeInTheDocument();
        expect(screen.getByText("事務所")).toBeInTheDocument();
      }
    },
  );
  it.each([
    null,
    {
      ...pending,
      status: "rejected",
      rejectionReason: { code: "document_expired" },
    },
  ])(
    "uses the latest eligible state after withdrawal: %j",
    async (afterWithdrawal) => {
      document.cookie = "XSRF-TOKEN=test";
      let withdrawn = false;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (init?.method === "POST") {
            withdrawn = true;
            return Promise.resolve(
              Response.json({ ...pending, status: "withdrawn" }),
            );
          }
          return Promise.resolve(
            Response.json(
              url.endsWith("/latest")
                ? { request: withdrawn ? afterWithdrawal : pending }
                : account,
            ),
          );
        }),
      );
      renderClient();
      fireEvent.click(
        await screen.findByRole("button", { name: "申請を取り下げる" }),
      );
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "申請する" })).toBeEnabled(),
      );
      if (afterWithdrawal)
        expect(screen.getByText(/期限切れ/)).toBeInTheDocument();
    },
  );
  it.each(["submit", "withdraw"])(
    "keeps committed %s distinct from failed refresh and blocks stale editing",
    async (action) => {
      document.cookie = "XSRF-TOKEN=test";
      let committed = false;
      let recover = false;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string, init?: RequestInit) => {
          if (init?.method === "POST") {
            committed = true;
            return Promise.resolve(
              Response.json({
                ...pending,
                status: action === "submit" ? "pending" : "withdrawn",
              }),
            );
          }
          if (url.endsWith("/latest"))
            return Promise.resolve(
              committed && !recover
                ? Response.json({ message: "refresh failed" }, { status: 500 })
                : Response.json({
                    request: committed
                      ? action === "submit"
                        ? pending
                        : null
                      : action === "submit"
                        ? null
                        : pending,
                  }),
            );
          return Promise.resolve(Response.json(account));
        }),
      );
      renderClient();
      fireEvent.click(
        await screen.findByRole("button", {
          name: action === "submit" ? "申請する" : "申請を取り下げる",
        }),
      );
      expect(await screen.findByText("refresh failed")).toBeInTheDocument();
      expect(
        screen.getByText(
          action === "submit"
            ? t.accountCategoryChange.submitSucceeded
            : t.accountCategoryChange.withdrawSucceeded,
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
      const withdrawal = screen.queryByRole("button", {
        name: "申請を取り下げる",
      });
      if (withdrawal) expect(withdrawal).toBeDisabled();
      recover = true;
      fireEvent.click(screen.getByRole("button", { name: "再取得" }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", {
            name: action === "submit" ? "申請を取り下げる" : "申請する",
          }),
        ).toBeEnabled(),
      );
    },
  );
  it("does not mix a completed mutation, draft or cached request into a switched account", async () => {
    document.cookie = "XSRF-TOKEN=test";
    const secondId = "second-account";
    let finish!: (response: Response) => void;
    let latest: unknown = null;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST")
          return new Promise<Response>((resolve) => {
            finish = resolve;
          });
        if (url.includes(secondId))
          return Promise.resolve(
            Response.json(
              url.endsWith("/latest")
                ? {
                    request: {
                      ...pending,
                      accountIdentifier: secondId,
                      status: "approved",
                    },
                  }
                : {
                    ...account,
                    accountIdentifier: secondId,
                    accountCategory: "talent",
                  },
            ),
          );
        return Promise.resolve(
          Response.json(
            url.endsWith("/latest") ? { request: latest } : account,
          ),
        );
      }),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const first = renderClient(accountId, client);
    fireEvent.click(await screen.findByRole("button", { name: "申請する" }));
    await waitFor(() => expect(finish).toBeDefined());
    first.rerender(clientElement(secondId, client));
    expect(await screen.findByText("タレント")).toBeInTheDocument();
    latest = pending;
    finish(Response.json(pending));
    await waitFor(() =>
      expect(client.getMutationCache().getAll()[0].state.status).toBe(
        "success",
      ),
    );
    expect(
      screen.queryByText(t.accountCategoryChange.submitSucceeded),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "申請を取り下げる" }),
    ).not.toBeInTheDocument();
    first.rerender(clientElement(accountId, client));
    expect(
      await screen.findByRole("button", { name: "申請を取り下げる" }),
    ).toBeEnabled();
    expect(
      screen.queryByText(t.accountCategoryChange.submitSucceeded),
    ).not.toBeInTheDocument();
  });
  it.each(["submit", "withdraw"])(
    "shows %s failure without a false success and refreshes before retry",
    async (action) => {
      document.cookie = ["XSRF-TOKEN", "test"].join("=");
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockImplementation((url: string, init?: RequestInit) =>
            Promise.resolve(
              init?.method === "POST"
                ? Response.json({ message: "mutation failed" }, { status: 500 })
                : Response.json(
                    url.endsWith("/latest")
                      ? { request: action === "submit" ? null : pending }
                      : account,
                  ),
            ),
          ),
      );
      renderClient();
      fireEvent.click(
        await screen.findByRole("button", {
          name: action === "submit" ? "申請する" : "申請を取り下げる",
        }),
      );
      expect(await screen.findByText("mutation failed")).toBeInTheDocument();
      expect(
        screen.queryByText(t.accountCategoryChange.submitSucceeded),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(t.accountCategoryChange.withdrawSucceeded),
      ).not.toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getByRole("button", {
            name: action === "submit" ? "申請する" : "申請を取り下げる",
          }),
        ).toBeEnabled(),
      );
    },
  );
  it("blocks all operations while the post-mutation refetch is in flight", async () => {
    document.cookie = ["XSRF-TOKEN", "test"].join("=");
    let committed = false;
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          committed = true;
          return Promise.resolve(
            Response.json({ ...pending, status: "withdrawn" }),
          );
        }
        if (url.endsWith("/latest") && committed)
          return new Promise<Response>((resolve) => {
            finish = resolve;
          });
        return Promise.resolve(
          Response.json(
            url.endsWith("/latest") ? { request: pending } : account,
          ),
        );
      }),
    );
    renderClient();
    fireEvent.click(
      await screen.findByRole("button", { name: "申請を取り下げる" }),
    );
    await waitFor(() => expect(finish).toBeDefined());
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取り下げ中" })).toBeDisabled();
    finish(Response.json({ request: null }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "申請する" })).toBeEnabled(),
    );
  });
  it("blocks submission if the Account query fails even when latest is null", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            url.endsWith("/latest")
              ? Response.json({ request: null })
              : Response.json({ message: "account failed" }, { status: 403 }),
          ),
        ),
    );
    renderClient();
    expect(await screen.findByText("account failed")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "申請する" }),
    ).not.toBeInTheDocument();
  });
  it("makes no request without an account scope", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderClient(null);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(t.accountSettingsUnavailable)).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
  it("disallows requesting the current category and offers only agency/talent", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            Response.json(
              url.endsWith("/latest")
                ? { request: null }
                : { ...account, accountCategory: "agency" },
            ),
          ),
        ),
    );
    renderClient();
    await screen.findByRole("radio", { name: /事務所/ });
    expect(screen.getByRole("button", { name: "申請する" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /事務所/ })).toBeDisabled();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    fireEvent.click(screen.getByRole("radio", { name: "タレント" }));
    expect(screen.getByRole("button", { name: "申請する" })).toBeEnabled();
  });
  it("shows pending details instead of the application form without management permission", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            Response.json(
              url.endsWith("/latest") ? { request: pending } : account,
            ),
          ),
        ),
    );
    renderClient();
    expect(await screen.findByText(pending.requestedAt)).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "申請を取り下げる" }),
    ).toBeEnabled();
  });
});
