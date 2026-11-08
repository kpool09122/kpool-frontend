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
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("restores the mini player after remount and clears saved playback when closed", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
  const view = setup();
  act(() => {
    store.getState().start("playlist", tracks, "queue");
    store.getState().detach();
  });
  fireEvent.click(screen.getByRole("button", { name: "Next video" }));
  const previousStore = store;
  view.unmount();
  setup();
  expect(store).not.toBe(previousStore);
  expect(screen.getByRole("region", { name: "Mini player" })).toBeInTheDocument();
  expect(screen.getByTestId("player")).toHaveTextContent(tracks[1].videoId);
  fireEvent.click(screen.getByRole("button", { name: "Next video" }));
  expect(screen.getByTestId("player")).toHaveTextContent(tracks[2].videoId);
  fireEvent.click(screen.getByRole("button", { name: "Stop playback" }));
  cleanup();
  setup();
  expect(screen.queryByRole("region", { name: "Mini player" })).toBeNull();
});

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

it("starts mobile mini playback behind a move layer, restores it after three seconds and keeps desktop controls visible", () => {
  vi.useFakeTimers();
  let mobile = true;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", () => ({
    matches: mobile,
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
  }));
  setup();
  act(() => {
    store.getState().start("playlist", tracks, "queue");
    store.getState().detach();
  });
  const host = screen.getByRole("region", { name: "Mini player" });
  const player = screen.getByTestId("player");
  expect(host.querySelector("[data-mini-player-bar]")).toBeNull();
  expect(host.querySelector("[data-player-resize]")).toBeNull();
  const bar = host.querySelector("[data-mini-player-icons]")!;
  expect(bar).toHaveAttribute("inert");
  expect(bar).toHaveClass("opacity-0");
  fireEvent.click(screen.getByRole("button", { name: "Show playback controls" }));
  expect(bar).not.toHaveAttribute("inert");
  expect(bar).toHaveClass("opacity-100");
  expect(screen.queryByRole("button", { name: "Show playback controls" })).toBeNull();
  act(() => vi.advanceTimersByTime(2999));
  expect(bar).not.toHaveAttribute("inert");
  act(() => vi.advanceTimersByTime(1));
  expect(bar).toHaveAttribute("inert");
  act(() => { mobile = false; listeners.forEach((listener) => listener()); });
  expect(bar).not.toHaveAttribute("inert");
  expect(screen.queryByRole("button", { name: "Show playback controls" })).toBeNull();
  act(() => vi.advanceTimersByTime(5000));
  expect(bar).not.toHaveAttribute("inert");
  expect(screen.getByTestId("player")).toBe(player);
  expect(store.getState().floating).toBe(true);
});

it.each(["queue", "single"] as const)("defaults mobile fullscreen to landscape, toggles orientation and preserves %s playback", (kind) => {
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
  setup();
  act(() => {
    store.getState().start("playlist", tracks, kind);
    store.getState().detach();
  });
  const host = screen.getByRole("region", { name: "Mini player" });
  const player = screen.getByTestId("player");
  const surface = host.querySelector<HTMLElement>("[data-player-surface]")!;
  expect(screen.queryByRole("button", { name: "Switch to portrait" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show playback controls" }));
  fireEvent.click(screen.getByRole("button", { name: "Play in fullscreen" }));
  expect(surface.style.transform).toContain("rotate(90deg)");
  const buttons = host.querySelector('[data-fullscreen-bar="top"]')!.querySelectorAll("button");
  expect([...buttons].slice(-3).map((button) => button.getAttribute("aria-label")))
    .toEqual(["Exit fullscreen", "Switch to portrait", "Stop playback"]);
  fireEvent.click(screen.getByRole("button", { name: "Switch to portrait" }));
  expect(surface.style.transform).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Switch to landscape" }));
  expect(surface.style.transform).toContain("rotate(90deg)");
  act(() => {
    vi.stubGlobal("innerWidth", 844);
    vi.stubGlobal("innerHeight", 390);
    window.dispatchEvent(new Event("resize"));
  });
  expect(surface.style.transform).toBe("");
  expect(screen.getByRole("button", { name: "Switch to portrait" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Switch to portrait" }));
  expect(surface.style.transform).toContain("rotate(90deg)");
  fireEvent.click(screen.getByRole("button", { name: "Exit fullscreen" }));
  expect(surface.style.transform).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Show playback controls" }));
  fireEvent.click(screen.getByRole("button", { name: "Play in fullscreen" }));
  expect(screen.getByRole("button", { name: "Switch to portrait" })).toBeInTheDocument();
  expect(surface.style.transform).toBe("");
  expect(screen.getByTestId("player")).toBe(player);
  expect(store.getState().session?.queue.position).toBe(0);
});

it("keeps orientation controls out of desktop fullscreen", () => {
  setup();
  act(() => store.getState().start("playlist", tracks, "queue"));
  fireEvent.click(screen.getByRole("button", { name: "Play in fullscreen" }));
  expect(screen.queryByRole("button", { name: /Switch to (portrait|landscape)/ })).toBeNull();
});


it("moves and pinches across the mobile video surface without revealing controls, and only unlocks on a tap", () => {
  vi.useFakeTimers();
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
  vi.stubGlobal("PointerEvent", function (type: string, init: PointerEventInit) {
    return Object.assign(new MouseEvent(type, init), {
      pointerId: init.pointerId ?? 0,
      pointerType: init.pointerType ?? "touch",
    });
  });
  setup();
  act(() => {
    store.getState().start("playlist", tracks, "queue");
    store.getState().detach();
  });
  const host = screen.getByRole("region", { name: "Mini player" });
  host.setPointerCapture = vi.fn();
  const layer = screen.getByRole("button", { name: "Show playback controls" });
  const player = screen.getByTestId("player");
  const pointer = (pointerId: number, clientX: number, clientY = 500) => ({ pointerId, pointerType: "touch", button: 0, clientX, clientY });
  const initialLeft = host.style.left;
  fireEvent.pointerDown(layer, pointer(1, 200));
  fireEvent.pointerMove(host, pointer(1, 120, 400));
  fireEvent.pointerUp(host, pointer(1, 120, 400));
  expect(host.style.left).not.toBe(initialLeft);
  expect(layer).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Play in fullscreen" })).toBeNull();
  const initialWidth = parseFloat(host.style.width);
  fireEvent.pointerDown(layer, pointer(2, 100));
  fireEvent.pointerDown(layer, pointer(3, 200));
  fireEvent.pointerMove(host, pointer(3, 300));
  fireEvent.pointerUp(host, pointer(2, 100));
  fireEvent.pointerUp(host, pointer(3, 300));
  expect(parseFloat(host.style.width)).toBeGreaterThan(initialWidth);
  expect(layer).toBeInTheDocument();
  fireEvent.pointerDown(layer, pointer(4, 200));
  fireEvent.pointerCancel(host, pointer(4, 200));
  expect(layer).toBeInTheDocument();
  fireEvent.pointerDown(layer, pointer(5, 200));
  fireEvent.pointerUp(host, pointer(5, 200));
  expect(screen.queryByRole("button", { name: "Show playback controls" })).toBeNull();
  expect(screen.getByRole("button", { name: "Play in fullscreen" })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(3000));
  expect(screen.getByRole("button", { name: "Show playback controls" })).toBeInTheDocument();
  expect(screen.getByTestId("player")).toBe(player);
  fireEvent.keyDown(screen.getByRole("button", { name: "Show playback controls" }), { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: "Stop playback" }));
  expect(screen.queryByRole("region", { name: "Mini player" })).toBeNull();
});
