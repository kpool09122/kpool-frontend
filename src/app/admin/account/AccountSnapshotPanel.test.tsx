import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AccountSnapshotPanel } from "./AccountSnapshotPanel";
const id = "22222222-2222-4222-8222-222222222222";
const saved = { snapshotIdentifier: id, accountIdentifier: id, status: "approved", savedAt: "2026-11-25T00:00:00Z" };
const profile = { email: "a@example.com", name: "Original", type: "individual", status: "active", phone: "123", countryCode: "JP", administrativeAreaCode: "JP-13", postalCode: "1000000", locality: null, addressLine1: "Tokyo", addressLine2: null };
const snapshot = { ...saved, isCurrent: true, account: profile, documents: [{ documentType: "passport", uploadedAt: saved.savedAt }] };
const pending = { requestIdentifier: id, accountIdentifier: id, snapshotIdentifier: id, reviewedSnapshotIdentifier: null, changeReason: "Moved", status: "pending", requestedAt: saved.savedAt, reviewedAt: null, reviewedBy: null, rejectionReason: null };
const show = (accountIdentifier = id) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><AccountSnapshotPanel accountIdentifier={accountIdentifier} canEdit /></QueryClientProvider>);
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("shows an unsaved state then the saved profile without internal snapshot metadata", async () => {
  let current = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith("/latest")) return Response.json({ request: null, changeRequiresApproval: false, hasChanges: true });
    if (options?.method === "PUT") { current = true; return Response.json(saved); }
    return current ? Response.json(snapshot) : Response.json({}, { status: 404 });
  }));
  show();
  expect(await screen.findByText("未保存")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "スナップショットを保存" }));
  expect(await screen.findByText("Original")).toBeInTheDocument();
  expect(screen.getByText("a@example.com")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "パスポート" })).toHaveAttribute("src", `/api/account/accounts/${id}/snapshots/${id}/documents/passport`);
  expect(screen.getByRole("link", { name: /パスポート/ })).toHaveAttribute("href", `/api/account/accounts/${id}/snapshots/${id}/documents/passport?download=1`);
  expect(screen.queryByText(id)).not.toBeInTheDocument();
  expect(screen.queryByText("approved")).not.toBeInTheDocument();
  fireEvent.error(screen.getByRole("img", { name: "パスポート" }));
  expect(screen.queryByRole("img", { name: "パスポート" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /パスポート/ })).toBeInTheDocument();
});
it("locks save and duplicate submission while pending", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.endsWith("/latest") ? { request: pending, changeRequiresApproval: true, hasChanges: true } : snapshot)));
  show();
  expect(await screen.findByText("変更申請を審査中です。プロフィール・書類の編集と保存はできません。")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "スナップショットの変更を申請" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "変更を申請" })).not.toBeInTheDocument();
});
it("requires a reason and submits only that reason after persisted editing", async () => {
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "POST") return Response.json(pending);
    return Response.json(url.endsWith("/latest") ? { request: null, changeRequiresApproval: true, hasChanges: true } : snapshot);
  });
  vi.stubGlobal("fetch", fetchMock); show();
  const trigger = await screen.findByRole("button", { name: "スナップショットの変更を申請" });
  await waitFor(() => expect(trigger).toBeEnabled());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "スナップショットを保存" })).not.toBeInTheDocument();
  fireEvent.click(trigger);
  const submit = screen.getByRole("button", { name: "変更を申請" });
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText("変更理由"), { target: { value: "Moved" } });
  fireEvent.click(submit);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/snapshot-change-requests"), expect.objectContaining({ method: "POST", body: JSON.stringify({ changeReason: "Moved" }) })));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});


it("keeps validation failure visible, then guides a 409 response to a reasoned change", async () => {
  let invalid = true;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "PUT") return Response.json(invalid ? { message: "Required documents missing" } : { message: "Approval required", code: "account_snapshot_change_requires_approval" }, { status: invalid ? 422 : 409 });
    return Response.json(url.endsWith("/latest") ? { request: null, changeRequiresApproval: false, hasChanges: true } : snapshot);
  }));
  show();
  const save = await screen.findByRole("button", { name: "スナップショットを保存" });
  await waitFor(() => expect(save).toBeEnabled()); fireEvent.click(save);
  expect(await screen.findByText("Required documents missing")).toBeInTheDocument();
  invalid = false;
  await waitFor(() => expect(save).toBeEnabled()); fireEvent.click(save);
  const trigger = await screen.findByRole("button", { name: "スナップショットの変更を申請" });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.click(trigger);
  expect(screen.getByLabelText("変更理由")).toBeInTheDocument();
});
it("does not expose a late save result to a switched account", async () => {
  let finish: (response: Response) => void = () => undefined;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "PUT") return new Promise<Response>(resolve => { finish = resolve; });
    return url.endsWith("/latest") ? Response.json({ request: null, changeRequiresApproval: false, hasChanges: true }) : Response.json({}, { status: 404 });
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const element = (identifier: string) => <QueryClientProvider client={client}><AccountSnapshotPanel accountIdentifier={identifier} canEdit /></QueryClientProvider>;
  const view = render(element(id));
  const save = await screen.findByRole("button", { name: "スナップショットを保存" });
  await waitFor(() => expect(save).toBeEnabled());
  fireEvent.click(save);
  view.rerender(element("33333333-3333-4333-8333-333333333333"));
  finish(Response.json(saved));
  await waitFor(() => expect(screen.getByRole("button", { name: "スナップショットを保存" })).toBeEnabled());
  expect(screen.queryByText(id)).not.toBeInTheDocument(); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("closes the reason dialog on cancel without sending a request", async () => {
  const fetchMock = vi.fn(async (url: string) => Response.json(url.endsWith("/latest") ? { request: null, changeRequiresApproval: true, hasChanges: true } : snapshot));
  vi.stubGlobal("fetch", fetchMock); show();
  const trigger = await screen.findByRole("button", { name: "スナップショットの変更を申請" });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.click(trigger);
  fireEvent.change(screen.getByLabelText("変更理由"), { target: { value: "Moved" } });
  fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.every(([, options]: [string, RequestInit?]) => !options?.method || options.method === "GET")).toBe(true);
});

it("keeps the reason dialog and draft available when submission fails", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "POST") return Response.json({ message: "Unable to apply" }, { status: 422 });
    return Response.json(url.endsWith("/latest") ? { request: null, changeRequiresApproval: true, hasChanges: true } : snapshot);
  }));
  show();
  const trigger = await screen.findByRole("button", { name: "スナップショットの変更を申請" });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.click(trigger);
  fireEvent.change(screen.getByLabelText("変更理由"), { target: { value: "Moved" } });
  fireEvent.click(screen.getByRole("button", { name: "変更を申請" }));
  expect(await screen.findByText("Unable to apply")).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toContainElement(screen.getByText("Unable to apply"));
  expect(screen.getByLabelText("変更理由")).toHaveValue("Moved");
});

it.each([null, "approved", "rejected"] as const)("disables unchanged applications after %s review history", async status => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url.endsWith("/latest") ? {
    request: status ? { ...pending, status } : null,
    changeRequiresApproval: true,
    hasChanges: false,
  } : snapshot)));
  show();
  await screen.findByText("Original");
  const trigger = screen.getByRole("button", { name: "スナップショットの変更を申請" });
  expect(trigger).toBeDisabled();
  fireEvent.click(trigger);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
