import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { VideoPlaybackProvider, useVideoPlayback } from "./VideoPlaybackProvider";
import type { PlaybackStore } from "./playbackStore";

vi.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ dictionary: dictionaries.en }),
}));
vi.mock("./YouTubeQueuePlayer", () => ({
  YouTubeQueuePlayer: ({ videoId }: { videoId: string }) => <div data-testid="player">{videoId}</div>,
}));

let store: PlaybackStore;
function CaptureStore() {
  const context = useVideoPlayback()!;
  useEffect(() => { store = context.store; }, [context]);
  return null;
}
const tracks = [
  { identifier: "first", videoId: "abcdefghijk", title: "First" },
  { identifier: "second", videoId: "lmnopqrstuv", title: "Second" },
  { identifier: "third", videoId: "zyxwvutsrqp", title: "Third" },
];
const setup = () => render(<VideoPlaybackProvider><CaptureStore /></VideoPlaybackProvider>);
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("shows navigation below the floating queue player and preserves the player when switching videos", () => {
  setup();
  act(() => store.getState().start("playlist", tracks, "queue"));
  expect(screen.queryByRole("button", { name: "Next video" })).toBeNull();
  const player = screen.getByTestId("player");
  act(() => store.getState().detach());
  const mini = within(screen.getByRole("region", { name: "Mini player" }));
  const previous = mini.getByRole("button", { name: "Previous video" });
  const next = mini.getByRole("button", { name: "Next video" });
  expect(player.compareDocumentPosition(previous) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(previous).toBeDisabled();
  fireEvent.click(next);
  expect(player).toHaveTextContent(tracks[1].videoId);
  fireEvent.click(next);
  expect(player).toHaveTextContent(tracks[2].videoId);
  expect(next).toBeDisabled();
  fireEvent.click(previous);
  expect(player).toHaveTextContent(tracks[1].videoId);
  expect(store.getState().floating).toBe(true);
  expect(screen.getByTestId("player")).toBe(player);
  act(() => store.getState().restore("playlist"));
  expect(screen.queryByRole("button", { name: "Next video" })).toBeNull();
  expect(screen.getByTestId("player")).toBe(player);
});

it.each(["all", "one"] as const)("follows shuffle order and respects %s loop boundaries in the mini player", (loop) => {
  setup();
  vi.spyOn(Math, "random").mockReturnValue(0);
  act(() => {
    store.getState().start("playlist", tracks, "queue", loop, true);
    store.getState().detach();
  });
  const player = screen.getByTestId("player");
  const previous = screen.getByRole("button", { name: "Previous video" });
  const next = screen.getByRole("button", { name: "Next video" });
  expect(player).toHaveTextContent(tracks[1].videoId);
  fireEvent.click(next);
  expect(player).toHaveTextContent(tracks[2].videoId);
  fireEvent.click(next);
  expect(player).toHaveTextContent(tracks[0].videoId);
  if (loop === "all") {
    fireEvent.click(next);
    expect(player).toHaveTextContent(tracks[1].videoId);
    fireEvent.click(previous);
    expect(player).toHaveTextContent(tracks[0].videoId);
  } else expect(next).toBeDisabled();
});

it("disables both navigation buttons for a one-video queue and hides them for single playback", () => {
  setup();
  act(() => {
    store.getState().start("playlist", tracks.slice(0, 1), "queue", "all");
    store.getState().detach();
  });
  expect(screen.getByRole("button", { name: "Previous video" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Next video" })).toBeDisabled();
  act(() => store.getState().start("video", tracks.slice(0, 1), "single"));
  expect(screen.queryByRole("button", { name: "Previous video" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Next video" })).toBeNull();
});
