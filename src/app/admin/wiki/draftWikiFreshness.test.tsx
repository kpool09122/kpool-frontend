import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import type { AdminDraftWikiAdapter } from "@/gateways/admin/adminAdapters";
import type { WikiDraftWiki, WikiDraftWikiListResponse } from "@/gateways/wiki/draftWiki";
import { createMockEditingDraftWiki } from "@/gateways/wiki/mockWikiGateway";
import { adminQueryDefaults } from "../queryDefaults";
import type { DraftWikiListState } from "../useAdminDraftWikis";
import { useApprovedDraftWikis } from "./approved/useApprovedDraftWikis";
import { useUnapprovedDraftWikis } from "./unapproved/useUnapprovedDraftWikis";
import { useEditingDraftWikis } from "./editing/useEditingDraftWikis";
import { useUntranslatedWikis } from "./untranslated/useUntranslatedWikis";

afterEach(cleanup);

const messages = {
  draftWikiListLoadFailed: "list failed", draftWikiPublishFailed: "publish failed",
  draftWikiApproveFailed: "approve failed", draftWikiRejectFailed: "reject failed",
  draftWikiDeleteFailed: "delete failed", draftWikiTranslateFailed: "translate failed",
};
const state = (wikis: DraftWikiListState["wikis"] = []): DraftWikiListState => ({
  wikis, pageInfo: { next_cursor: null, total: wikis.length },
  isInitialLoading: false, isLoadingMore: false, loadError: null,
});
const page = (wikis: WikiDraftWiki[]): WikiDraftWikiListResponse => ({
  wikis, next_cursor: null, total: wikis.length, per_page: 12,
});
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { ...adminQueryDefaults, retry: false } } });
  const adapter: AdminDraftWikiAdapter = {
    approveDraftWiki: vi.fn(), deleteDraftWiki: vi.fn(), listManagedDraftWikis: vi.fn(),
    listMyDraftWikis: vi.fn(), listUntranslatedWikis: vi.fn(), publishDraftWiki: vi.fn(),
    rejectDraftWiki: vi.fn(), translateDraftWiki: vi.fn(), withdrawDraftWiki: vi.fn(),
  };
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, adapter, wrapper, params: { adapter, identityIdentifier: "identity", messages } };
}

it("fetches the newly approved wiki when returning to publication after publishing another wiki", async () => {
  const { adapter, wrapper, params } = setup();
  const first = { ...createMockEditingDraftWiki(), status: "approved" as const };
  const second = { ...first, wikiIdentifier: "77777777-7777-4777-8777-777777777777", name: "Second Wiki" };
  let approved = [first];
  let underReview = [second];
  vi.mocked(adapter.listManagedDraftWikis).mockImplementation(async ({ statuses }) =>
    page(statuses.includes("approved") ? approved : underReview));
  vi.mocked(adapter.publishDraftWiki).mockImplementation(async () => {
    approved = [];
    return { wikiIdentifier: first.wikiIdentifier, language: "ja", name: first.name, resourceType: "group", version: 1, isOfficial: false };
  });
  vi.mocked(adapter.approveDraftWiki).mockImplementation(async () => {
    approved = [second];
    underReview = [];
    return { wikiIdentifier: second.wikiIdentifier, language: "ja", name: second.name, resourceType: "group", status: "approved" };
  });

  const publication = renderHook(() => useApprovedDraftWikis({ ...params, initialDraftWiki: state([first]) }), { wrapper });
  await waitFor(() => expect(publication.result.current.draftWiki.isInitialLoading).toBe(false));
  act(() => publication.result.current.publishDraftWiki(first, "next-generation"));
  await waitFor(() => expect(publication.result.current.reviewingWikiIdentifier).toBeNull());
  await waitFor(() => expect(publication.result.current.draftWiki.wikis).toEqual([]));
  publication.unmount();

  const approval = renderHook(() => useUnapprovedDraftWikis({ ...params, initialDraftWiki: state([second]) }), { wrapper });
  await waitFor(() => expect(approval.result.current.draftWiki.isInitialLoading).toBe(false));
  act(() => approval.result.current.approveDraftWiki(second));
  await waitFor(() => expect(approval.result.current.draftWiki.wikis).toEqual([]));
  approval.unmount();

  // Even a stale route payload must be replaced by a new request on re-entry.
  const returned = renderHook(() => useApprovedDraftWikis({ ...params, initialDraftWiki: state() }), { wrapper });
  await waitFor(() => expect(returned.result.current.draftWiki.isInitialLoading).toBe(false));
  expect(returned.result.current.draftWiki.wikis).toEqual([second]);
  expect(adapter.listManagedDraftWikis).toHaveBeenCalledTimes(5);
});

it("fetches translated drafts when returning to editing, including when its initial server list was empty", async () => {
  const { adapter, wrapper, params } = setup();
  const translated = createMockEditingDraftWiki();
  let editing: typeof translated[] = [];
  vi.mocked(adapter.listMyDraftWikis).mockImplementation(async () => page(editing));
  vi.mocked(adapter.listUntranslatedWikis).mockResolvedValue({
    wikis: [], current_page: 1, last_page: 1, total: 0, per_page: 12,
  });
  vi.mocked(adapter.translateDraftWiki).mockImplementation(async () => {
    editing = [translated];
    return { draftWikis: [] };
  });
  const editor = renderHook(() => useEditingDraftWikis({ ...params, initialDraftWiki: state() }), { wrapper });
  await waitFor(() => expect(editor.result.current.draftWiki.isInitialLoading).toBe(false));
  editor.unmount();
  const translation = renderHook(() => useUntranslatedWikis({ ...params, initialDraftWiki: state() }), { wrapper });
  await waitFor(() => expect(translation.result.current.draftWiki.isInitialLoading).toBe(false));
  act(() => translation.result.current.translateWiki(translated));
  await waitFor(() => expect(adapter.listUntranslatedWikis).toHaveBeenCalledTimes(2));
  translation.unmount();
  const returned = renderHook(() => useEditingDraftWikis({ ...params, initialDraftWiki: state() }), { wrapper });
  await waitFor(() => expect(returned.result.current.draftWiki.wikis).toEqual([translated]));
  expect(adapter.listMyDraftWikis).toHaveBeenCalledTimes(2);
});

it("reports a failed refresh instead of presenting the initial list as current, and allows retry", async () => {
  const { adapter, wrapper, params } = setup();
  const wiki = createMockEditingDraftWiki();
  vi.mocked(adapter.listMyDraftWikis)
    .mockRejectedValueOnce(new Error("refresh failed"))
    .mockResolvedValueOnce(page([]));
  const view = renderHook(() => useEditingDraftWikis({ ...params, initialDraftWiki: state([wiki]) }), { wrapper });
  expect(view.result.current.draftWiki.isInitialLoading).toBe(true);
  await waitFor(() => expect(view.result.current.draftWiki.loadError).toBe("refresh failed"));
  act(() => view.result.current.loadDraftWikis());
  await waitFor(() => expect(view.result.current.draftWiki.wikis).toEqual([]));
  expect(view.result.current.draftWiki.loadError).toBeNull();
});
