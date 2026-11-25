import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SnapshotChangeReview } from "./SnapshotChangeReview";
const id = "22222222-2222-4222-8222-222222222222";
const profile = { email: "a@example.com", name: "Original name", type: "individual", status: "active", phone: "123", countryCode: "JP", administrativeAreaCode: null, postalCode: "1000000", locality: null, addressLine1: "Tokyo", addressLine2: null };
const original = { snapshotIdentifier: id, accountIdentifier: id, status: "approved", savedAt: "2026-11-25T00:00:00Z", isCurrent: false, account: profile, documents: [{ documentType: "passport", uploadedAt: "2026-11-25T00:00:00Z" }] };
const request = { requestIdentifier: id, accountIdentifier: id, snapshotIdentifier: id, reviewedSnapshotIdentifier: null, changeReason: "Moved", status: "pending", requestedAt: original.savedAt, reviewedAt: null, reviewedBy: null, rejectionReason: null };
const show = (canManage = true) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SnapshotChangeReview requestId={id} accountIdentifier={id} canManage={canManage} /></QueryClientProvider>);
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("compares pinned original and proposal, and refetches rejected historic proposal without changing current", async () => {
  let rejected = false;
  const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === "POST") { rejected = true; return Response.json({ ...request, status: "rejected", reviewedSnapshotIdentifier: id }); }
    return Response.json({ request: rejected ? { ...request, status: "rejected", reviewedSnapshotIdentifier: id } : request, original, proposal: { account: { ...profile, name: "Proposed name" }, documents: original.documents } });
  });
  vi.stubGlobal("fetch", fetchMock); show();
  expect(await screen.findByText("Original name")).toBeInTheDocument(); expect(screen.getByText("Proposed name")).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /パスポート/ }).map((link) => link.getAttribute("href"))).toEqual([expect.stringContaining("source=original"), expect.stringContaining("source=proposal")]);
  fireEvent.change(screen.getByLabelText("拒否理由詳細"), { target: { value: "Please correct" } });
  fireEvent.click(screen.getByRole("button", { name: "拒否" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "承認" })).not.toBeInTheDocument());
  expect(screen.getByText("Proposed name")).toBeInTheDocument();
});
it("lets an owner read the pinned comparison without management actions", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ request, original, proposal: { account: { ...profile, name: "Proposed name" }, documents: [] } })));
  show(false); expect(await screen.findByText("Proposed name")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "承認" })).not.toBeInTheDocument();
});


it("refetches approved details and prevents repeat review after finalization", async () => {
  let approved = false;
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === "POST") { approved = true; return Response.json({ ...request, status: "approved", reviewedSnapshotIdentifier: id }); }
    return Response.json({ request: approved ? { ...request, status: "approved", reviewedSnapshotIdentifier: id } : request, original, proposal: { account: { ...profile, name: "Fixed reviewed proposal" }, documents: [] } });
  }));
  show();
  fireEvent.click(await screen.findByRole("button", { name: "承認" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "承認" })).not.toBeInTheDocument());
  expect(screen.getByText("Fixed reviewed proposal")).toBeInTheDocument();
});
it.each([403, 422, 500])("shows review failure %i without a false success", async status => {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options?: RequestInit) => options?.method === "POST" ? Response.json({ message: "Review failed" }, { status }) : Response.json({ request, original, proposal: { account: profile, documents: [] } })));
  show(); fireEvent.click(await screen.findByRole("button", { name: "承認" }));
  expect(await screen.findByText("Review failed")).toBeInTheDocument();
});
