import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { useAccountSnapshot } from "./useAccountSnapshot";
import { useAccountProfile } from "./profile/useAccountProfile";
import { useAccountDocuments } from "./documents/useAccountDocuments";
const id = "22222222-2222-4222-8222-222222222222";
const request = { requestIdentifier: id, accountIdentifier: id, snapshotIdentifier: id, reviewedSnapshotIdentifier: null, changeReason: "Moved", status: "pending", requestedAt: "2026-11-25T00:00:00Z", reviewedBy: null, reviewedAt: null, rejectionReason: null };
const account = { accountIdentifier: id, name: "Name", email: "a@example.com", type: "individual", status: "active", accountCategory: "general" };
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it.each(["profile", "documents"] as const)("refreshes review state after a stale %s operation receives 403 and unlocks after review", async (feature) => {
  let pending = false;
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "PUT" || options?.method === "POST") { pending = true; return Response.json({ message: "Review pending" }, { status: 403 }); }
    if (url.endsWith("/snapshot-change-requests/latest")) return Response.json({ request: pending ? request : null, changeRequiresApproval: true, hasChanges: true, categoryChangePending: false });
    return url.endsWith("/documents") ? Response.json({ documents: [] }) : url.endsWith("/snapshot") ? Response.json({}, { status: 404 }) : Response.json(account);
  });
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const localWrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => ({ profile: useAccountProfile({ accountIdentifier: id, canEdit: true, t: dictionaries.ja.admin }), documents: useAccountDocuments({ accountIdentifier: id, t: dictionaries.ja.admin }) }), { wrapper: localWrapper });
  await waitFor(() => expect(result.current.documents.canSave).toBe(true));
  act(() => feature === "profile" ? result.current.profile.saveAccount() : result.current.documents.submit());
  await waitFor(() => expect(result.current.profile.editingLocked).toBe(true));
  expect(result.current.documents.canSave).toBe(false);
  pending = false;
  await act(async () => { await client.invalidateQueries(); });
  await waitFor(() => expect(result.current.profile.editingLocked).toBe(false));
  expect(result.current.documents.canSave).toBe(true);
});
it("blocks profile updates and document saves while review is pending", async () => {
  const fetchMock = vi.fn(async (url: string) => url.endsWith("/snapshot") ? Response.json({}, { status: 404 }) : Response.json(url.endsWith("/snapshot-change-requests/latest") ? { request, changeRequiresApproval: true, hasChanges: true, categoryChangePending: false } : url.endsWith("/documents") ? { documents: [] } : account));
  vi.stubGlobal("fetch", fetchMock);
  const { result } = renderHook(() => ({ profile: useAccountProfile({ accountIdentifier: id, canEdit: true, t: dictionaries.ja.admin }), documents: useAccountDocuments({ accountIdentifier: id, t: dictionaries.ja.admin }) }), { wrapper });
  await waitFor(() => expect(result.current.profile.state.account).not.toBeNull());
  await waitFor(() => expect(result.current.profile.editingLocked).toBe(true));
  expect(result.current.documents.canSave).toBe(false);
  act(() => { result.current.profile.saveAccount(); result.current.documents.submit(); });
  expect(fetchMock.mock.calls.some(([, options]: [string, RequestInit?]) => options?.method === "PUT" || options?.method === "POST")).toBe(false);
});

it("locks only snapshot actions during category review and keeps profile and document drafts editable", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/snapshot-change-requests/latest")
    ? Response.json({ request: null, changeRequiresApproval: false, hasChanges: true, categoryChangePending: true })
    : url.endsWith("/snapshot") ? Response.json({}, { status: 404 })
    : Response.json(url.endsWith("/documents") ? { documents: [] } : account)));
  const { result } = renderHook(() => ({
    snapshot: useAccountSnapshot(id),
    profile: useAccountProfile({ accountIdentifier: id, canEdit: true, t: dictionaries.ja.admin }),
    documents: useAccountDocuments({ accountIdentifier: id, t: dictionaries.ja.admin }),
  }), { wrapper });
  await waitFor(() => expect(result.current.documents.canSave).toBe(true));
  expect(result.current.profile.editingLocked).toBe(false);
  expect(result.current.snapshot.snapshotLocked).toBe(true);
});
