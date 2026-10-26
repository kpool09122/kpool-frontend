import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useWikiPlaylists } from "./useWikiPlaylists";
import { useAuthStore } from "@/gateways/auth/authStore";
import * as api from "./wikiPlaylists";
vi.mock("./wikiPlaylists", async (original) => ({
  ...(await original<typeof api>()),
  fetchPlaylists: vi.fn(),
  fetchPlaylist: vi.fn(),
  fetchLikedVideoPage: vi.fn(),
  createPlaylist: vi.fn(),
  savePlaylist: vi.fn(),
  deletePlaylist: vi.fn(),
}));
afterEach(cleanup);
const id = "00000000-0000-4000-8000-000000000001";
const saved = {
  playlistIdentifier: id,
  name: "Saved",
  videoCount: 1,
  createdAt: "2026-10-26T00:00:00Z",
  updatedAt: "2026-10-26T00:00:00Z",
  items: [
    {
      provider: "youtube" as const,
      externalVideoId: "abcdefghijk",
      sourceVideoLinkIdentifier: null,
      position: 0,
      url: "https://youtu.be/abcdefghijk",
      title: "Deleted source",
      thumbnailUrl: null,
      durationSeconds: null,
    },
  ],
};
const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(() => useWikiPlaylists("principal"), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};
beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    status: "authenticated",
    identity: null,
    sessionVersion: 1,
  });
  vi.mocked(api.fetchPlaylists).mockResolvedValue({ playlists: [saved] });
  vi.mocked(api.fetchPlaylist).mockResolvedValue(saved);
  vi.mocked(api.fetchLikedVideoPage).mockResolvedValue({
    likedVideoLinkIdentifiers: [],
    videos: [],
    pagination: { currentPage: 1, perPage: 20, total: 0 },
  });
  vi.mocked(api.savePlaylist).mockResolvedValue({ ok: true, status: 204 });
});
it("keeps edits local, saves existing identity pairs, refetches authoritative data", async () => {
  const { result } = setup();
  await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
  await act(() => result.current.open(id));
  act(() => result.current.edit());
  act(() =>
    result.current.setDraft({ ...result.current.draft!, name: "Renamed" }),
  );
  expect(api.savePlaylist).not.toHaveBeenCalled();
  await act(() => result.current.save());
  expect(api.savePlaylist).toHaveBeenCalledWith(
    id,
    {
      name: "Renamed",
      items: [{ provider: "youtube", externalVideoId: "abcdefghijk" }],
    },
    expect.any(AbortSignal),
  );
  expect(api.fetchPlaylist).toHaveBeenCalledTimes(2);
  expect(result.current.draft).toBeNull();
  expect(result.current.detail?.name).toBe("Saved");
});
it.each([403, 404, 422, 500])(
  "retains draft on failed write %i without success",
  async (status) => {
    const { result } = setup();
    await act(() => result.current.open(id));
    act(() => result.current.edit());
    vi.mocked(api.savePlaylist).mockResolvedValue({ ok: false, status });
    await act(() => result.current.save());
    expect(result.current.draft).not.toBeNull();
    expect(result.current.notice).toBeNull();
    expect(result.current.error).toBe(status);
  },
);
it("distinguishes committed save from failed refetch and prevents duplicate writes", async () => {
  const { result } = setup();
  await act(() => result.current.open(id));
  act(() => result.current.edit());
  vi.mocked(api.fetchPlaylist).mockRejectedValue(
    Object.assign(new Error(), { status: 500 }),
  );
  await act(() => result.current.save());
  expect(result.current.committed).toBe(true);
  expect(result.current.notice).toBe("savedRefreshFailed");
  await act(() => result.current.save());
  expect(api.savePlaylist).toHaveBeenCalledTimes(1);
  vi.mocked(api.fetchPlaylist).mockResolvedValue(saved);
  await act(() => result.current.refreshSaved());
  expect(result.current.committed).toBe(false);
  expect(result.current.draft).toBeNull();
});
it("keeps the created empty list separate from a subsequent failed edit", async () => {
  vi.mocked(api.createPlaylist).mockResolvedValue({
    ok: true,
    status: 201,
    data: { ...saved, videoCount: 0 },
  });
  const { result } = setup();
  await act(() => result.current.create("New"));
  expect(result.current.detail?.items).toEqual([]);
  expect(result.current.notice).toBe("created");
  expect(result.current.draft).toBeNull();
  act(() =>
    result.current.setDraft({
      name: "New",
      items: [
        {
          provider: "youtube",
          externalVideoId: "lmnopqrstuv",
          title: "New source",
          videoLinkIdentifier: id,
        },
      ],
    }),
  );
  vi.mocked(api.savePlaylist).mockResolvedValue({ ok: false, status: 404 });
  await act(() => result.current.save());
  expect(result.current.detail?.items).toEqual([]);
  expect(result.current.draft?.items).toHaveLength(1);
  expect(result.current.notice).toBeNull();
  expect(api.createPlaylist).toHaveBeenCalledTimes(1);
});
it("shows server playlist limit and deletion errors without false success", async () => {
  const { result } = setup();
  vi.mocked(api.createPlaylist).mockResolvedValue({ ok: false, status: 409 });
  await act(() => result.current.create("Fourth"));
  expect(result.current.error).toBe(409);
  expect(result.current.detail).toBeNull();
  await act(() => result.current.open(id));
  vi.mocked(api.deletePlaylist).mockResolvedValue({ ok: false, status: 403 });
  await act(() => result.current.remove());
  expect(result.current.detail).not.toBeNull();
  expect(result.current.error).toBe(403);
  expect(result.current.notice).toBeNull();
  vi.mocked(api.deletePlaylist).mockResolvedValue({ ok: true, status: 204 });
  await act(() => result.current.remove());
  expect(result.current.detail).toBeNull();
  expect(result.current.notice).toBe("deleted");
});
it("drops late completions when identity session changes", async () => {
  let resolve!: (value: typeof saved) => void;
  vi.mocked(api.fetchPlaylist).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { result } = setup();
  let pending: Promise<void>;
  act(() => {
    pending = result.current.open(id);
  });
  act(() => useAuthStore.getState().clearIdentity());
  await act(async () => {
    resolve(saved);
    await pending;
  });
  expect(result.current.detail).toBeNull();
  expect(result.current.draft).toBeNull();
});

