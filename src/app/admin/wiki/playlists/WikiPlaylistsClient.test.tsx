import {
  act,
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
  within,
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
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
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
const openSaved = async () => {
  await screen.findByRole("option", { name: "Saved" });
  fireEvent.change(screen.getByRole("combobox", { name: dictionaries.en.admin.playlists.selectPlaylist }), {
    target: { value: id },
  });
};
it("hides retry buttons while loading and after successfully loading empty lists", async () => {
  vi.mocked(api.fetchPlaylists).mockResolvedValue({ playlists: [] });
  setup();
  const t = dictionaries.en.admin.playlists;
  expect(screen.queryByRole("button", { name: t.retry })).toBeNull();
  expect(await screen.findByText(t.empty)).toBeVisible();
  fireEvent.click(screen.getByRole("tab", { name: t.editTab }));
  expect(await screen.findByText(t.noVideos)).toBeVisible();
  expect(screen.queryByRole("button", { name: t.retry })).toBeNull();
});
it.each(["playlists", "likes"] as const)(
  "shows retry only for a failed %s request and hides it after recovery",
  async (source) => {
    const fetch = source === "playlists"
      ? vi.mocked(api.fetchPlaylists)
      : vi.mocked(api.fetchLikedVideoPage);
    fetch.mockRejectedValueOnce(new Error("Request failed"));
    setup();
    if (source === "likes") fireEvent.click(screen.getByRole("tab", { name: dictionaries.en.admin.playlists.editTab }));
    const retry = await screen.findByRole("button", {
      name: dictionaries.en.admin.playlists.retry,
    });
    expect(screen.getAllByRole("button", { name: dictionaries.en.admin.playlists.retry })).toHaveLength(1);
    const panel = screen.getByRole("tabpanel");
    expect(panel.lastElementChild).toContainElement(screen.getByRole("alert"));
    fireEvent.click(retry);
    await waitFor(() => expect(retry).not.toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(2);
  },
);
it("removes previous private details and draft on Wiki Principal change and logout", async () => {
  const client = new QueryClient();
  const tree = () => (
    <QueryClientProvider client={client}>
      <WikiPlaylistsClient />
    </QueryClientProvider>
  );
  const view = render(tree());
  await openSaved();
  fireEvent.click(await screen.findByRole("button", { name: "Remove: Deleted source" }));
  expect(api.savePlaylist).not.toHaveBeenCalled();
  sectionMock.principal = "second";
  vi.mocked(api.fetchPlaylists).mockResolvedValue({ playlists: [] });
  view.rerender(tree());
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  expect(screen.queryByText("Deleted source")).toBeNull();
  await screen.findByText("No playlists yet.");
  act(() => useAuthStore.getState().clearIdentity());
  expect(screen.queryByRole("heading", { name: "My playlists" })).toBeNull();
});
it("aborts a pending request on Principal remount and ignores its late result", async () => {
  let resolve!: (value: typeof saved) => void;
  vi.mocked(api.fetchPlaylist).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const client = new QueryClient();
  const tree = () => <QueryClientProvider client={client}><WikiPlaylistsClient /></QueryClientProvider>;
  const view = render(tree());
  await openSaved();
  const signal = vi.mocked(api.fetchPlaylist).mock.calls[0][1];
  expect(signal.aborted).toBe(false);
  vi.mocked(api.fetchPlaylists).mockResolvedValue({ playlists: [] });
  sectionMock.principal = "new-principal";
  view.rerender(tree());
  expect(signal.aborted).toBe(true);
  await act(async () => { resolve(saved); });
  expect(await screen.findByText(dictionaries.en.admin.playlists.empty)).toBeVisible();
  expect(screen.queryByText("Deleted source")).toBeNull();
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
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
it("edits immediately with only a Save action and discards unsaved changes on reload", async () => {
  const view = setup();
  await openSaved();
  expect(await screen.findByText("Deleted source")).toBeVisible();
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Remove: Deleted source" }));
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  expect(api.savePlaylist).not.toHaveBeenCalled();
  view.unmount();
  setup();
  await openSaved();
  expect(await screen.findByText("Deleted source")).toBeVisible();
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Remove: Deleted source" }));
  vi.mocked(api.savePlaylist).mockResolvedValue({ ok: true, status: 204 });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.savePlaylist).toHaveBeenCalledWith(id, { name: "Saved", items: [] }, expect.any(AbortSignal)));
});
it("can leave a committed save whose authoritative refetch fails", async () => {
  setup();
  await openSaved();
  fireEvent.click(await screen.findByRole("button", { name: "Remove: Deleted source" }));
  vi.mocked(api.savePlaylist).mockResolvedValue({ ok: true, status: 204 });
  vi.mocked(api.fetchPlaylist).mockRejectedValue(
    Object.assign(new Error(), { status: 404 }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(
    await screen.findByText(dictionaries.en.admin.playlists.savedRefreshFailed),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(screen.getByRole("button", { name: dictionaries.en.admin.playlists.retry })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByLabelText("Playlist name", { exact: true })).toBeNull();
});
it("deletes the selected playlist from its adjacent actions after confirmation", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  vi.mocked(api.deletePlaylist).mockResolvedValue({ ok: true, status: 204 });
  setup();
  expect(await screen.findByRole("button", { name: "Playlist actions" })).toBeDisabled();
  await openSaved();
  await screen.findByRole("button", { name: "Remove: Deleted source" });
  const trigger = await screen.findByRole("button", { name: "Playlist actions" });
  await waitFor(() => expect(trigger).toBeEnabled());
  const menuId = trigger.getAttribute("popovertarget");
  expect(document.getElementById(menuId!)).toHaveAttribute("popover", "auto");
  expect(screen.getByRole("button", { name: "Delete playlist", hidden: true })).toHaveAttribute("popovertargetaction", "hide");
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("button", { name: "Delete playlist", hidden: true }));
  expect(confirm).toHaveBeenCalledWith(dictionaries.en.admin.playlists.confirmDelete);
  expect(api.deletePlaylist).not.toHaveBeenCalled();
  expect(screen.getByRole("combobox", { name: "Playlist" })).toHaveValue(id);
  confirm.mockReturnValue(true);
  vi.mocked(api.fetchPlaylists).mockResolvedValue({ playlists: [] });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("button", { name: "Delete playlist", hidden: true }));
  expect(await screen.findByText("Deleted.")).toBeVisible();
  expect(api.deletePlaylist).toHaveBeenCalledWith(id, expect.any(AbortSignal));
  expect(screen.queryByRole("combobox", { name: "Playlist" })).toBeNull();
  expect(screen.getByText(dictionaries.en.admin.playlists.empty)).toBeVisible();
  expect(api.savePlaylist).not.toHaveBeenCalled();
});
it("retains the selected playlist and its draft when deletion fails", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.mocked(api.deletePlaylist).mockResolvedValue({ ok: false, status: 403 });
  setup();
  await openSaved();
  fireEvent.click(await screen.findByRole("button", { name: "Remove: Deleted source" }));
  fireEvent.click(screen.getByRole("button", { name: "Playlist actions" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete playlist", hidden: true }));
  expect(await screen.findByRole("alert")).toHaveTextContent(dictionaries.en.admin.playlists.forbidden);
  expect(screen.getByRole("combobox", { name: "Playlist" })).toHaveValue(id);
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Playlist actions" })).toBeEnabled();
});
it("starts row playback from the selected video without saving or triggering playback on edit controls", async () => {
  const store = createPlaybackStore();
  playbackMock.context = { store };
  vi.mocked(api.fetchPlaylist).mockResolvedValue({
    ...saved,
    videoCount: 2,
    items: [saved.items[0], { ...saved.items[0], externalVideoId: "lmnopqrstuv", position: 1, title: "Second" }],
  });
  setup();
  await openSaved();
  const handle = await screen.findByRole("button", { name: "Reorder: Second" });
  fireEvent.click(handle);
  expect(store.getState().session).toBeNull();
  fireEvent.keyDown(handle, { key: "ArrowUp" });
  expect(store.getState().session).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Play video: Deleted source" }));
  const session = store.getState().session!;
  expect(session.tracks.map((track) => track.title)).toEqual(["Second", "Deleted source"]);
  expect(session.queue).toMatchObject({ position: 1, playerIndex: 1 });
  const queue = screen.getByRole("complementary", { name: "Playback queue" });
  expect(within(queue).getByRole("button", { name: "Play video: Deleted source" })).toHaveAttribute("aria-current", "true");
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  expect(api.savePlaylist).not.toHaveBeenCalled();
  act(() => store.getState().stop());
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Remove: Second" }));
  expect(store.getState().session).toBeNull();
  expect(api.savePlaylist).not.toHaveBeenCalled();
});
it("disables playlist navigation before playback and for a single video", async () => {
  const store = createPlaybackStore();
  playbackMock.context = { store };
  setup();
  await openSaved();
  const start = await screen.findByRole("button", { name: "Play all" });
  const previous = screen.getByRole("button", { name: "Previous video" });
  const next = screen.getByRole("button", { name: "Next video" });
  expect(previous).toBeDisabled();
  expect(next).toBeDisabled();
  fireEvent.click(start);
  expect(previous).toBeDisabled();
  expect(next).toBeDisabled();
});
it.each(["off", "all", "one"] as const)("navigates the shuffled playlist in %s loop mode, including while floating", async (loop) => {
  const store = createPlaybackStore();
  playbackMock.context = { store };
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.mocked(api.fetchPlaylist).mockResolvedValue({
    ...saved,
    videoCount: 3,
    items: [
      saved.items[0],
      { ...saved.items[0], externalVideoId: "lmnopqrstuv", title: "Second", position: 1 },
      { ...saved.items[0], externalVideoId: "zyxwvutsrqp", title: "Third", position: 2 },
    ],
  });
  setup();
  await openSaved();
  const start = await screen.findByRole("button", { name: "Play all" });
  fireEvent.click(screen.getByRole("button", { name: "Random playback" }));
  fireEvent.click(start);
  act(() => store.getState().setLoop(loop));
  const sessionId = store.getState().session!.id;
  const currentTitle = () => {
    const session = store.getState().session!;
    return session.tracks[session.queue.playerIndex].title;
  };
  const previous = screen.getByRole("button", { name: "Previous video" });
  const next = screen.getByRole("button", { name: "Next video" });
  expect(currentTitle()).toBe("Second");
  if (loop === "all") {
    fireEvent.click(previous);
    expect(currentTitle()).toBe("Deleted source");
    fireEvent.click(next);
    expect(currentTitle()).toBe("Second");
  } else expect(previous).toBeDisabled();
  fireEvent.click(next);
  expect(currentTitle()).toBe("Third");
  fireEvent.click(next);
  expect(currentTitle()).toBe("Deleted source");
  if (loop === "all") {
    fireEvent.click(next);
    expect(currentTitle()).toBe("Second");
    fireEvent.click(previous);
    expect(currentTitle()).toBe("Deleted source");
  } else expect(next).toBeDisabled();
  act(() => store.getState().detach());
  fireEvent.click(previous);
  expect(currentTitle()).toBe("Third");
  expect(store.getState().floating).toBe(true);
  expect(store.getState().session?.id).toBe(sessionId);
  fireEvent.click(screen.getByRole("button", { name: "Stop playback" }));
  expect(previous).toBeDisabled();
  expect(next).toBeDisabled();
  expect(api.savePlaylist).not.toHaveBeenCalled();
});
it("returns focus to the enabled start button after Stop without taking focus on unrelated stops", async () => {
  const store = createPlaybackStore();
  playbackMock.context = { store };
  setup();
  await openSaved();
  const start = await screen.findByRole("button", { name: "Play all" });
  fireEvent.click(start);
  expect(start).toBeEnabled();
  expect(start).toHaveAccessibleName("Stop playback");
  const stop = screen.getByRole("button", { name: "Stop playback" });
  expect(stop).toBe(start);
  stop.focus();
  fireEvent.click(stop);
  expect(start).toBeEnabled();
  expect(start).toHaveAccessibleName("Play all");
  expect(start).toHaveFocus();
  fireEvent.click(start);
  const selection = screen.getByRole("combobox", { name: "Playlist" });
  selection.focus();
  act(() => store.getState().stop());
  expect(selection).toHaveFocus();
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
  await openSaved();
  fireEvent.click(await screen.findByRole("button", { name: "Remove: Earlier" }));
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Loop playback" }));
  fireEvent.click(screen.getByRole("button", { name: "Random playback" }));
  fireEvent.click(screen.getByRole("button", { name: "Play all" }));
  expect(store.getState().session?.tracks.map((item) => item.videoId)).toEqual([
    "lmnopqrstuv",
    "abcdefghijk",
  ]);
  expect(store.getState().session).toMatchObject({ loop: "all", random: true });
  expect(screen.queryByLabelText("Playlist name", { exact: true })).toBeNull();
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  expect(screen.queryByRole("button", { name: /^Reorder:/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /^Remove:/ })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Saved" })).toBeNull();
  const playback = store.getState().session!;
  const session = playback.id;
  const queue = screen.getByRole("complementary", { name: dictionaries.en.wiki.videos.continuous.queue });
  const queueButtons = within(queue).getAllByRole("button", { name: /^Play video:/ });
  expect(queueButtons.map((button) => button.getAttribute("aria-label"))).toEqual(
    playback.queue.order.map((index) => `Play video: ${playback.tracks[index].title}`),
  );
  const target = playback.tracks[playback.queue.order[1]];
  const targetButton = within(queue).getByRole("button", { name: `Play video: ${target.title}` });
  fireEvent.click(targetButton);
  expect(targetButton).toHaveAttribute("aria-current", "true");
  expect(store.getState().session).toMatchObject({ id: session, loop: "all", random: true, queue: { position: 1 } });
  expect(api.savePlaylist).not.toHaveBeenCalled();
  expect(store.getState().session?.tracks).toHaveLength(2);
  act(() => store.getState().detach());
  expect(queue).toBeVisible();
  expect(screen.getByRole("button", { name: "Loop playback" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  expect(screen.queryByRole("button", { name: /^Reorder:/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /^Remove:/ })).toBeNull();
  act(() => {
    store.getState().advance(session, true);
    store.getState().advance(session, true);
  });
  expect(store.getState().session).toBeNull();
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Remove: Earlier" })).toBeNull();
});
it("retains local removals after a failed save", async () => {
  setup();
  await openSaved();
  fireEvent.click(await screen.findByRole("button", { name: "Remove: Deleted source" }));
  vi.mocked(api.savePlaylist).mockResolvedValue({ ok: false, status: 403 });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(dictionaries.en.admin.playlists.forbidden);
  expect(screen.queryByText("Deleted source")).toBeNull();
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
});
it("reorders with the handle keyboard controls and writes only after Save", async () => {
  vi.mocked(api.fetchPlaylist).mockResolvedValue({ ...saved, videoCount: 2, items: [
    saved.items[0], { ...saved.items[0], externalVideoId: "lmnopqrstuv", title: "Second", position: 1 },
  ] });
  setup();
  await openSaved();
  const handle = await screen.findByRole("button", { name: "Reorder: Second" });
  fireEvent.keyDown(handle, { key: "ArrowUp" });
  expect(screen.getAllByRole("button", { name: /^Reorder:/ }).map((item) => item.getAttribute("aria-label"))).toEqual(["Reorder: Second", "Reorder: Deleted source"]);
  expect(api.savePlaylist).not.toHaveBeenCalled();
  vi.mocked(api.savePlaylist).mockResolvedValue({ ok: true, status: 204 });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.savePlaylist).toHaveBeenCalledWith(id, {
    name: "Saved", items: [
      { provider: "youtube", externalVideoId: "lmnopqrstuv" },
      { provider: "youtube", externalVideoId: "abcdefghijk" },
    ],
  }, expect.any(AbortSignal)));
});

it("shows saved playlist badges and reflects local removals without source metadata", async () => {
  const t = dictionaries.en.admin.playlists;
  const other = "00000000-0000-4000-8000-000000000002";
  vi.mocked(api.fetchPlaylists).mockResolvedValue({ playlists: [saved, { ...saved, playlistIdentifier: other, name: "Other" }] });
  vi.mocked(api.fetchLikedVideoPage).mockResolvedValue({
    likedVideoLinkIdentifiers: [id],
    videos: [{
      videoLinkIdentifier: id, url: "https://youtu.be/abcdefghijk", title: "Shared song",
      thumbnailUrl: null, durationSeconds: null, language: "ko", resourceType: "group", slug: "group",
      likedAt: "2026-10-26T00:00:00Z", playlists: [{ playlistIdentifier: id, name: "Saved" }, { playlistIdentifier: other, name: "Other" }],
    }],
    pagination: { currentPage: 1, perPage: 20, total: 10 },
  });
  setup();
  await screen.findByRole("option", { name: "Saved" });
  fireEvent.click(screen.getByRole("tab", { name: t.editTab }));
  const badges = await screen.findByRole("list", { name: t.addedPlaylists });
  expect(within(badges).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Saved", "Other"]);
  expect(screen.queryByText(/ko.*group/)).toBeNull();
  expect(screen.queryByText(new RegExp(t.sourceCount))).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Add: Shared song" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("button", { name: "Saved" })).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "Other" })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("button", { name: t.close }));
  fireEvent.click(screen.getByRole("tab", { name: t.listTab }));
  await openSaved();
  fireEvent.click(await screen.findByRole("button", { name: "Remove: Deleted source" }));
  fireEvent.click(screen.getByRole("tab", { name: t.editTab }));
  expect(screen.getByRole("list", { name: t.addedPlaylists })).toHaveTextContent("Other");
  expect(screen.getByRole("list", { name: t.addedPlaylists })).not.toHaveTextContent("Saved");
  expect(api.savePlaylist).not.toHaveBeenCalled();
});
it("stages additions from the destination dialog and writes them only when Save is pressed", async () => {
  const t = dictionaries.en.admin.playlists;
  const source = "00000000-0000-4000-8000-000000000011";
  const video = {
    videoLinkIdentifier: source, title: "Liked song", url: "https://youtu.be/lmnopqrstuv",
    thumbnailUrl: null, durationSeconds: null, language: "ja" as const,
    resourceType: "group" as const, slug: "group", likedAt: "2026-10-26T00:00:00Z",
    playlists: [],
  };
  vi.mocked(api.fetchPlaylists).mockResolvedValue({
    playlists: [saved, { ...saved, playlistIdentifier: source, name: "Other" }],
  });
  vi.mocked(api.fetchLikedVideoPage).mockResolvedValue({
    likedVideoLinkIdentifiers: [source], videos: [video],
    pagination: { currentPage: 1, perPage: 20, total: 1 },
  });
  vi.mocked(api.savePlaylist).mockResolvedValue({ ok: true, status: 204 });
  setup();
  await screen.findByRole("option", { name: "Saved" });
  fireEvent.click(screen.getByRole("tab", { name: t.editTab }));
  const plus = await screen.findByRole("button", { name: `${t.add}: Liked song` });
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.queryByLabelText(t.newName)).toBeNull();
  expect(screen.queryByRole("button", { name: dictionaries.en.wiki.videos.continuous.start })).toBeNull();
  expect(plus).toHaveTextContent("＋");
  fireEvent.click(plus);
  let chooser = screen.getByRole("dialog", { name: t.choose });
  expect(within(chooser).getByRole("button", { name: "Other" })).toBeEnabled();
  expect(api.fetchPlaylist).not.toHaveBeenCalled();
  fireEvent(chooser, new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(plus).toHaveFocus();
  fireEvent.click(plus);
  chooser = screen.getByRole("dialog", { name: t.choose });
  fireEvent.click(within(chooser).getByRole("button", { name: "Saved" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
  expect(api.savePlaylist).not.toHaveBeenCalled();
  expect(screen.getByRole("list", { name: t.addedPlaylists })).toHaveTextContent("Saved");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.savePlaylist).toHaveBeenCalledWith(
    id,
    { name: "Saved", items: [
      { provider: "youtube", externalVideoId: "abcdefghijk" },
      { videoLinkIdentifier: source },
    ] },
    expect.any(AbortSignal),
  ));
  expect(await screen.findByText(t.saved)).toBeVisible();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("tab", { name: t.editTab })).toHaveAttribute("aria-selected", "true");
  expect(screen.queryByLabelText(t.name)).toBeNull();
});
it("separates list, create and edit tabs and supports keyboard navigation", async () => {
  const t = dictionaries.en.admin.playlists;
  vi.mocked(api.createPlaylist).mockResolvedValue({ ok: true, status: 201, data: { ...saved, videoCount: 0 } });
  setup();
  await screen.findByRole("option", { name: "Saved" });
  expect(screen.getByRole("tabpanel", { name: t.listTab })).toBeVisible();
  expect(screen.queryByLabelText(t.newName)).toBeNull();
  expect(screen.queryByRole("heading", { name: t.likes })).toBeNull();
  const listTab = screen.getByRole("tab", { name: t.listTab });
  listTab.focus();
  fireEvent.keyDown(listTab, { key: "ArrowRight" });
  expect(screen.getByRole("tabpanel", { name: t.createTab })).toBeVisible();
  expect(screen.queryByRole("combobox")).toBeNull();
  fireEvent.change(screen.getByLabelText(t.newName), { target: { value: "New" } });
  fireEvent.click(screen.getByRole("button", { name: t.create }));
  expect(await screen.findByText(t.created)).toBeVisible();
  expect(api.createPlaylist).toHaveBeenCalledWith("New", expect.any(AbortSignal));
  expect(screen.queryByLabelText(t.name, { exact: true })).toBeNull();
  fireEvent.click(listTab);
  expect(screen.getByRole("combobox", { name: t.selectPlaylist })).toHaveValue(id);
  expect(await screen.findByText(t.noVideos)).toBeVisible();
});

it("uses a placeholder for the new name and keeps creation errors at the bottom of its tab", async () => {
  const t = dictionaries.en.admin.playlists;
  vi.mocked(api.createPlaylist).mockResolvedValue({ ok: false, status: 500 });
  setup();
  await screen.findByRole("option", { name: "Saved" });
  fireEvent.click(screen.getByRole("tab", { name: t.createTab }));
  const name = screen.getByPlaceholderText(t.newName);
  expect(name).toHaveAccessibleName(t.newName);
  expect(screen.getByText(t.newName)).toHaveClass("sr-only");
  fireEvent.change(name, { target: { value: "New" } });
  fireEvent.click(screen.getByRole("button", { name: t.create }));
  const error = await screen.findByRole("alert");
  expect(error).toHaveTextContent(t.failed);
  expect(error).toHaveClass("border-status-danger", "bg-status-danger/10");
  const panel = screen.getByRole("tabpanel", { name: t.createTab });
  expect(panel.lastElementChild).toContainElement(error);
  fireEvent.click(screen.getByRole("tab", { name: t.listTab }));
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: t.editTab }));
  expect(screen.queryByRole("alert")).toBeNull();
});
