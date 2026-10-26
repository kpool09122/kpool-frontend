import {
  act,
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PlaylistWorkspace, WikiPlaylistsClient } from "./WikiPlaylistsClient";
import { dictionaries } from "@/i18n/dictionaries";
import { useAuthStore } from "@/gateways/auth/authStore";
import {
  createPlaybackStore,
  type PlaybackStore,
} from "@/components/YouTubePlayback/playbackStore";
const sectionMock = vi.hoisted(() => ({ principal: "principal" }));
const playbackMock = vi.hoisted(() => ({
  context: null as { store: PlaybackStore } | null,
}));
import * as api from "@/gateways/wiki/wikiPlaylists";
vi.mock("@/gateways/wiki/wikiPlaylists", async (original) => ({
  ...(await original<typeof api>()),
  fetchPlaylists: vi.fn(),
  fetchPlaylist: vi.fn(),
  fetchLikedVideoPage: vi.fn(),
  createPlaylist: vi.fn(),
  savePlaylist: vi.fn(),
  deletePlaylist: vi.fn(),
}));
vi.mock("@/components/YouTubePlayback/YouTubePlaybackProvider", () => ({
  useYouTubePlayback: () => playbackMock.context,
  PlaybackOutlet: () => null,
}));
vi.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ dictionary: dictionaries.en }),
}));
vi.mock("../WikiSectionProvider", () => ({
  useWikiSection: () => ({
    principalState: {
      status: "available",
      principal: {
        status: "active",
        principalIdentifier: sectionMock.principal,
      },
    },
  }),
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
beforeEach(() => {
  sectionMock.principal = "principal";
  playbackMock.context = null;
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
});
const setup = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PlaylistWorkspace
        principal="principal"
        t={dictionaries.en.admin.playlists}
        playbackText={dictionaries.en.wiki.videos.continuous}
      />
    </QueryClientProvider>,
  );
it("removes previous private details and draft on Wiki Principal change and logout", async () => {
  const client = new QueryClient();
  const tree = () => (
    <QueryClientProvider client={client}>
      <WikiPlaylistsClient />
    </QueryClientProvider>
  );
  const view = render(tree());
  fireEvent.click(await screen.findByRole("button", { name: "Saved" }));
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Playlist name"), {
    target: { value: "Private draft" },
  });
  sectionMock.principal = "second";
  vi.mocked(api.fetchPlaylists).mockResolvedValue({ playlists: [] });
  view.rerender(tree());
  expect(screen.queryByDisplayValue("Private draft")).toBeNull();
  expect(screen.queryByText("Deleted source")).toBeNull();
  await screen.findByText("No playlists yet.");
  act(() => useAuthStore.getState().clearIdentity());
  expect(screen.queryByRole("heading", { name: "My playlists" })).toBeNull();
});
it("resolves initial browser authentication on a direct admin load", async () => {
  const refresh = vi.fn(async () => {
    useAuthStore.setState({ status: "authenticated" });
    return null;
  });
  const original = useAuthStore.getState().refreshIdentity;
  useAuthStore.setState({
    status: "loading",
    sessionVersion: 0,
    refreshIdentity: refresh,
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <WikiPlaylistsClient />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(
    await screen.findByRole("heading", { name: "My playlists" }),
  ).toBeVisible();
  useAuthStore.setState({ refreshIdentity: original });
});
it("opens deleted-source snapshots, edits locally, cancels and clears all items with one save", async () => {
  setup();
  fireEvent.click(await screen.findByRole("button", { name: "Saved" }));
  expect(await screen.findByText("Deleted source")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Playlist name"), {
    target: { value: "Changed" },
  });
  expect(api.savePlaylist).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByLabelText("Playlist name")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Remove: Deleted source" }),
  );
  vi.mocked(api.savePlaylist).mockResolvedValue({ ok: true, status: 204 });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(api.savePlaylist).toHaveBeenCalledWith(
      id,
      { name: "Saved", items: [] },
      expect.any(AbortSignal),
    ),
  );
});
it("can leave a committed save whose authoritative refetch fails", async () => {
  setup();
  fireEvent.click(await screen.findByRole("button", { name: "Saved" }));
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  vi.mocked(api.savePlaylist).mockResolvedValue({ ok: true, status: 204 });
  vi.mocked(api.fetchPlaylist).mockRejectedValue(
    Object.assign(new Error(), { status: 404 }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(
    await screen.findByText(dictionaries.en.admin.playlists.savedRefreshFailed),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByLabelText("Playlist name", { exact: true })).toBeNull();
});
it("plays only saved snapshots in position order independent from draft edits and shuffle", async () => {
  const store = createPlaybackStore();
  playbackMock.context = { store };
  vi.mocked(api.fetchPlaylist).mockResolvedValue({
    ...saved,
    videoCount: 2,
    items: [
      { ...saved.items[0], position: 1 },
      {
        ...saved.items[0],
        externalVideoId: "lmnopqrstuv",
        position: 0,
        title: "Earlier",
      },
    ],
  });
  setup();
  fireEvent.click(await screen.findByRole("button", { name: "Saved" }));
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove: Earlier" }));
  fireEvent.click(screen.getByRole("button", { name: "Loop playback" }));
  fireEvent.click(screen.getByRole("button", { name: "Random playback" }));
  fireEvent.click(screen.getByRole("button", { name: "Play continuously" }));
  expect(store.getState().session?.tracks.map((item) => item.videoId)).toEqual([
    "lmnopqrstuv",
    "abcdefghijk",
  ]);
  expect(store.getState().session).toMatchObject({ loop: true, random: true });
  const session = store.getState().session!.id;
  act(() => {
    store.getState().advance(session, true);
    store.getState().advance(session, true);
  });
  expect(store.getState().session).toBeNull();
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
});
it("disables invalid Unicode names, and retains edits after save failure", async () => {
  setup();
  fireEvent.click(await screen.findByRole("button", { name: "Saved" }));
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  const name = screen.getByLabelText("Playlist name");
  for (const value of [" ", "😀".repeat(33)]) {
    fireEvent.change(name, { target: { value } });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  }
  fireEvent.change(name, { target: { value: "😀".repeat(32) } });
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  vi.mocked(api.savePlaylist).mockResolvedValue({ ok: false, status: 403 });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    dictionaries.en.admin.playlists.forbidden,
  );
  expect(name).toHaveValue("😀".repeat(32));
});