const likedVideo = {
  videoLinkIdentifier: "00000000-0000-4000-8000-000000000011",
  title: "New song", url: "https://youtu.be/lmnopqrstuv", thumbnailUrl: null,
  durationSeconds: null, language: "ja" as const, resourceType: "group" as const,
  slug: "group", likedAt: "2026-10-26T00:00:00Z",
  playlists: [],
};
it("adds a liked video to the latest playlist while preserving existing snapshots", async () => {
  const { result } = setup();
  await act(() => result.current.addToPlaylist(id, likedVideo));
  expect(api.savePlaylist).not.toHaveBeenCalled();
  expect(result.current.draft?.items).toHaveLength(2);
  expect(result.current.hasUnsavedChanges).toBe(true);
  await act(() => result.current.save());
  expect(api.savePlaylist).toHaveBeenCalledWith(id, {
    name: "Saved", items: [
      { provider: "youtube", externalVideoId: "abcdefghijk" },
      { videoLinkIdentifier: likedVideo.videoLinkIdentifier },
    ],
  }, expect.any(AbortSignal));
  expect(api.fetchPlaylist).toHaveBeenCalledTimes(2);
  expect(result.current.draft).toBeNull();
  expect(result.current.notice).toBe("saved");
  expect(result.current.busy).toBe(false);
});
it.each(["duplicate", "full"] as const)("rejects a %s addition without writing", async (condition) => {
  if (condition === "duplicate") {
    vi.mocked(api.fetchPlaylist).mockResolvedValue({ ...saved, items: [{ ...saved.items[0], externalVideoId: "lmnopqrstuv" }] });
  } else {
    vi.mocked(api.fetchPlaylist).mockResolvedValue({ ...saved, videoCount: 50, items: Array.from({ length: 50 }, () => saved.items[0]) });
  }
  const { result } = setup();
  await act(() => result.current.addToPlaylist(id, likedVideo));
  expect(api.savePlaylist).not.toHaveBeenCalled();
  expect(result.current.error).toBe(condition === "duplicate" ? 422 : 50);
  expect(result.current.busy).toBe(false);
});
it("retries only fetching after an addition was saved but its refresh failed", async () => {
  vi.mocked(api.fetchPlaylist).mockResolvedValueOnce(saved).mockRejectedValueOnce(new Error("Refresh failed"));
  const { result } = setup();
  await act(() => result.current.addToPlaylist(id, likedVideo));
  await act(() => result.current.save());
  expect(result.current.committed).toBe(true);
  expect(result.current.notice).toBe("savedRefreshFailed");
  await act(() => result.current.addToPlaylist(id, likedVideo));
  expect(api.savePlaylist).toHaveBeenCalledTimes(1);
  vi.mocked(api.fetchPlaylist).mockResolvedValue(saved);
  await act(() => result.current.refreshSaved());
  expect(api.savePlaylist).toHaveBeenCalledTimes(1);
  expect(result.current.committed).toBe(false);
  expect(result.current.notice).toBe("saved");
});
it("reports a failed addition without committing or discarding the selected playlist", async () => {
  vi.mocked(api.savePlaylist).mockResolvedValue({ ok: false, status: 403 });
  const { result } = setup();
  await act(() => result.current.open(id));
  await act(() => result.current.addToPlaylist(id, likedVideo));
  await act(() => result.current.save());
  expect(result.current.detail).toEqual(saved);
  expect(result.current.draft?.items).toHaveLength(2);
  expect(result.current.error).toBe(403);
  expect(result.current.notice).toBeNull();
  expect(result.current.committed).toBe(false);
});
