import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { AccountSectionProvider } from "../AccountSectionContext";
import { AccountSnapshotChangeClient } from "./AccountSnapshotChangeClient";
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/account/snapshot-change-requests" }));
const show = (canManage = true) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AccountSectionProvider value={{ accountIdentifier: "22222222-2222-4222-8222-222222222222", accountPrincipalIdentifier: null, canEdit: false, canInvite: false, canManagePrincipalGroups: false, canManageCategoryChangeRequests: true, canManageSnapshotChangeRequests: canManage, canRequestAffiliation: false, canRequestDelegation: false, canApproveDelegations: false, canRejectDelegations: false, canReceiveAffiliationRequests: false, canApproveAffiliations: false, canRejectAffiliations: false, t: dictionaries.ja.admin, onAuthorizationRejected: vi.fn() }}><AccountSnapshotChangeClient management /></AccountSectionProvider></QueryClientProvider>);
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("does not fetch operations data based only on category review permission", () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); show(false);
  expect(screen.getByText("この操作の権限がありません。")).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("resets pagination when changing the status filter and fetches the authoritative list", async () => {
  const fetchMock = vi.fn(async () => Response.json({ requests: [], pagination: { currentPage: 1, lastPage: 2, perPage: 50, total: 60 } }));
  vi.stubGlobal("fetch", fetchMock); show();
  const next = await screen.findByRole("button", { name: "次へ" });
  await waitFor(() => expect(next).toBeEnabled()); fireEvent.click(next);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("page=2"), expect.anything()));
  fireEvent.change(screen.getByLabelText("審査状態"), { target: { value: "rejected" } });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("status=rejected&page=1"), expect.anything()));
});
it("opens request details from a card without displaying internal account IDs", async () => {
  const id = "22222222-2222-4222-8222-222222222222";
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    requests: [{ requestIdentifier: id, accountIdentifier: id, snapshotIdentifier: id, reviewedSnapshotIdentifier: null, changeReason: "Contact information changed", status: "pending", requestedAt: "2026-11-25T00:00:00Z", reviewedAt: null, reviewedBy: null, rejectionReason: null }],
    pagination: { currentPage: 1, lastPage: 1, perPage: 50, total: 1 },
  })));
  show();
  expect(await screen.findByRole("link", { name: /Contact information changed/ })).toHaveAttribute("href", `/admin/account/snapshot-change-requests/${id}`);
  expect(screen.queryByText(id)).not.toBeInTheDocument();
});
