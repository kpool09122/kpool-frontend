import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AccountSnapshotPanel } from "./AccountSnapshotPanel";
const id = "22222222-2222-4222-8222-222222222222";
const saved = { snapshotIdentifier: id, accountIdentifier: id, status: "approved", savedAt: "2026-11-25T00:00:00Z" };
const profile = { email: "a@example.com", name: "Original", type: "individual", status: "active", phone: "123", countryCode: "JP", administrativeAreaCode: "JP-13", postalCode: "1000000", locality: null, addressLine1: "Tokyo", addressLine2: null };
const snapshot = { ...saved, isCurrent: true, account: profile, documents: [] };
const pending = { requestIdentifier: id, accountIdentifier: id, snapshotIdentifier: id, reviewedSnapshotIdentifier: null, changeReason: "Moved", status: "pending", requestedAt: saved.savedAt, reviewedAt: null, reviewedBy: null, rejectionReason: null };
const show = (accountIdentifier = id) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><AccountSnapshotPanel accountIdentifier={accountIdentifier} canEdit /></QueryClientProvider>);
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("shows an unsaved state then the exact returned save summary", async () => {
  let current = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith("/latest")) return Response.json({ request: null, changeRequiresApproval: false });
    if (options?.method === "PUT") { current = true; return Response.json(saved); }
    return current ? Response.json(snapshot) : Response.json({}, { status: 404 });
  }));
  show();
  expect(await screen.findByText("未保存")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "スナップショットを保存" }));
  expect(await screen.findByText(id)).toBeInTheDocument();
  expect(screen.getByText("approved")).toBeInTheDocument();
});
it("locks save and duplicate submission while pending and exposes pinned request details", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.endsWith("/latest") ? { request: pending, changeRequiresApproval: true } : snapshot)));
  show();
  expect(await screen.findByText("変更申請を審査中です。プロフィール・書類の編集と保存はできません。")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "スナップショットを保存" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "変更を申請" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "申請内容・審査結果" })).toHaveAttribute("href", `/admin/account/snapshot-change/${id}`);
});
it("requires a reason and submits only that reason after persisted editing", async () => {
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "POST") return Response.json(pending);
    return Response.json(url.endsWith("/latest") ? { request: null, changeRequiresApproval: true } : snapshot);
  });
  vi.stubGlobal("fetch", fetchMock); show();
  const submit = await screen.findByRole("button", { name: "変更を申請" });
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText("変更理由"), { target: { value: "Moved" } });
  fireEvent.click(submit);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/snapshot-change-requests"), expect.objectContaining({ method: "POST", body: JSON.stringify({ changeReason: "Moved" }) })));
});


it("keeps validation failure visible, then guides a 409 response to a reasoned change", async () => {
  let invalid = true;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "PUT") return Response.json(invalid ? { message: "Required documents missing" } : { message: "Approval required", code: "account_snapshot_change_requires_approval" }, { status: invalid ? 422 : 409 });
    return Response.json(url.endsWith("/latest") ? { request: null, changeRequiresApproval: false } : snapshot);
  }));
  show();
  const save = await screen.findByRole("button", { name: "スナップショットを保存" });
  await waitFor(() => expect(save).toBeEnabled()); fireEvent.click(save);
  expect(await screen.findByText("Required documents missing")).toBeInTheDocument();
  invalid = false;
  await waitFor(() => expect(save).toBeEnabled()); fireEvent.click(save);
  expect(await screen.findByLabelText("変更理由")).toBeInTheDocument();
});
it("does not expose a late save result or reason draft to a switched account", async () => {
  let finish: (response: Response) => void = () => undefined;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "PUT") return new Promise<Response>(resolve => { finish = resolve; });
    return url.endsWith("/latest") ? Response.json({ request: null, changeRequiresApproval: true }) : Response.json({}, { status: 404 });
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const element = (identifier: string) => <QueryClientProvider client={client}><AccountSnapshotPanel accountIdentifier={identifier} canEdit /></QueryClientProvider>;
  const view = render(element(id));
  const save = await screen.findByRole("button", { name: "スナップショットを保存" });
  await waitFor(() => expect(save).toBeEnabled());
  fireEvent.change(screen.getByLabelText("変更理由"), { target: { value: "Private draft" } });
  fireEvent.click(save);
  view.rerender(element("33333333-3333-4333-8333-333333333333"));
  finish(Response.json(saved));
  await waitFor(() => expect(screen.getByRole("button", { name: "スナップショットを保存" })).toBeEnabled());
  expect(screen.queryByText(id)).not.toBeInTheDocument(); expect(screen.getByLabelText("変更理由")).toHaveValue("");
});
