import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import type { WikiDraftImage } from "@kpool/wiki";
import type { AdminDraftImageAdapter, AdminDraftWikiAdapter } from "@/gateways/admin/adminAdapters";
import { createMockEditingDraftWiki } from "@/gateways/wiki/mockWikiGateway";
import { useEditingDraftWikis } from "./editing/useEditingDraftWikis";
import { useDraftImages } from "./draft-images/useDraftImages";

const wrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
};
afterEach(cleanup);

it("continues from the saved cursor after deleting a draft and retries a failed batch", async () => {
  const first = createMockEditingDraftWiki();
  const second = { ...first, wikiIdentifier: "77777777-7777-4777-8777-777777777777" };
  const adapter: AdminDraftWikiAdapter = {
    approveDraftWiki: vi.fn(), deleteDraftWiki: vi.fn().mockResolvedValue(undefined),
    listManagedDraftWikis: vi.fn(), listUntranslatedWikis: vi.fn(),
    publishDraftWiki: vi.fn(), rejectDraftWiki: vi.fn(), translateDraftWiki: vi.fn(), withdrawDraftWiki: vi.fn(),
    listMyDraftWikis: vi.fn()
      .mockResolvedValueOnce({ wikis: [first], next_cursor: "after-first", total: 2, per_page: 12 })
      .mockResolvedValueOnce({ wikis: [], next_cursor: "after-first", total: 1, per_page: 12 })
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({ wikis: [second], next_cursor: null, total: 1, per_page: 12 }),
  };
  const { result } = renderHook(() => useEditingDraftWikis({
    adapter, identityIdentifier: "identity", initialDraftWiki: {
      wikis: [first], pageInfo: { next_cursor: "after-first", total: 2 },
      isInitialLoading: false, isLoadingMore: false, loadError: null,
    },
    messages: { draftWikiListLoadFailed: "failed", draftWikiDeleteFailed: "delete failed" },
  }), { wrapper: wrapper() });

  await waitFor(() => expect(result.current.draftWiki.isInitialLoading).toBe(false));
  act(() => result.current.deleteDraftWiki(first));
  await waitFor(() => expect(result.current.draftWiki.wikis).toEqual([]));
  await waitFor(() => expect(result.current.deletingWikiIdentifier).toBeNull());
  expect(result.current.draftWiki.pageInfo).toEqual({ next_cursor: "after-first", total: 1 });
  act(() => result.current.loadDraftWikis("after-first"));
  await waitFor(() => expect(result.current.draftWiki.loadError).toBe("temporary failure"));
  expect(result.current.draftWiki.pageInfo).toEqual({ next_cursor: "after-first", total: 1 });
  act(() => result.current.loadDraftWikis("after-first"));
  await waitFor(() => expect(result.current.draftWiki.wikis).toEqual([second]));
  expect(adapter.listMyDraftWikis).toHaveBeenLastCalledWith({
    cursor: "after-first", perPage: 12, statuses: ["pending", "rejected"], fallbackErrorMessage: "failed",
  });
  expect(result.current.draftWiki.pageInfo).toEqual({ next_cursor: null, total: 1 });
  expect(result.current.draftWiki.loadError).toBeNull();
});

it("keeps the cursor after reviewing the last displayed draft image", async () => {
  const first: WikiDraftImage = {
    imageIdentifier: "88888888-8888-4888-8888-888888888888", publishedImageIdentifier: null,
    resourceType: "group", translationSetIdentifier: "99999999-9999-4999-8999-999999999999",
    url: "https://images.k-pool.app/images/first.webp", displayOrder: 1,
    sourceUrl: "https://example.test", sourceName: "source", author: null, license: null,
    altText: "first", wiki: { names: { ja: "Wiki" }, slug: "gr-first" },
    status: "under_review", uploadedAt: "2026-05-01T00:00:00Z",
  };
  const second = { ...first, imageIdentifier: "77777777-7777-4777-8777-777777777777" };
  const adapter: AdminDraftImageAdapter = {
    approveDraftImage: vi.fn().mockResolvedValue(undefined), rejectDraftImage: vi.fn(),
    approveImageDeletionRequest: vi.fn(), rejectImageDeletionRequest: vi.fn(), listImageDeletionRequests: vi.fn(),
    listDraftImages: vi.fn()
      .mockResolvedValueOnce({ images: [first], next_cursor: "after-first-image", total: 2, per_page: 12 })
      .mockResolvedValueOnce({ images: [], next_cursor: "after-first-image", total: 1, per_page: 12 })
      .mockResolvedValueOnce({ images: [second], next_cursor: null, total: 1, per_page: 12 }),
  };
  const { result } = renderHook(() => useDraftImages({
    adapter, identityIdentifier: "identity", initialDraftImages: {
      images: [first], pageInfo: { next_cursor: "after-first-image", total: 2 },
      isInitialLoading: false, isLoadingMore: false, loadError: null,
    }, messages: { draftImageListLoadFailed: "failed", draftImageApproveFailed: "failed", draftImageRejectFailed: "failed" },
  }), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.draftImages.isInitialLoading).toBe(false));
  act(() => result.current.reviewDraftImage(first.imageIdentifier, "approve"));
  await waitFor(() => expect(result.current.draftImages.images).toEqual([]));
  await waitFor(() => expect(result.current.reviewingImageIdentifier).toBeNull());
  expect(result.current.draftImages.pageInfo).toEqual({ next_cursor: "after-first-image", total: 1 });
  act(() => result.current.loadDraftImages("after-first-image"));
  await waitFor(() => expect(result.current.draftImages.images).toEqual([second]));
  expect(adapter.listDraftImages).toHaveBeenLastCalledWith({
    cursor: "after-first-image", perPage: 12, status: "under_review", fallbackErrorMessage: "failed",
  });
  expect(result.current.draftImages.pageInfo).toEqual({ next_cursor: null, total: 1 });
});
