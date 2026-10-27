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
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

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

it("overlays fullscreen controls, hides them when idle and reveals them on tap or pointer movement", () => {
  vi.useFakeTimers();
  setup();
  act(() => {
    store.getState().start("playlist", [{ ...tracks[0], provider: "tiktok", videoId: "6740558728342359297" }], "queue");
    store.getState().detach();
  });
  const frame = screen.getAllByTitle("First").find((node) => node.tagName === "IFRAME") as HTMLIFrameElement;
  const host = screen.getByRole("region", { name: "Mini player" });
  fireEvent.click(screen.getByRole("button", { name: "Play in fullscreen" }));
  const bars = host.querySelectorAll("[data-fullscreen-bar]");
  expect(bars).toHaveLength(1);
  expect(bars[0]).toHaveAttribute("data-fullscreen-bar", "top");
  expect(within(bars[0] as HTMLElement).getByRole("button", { name: "Next video" })).toBeInTheDocument();
  for (const bar of bars) {
    expect(bar).toHaveClass("absolute", "bg-black/50", "opacity-100");
  }
  expect(frame.closest("[data-player-interactive]")).toHaveClass("absolute", "inset-0");
  act(() => vi.advanceTimersByTime(3000));
  expect(screen.queryByRole("button", { name: "Exit fullscreen" })).toBeNull();
  for (const bar of bars) {
    expect(bar).toHaveAttribute("inert");
    expect(bar).toHaveClass("opacity-0");
  }
  fireEvent.click(screen.getByRole("button", { name: "Show playback controls" }));
  expect(screen.getByRole("button", { name: "Exit fullscreen" })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(3000));
  fireEvent.pointerMove(screen.getByRole("button", { name: "Show playback controls" }));
  expect(screen.getByRole("button", { name: "Exit fullscreen" })).toBeInTheDocument();
  expect(host.querySelector("iframe")).toBe(frame);
  fireEvent.click(screen.getByRole("button", { name: "Exit fullscreen" }));
  act(() => vi.advanceTimersByTime(3000));
  expect(screen.getByRole("button", { name: "Play in fullscreen" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next video" })).toBeInTheDocument();
  expect(host.querySelector("iframe")).toBe(frame);
});

it.each([false, true])("groups all fullscreen queue controls in the top bar (mini: %s)", (mini) => {
  setup();
  act(() => {
    store.getState().start("playlist", tracks, "queue");
    if (mini) store.getState().detach();
  });
  const player = screen.getByTestId("player");
  fireEvent.click(screen.getByRole("button", { name: "Play in fullscreen" }));
  const host = screen.getByRole("region", { name: mini ? "Mini player" : "Now playing" });
  const bar = within(host.querySelector<HTMLElement>('[data-fullscreen-bar="top"]')!);
  expect(host.querySelector('[data-fullscreen-bar="bottom"]')).toBeNull();
  expect(bar.getByRole("button", { name: "Previous video" })).toBeDisabled();
  fireEvent.click(bar.getByRole("button", { name: "Next video" }));
  expect(player).toHaveTextContent(tracks[1].videoId);
  fireEvent.click(bar.getByRole("button", { name: "Previous video" }));
  expect(player).toHaveTextContent(tracks[0].videoId);
  expect(bar.getByRole("button", { name: "Random playback" })).toBeInTheDocument();
  expect(bar.getByRole("button", { name: "Loop playback" })).toBeInTheDocument();
  expect(bar.getByRole("button", { name: "Stop playback" })).toBeInTheDocument();
});

it("keeps the fullscreen bar visible during hover and keyboard focus, then resumes the idle timer", () => {
  vi.useFakeTimers();
  setup();
  act(() => {
    store.getState().start("playlist", tracks, "queue");
    store.getState().detach();
  });
  fireEvent.click(screen.getByRole("button", { name: "Play in fullscreen" }));
  const exit = screen.getByRole("button", { name: "Exit fullscreen" });
  const bar = exit.closest("[data-fullscreen-bar]")!;
  fireEvent.pointerEnter(bar);
  act(() => vi.advanceTimersByTime(5000));
  expect(exit).not.toHaveAttribute("aria-hidden");
  expect(bar).not.toHaveAttribute("inert");
  fireEvent.pointerLeave(bar);
  act(() => vi.advanceTimersByTime(3000));
  expect(bar).toHaveAttribute("inert");
  fireEvent.keyDown(screen.getByRole("region", { name: "Mini player" }), { key: "Tab" });
  act(() => exit.focus());
  act(() => vi.advanceTimersByTime(5000));
  expect(bar).not.toHaveAttribute("inert");
  act(() => exit.blur());
  act(() => vi.advanceTimersByTime(3000));
  expect(bar).toHaveAttribute("inert");
});
