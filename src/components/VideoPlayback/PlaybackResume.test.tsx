import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { useAuthStore } from "@/gateways/auth/authStore";
import { VideoPlaybackProvider, useVideoPlayback } from "./VideoPlaybackProvider";
import type { PlaybackStore } from "./playbackStore";
import type { YouTubePlayerOptions } from "./youtubeIframeApi";
import { miniPlayerStorageKey } from "./playbackPersistence";

vi.mock("@/i18n/I18nProvider", () => ({ useI18n: () => ({ dictionary: dictionaries.en }) }));

let store: PlaybackStore;
const saved = new Map<string, string>();
const players: ReturnType<typeof makePlayer>[] = [];
function makePlayer(options: YouTubePlayerOptions) {
  let videoId = options.videoId;
  const player = {
    options,
    playVideo: vi.fn(), destroy: vi.fn(), seekTo: vi.fn(),
    getVideoUrl: () => `https://www.youtube.com/watch?v=${videoId}`,
    getCurrentTime: vi.fn(() => 0), getPlayerState: vi.fn(() => 1),
    loadVideoById: vi.fn((id: string) => { videoId = id; }),
  };
  void Promise.resolve().then(() => options.events.onReady());
  return player;
}
function Capture() {
  const playback = useVideoPlayback()!;
  useEffect(() => { store = playback.store; }, [playback]);
  return null;
}
const mount = () => render(<VideoPlaybackProvider><Capture /></VideoPlaybackProvider>);
const flush = () => act(async () => { await Promise.resolve(); });
const snapshot = () => JSON.parse(saved.get(miniPlayerStorageKey)!);

beforeEach(() => {
  saved.clear();
  players.length = 0;
  useAuthStore.setState({ status: "guest", identity: null });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => { saved.set(key, value); },
    removeItem: (key: string) => { saved.delete(key); },
  });
  vi.stubGlobal("YT", { Player: function (_element: HTMLElement, options: YouTubePlayerOptions) {
    const player = makePlayer(options);
    players.push(player);
    return player;
  } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("restores YouTube progress once, ignores pre-seek time and starts the next video from zero", async () => {
  const view = mount();
  act(() => {
    store.getState().start("public", [
      { identifier: "one", videoId: "abcdefghijk", title: "First" },
      { identifier: "two", videoId: "lmnopqrstuv", title: "Second" },
    ], "queue");
    store.getState().detach();
  });
  await flush();
  players[0].getCurrentTime.mockReturnValue(42);
  act(() => players[0].options.events.onStateChange({ data: 1 }));
  expect(snapshot().session.seconds).toBe(42);
  expect(players[0].seekTo).not.toHaveBeenCalled();
  view.unmount();
  mount();
  await flush();
  const restored = players[1];
  expect(restored.seekTo).toHaveBeenCalledExactlyOnceWith(42, true);
  act(() => restored.options.events.onStateChange({ data: 1 }));
  expect(snapshot().session.seconds).toBe(42);
  restored.getCurrentTime.mockReturnValue(48);
  act(() => restored.options.events.onStateChange({ data: 1 }));
  expect(snapshot().session.seconds).toBe(48);
  expect(restored.seekTo).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Next video" }));
  expect(snapshot().session.seconds).toBe(0);
  expect(restored.loadVideoById).toHaveBeenCalledWith("lmnopqrstuv");
  expect(restored.seekTo).toHaveBeenCalledTimes(1);
});

it("keeps restored YouTube playback ready for native controls when autoplay is blocked", async () => {
  const view = mount();
  act(() => {
    store.getState().start("public", [{ identifier: "one", videoId: "abcdefghijk", title: "First" }], "queue");
    store.getState().detach();
    store.getState().updateProgress(1, 42, "abcdefghijk", "youtube", 0);
  });
  await flush();
  view.unmount();
  mount();
  await flush();
  act(() => players[1].options.events.onAutoplayBlocked());
  expect(screen.queryByText(/Autoplay was blocked/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Resume playback" })).not.toBeInTheDocument();
  expect(snapshot().session.seconds).toBe(42);
  expect(players[1].destroy).not.toHaveBeenCalled();
  players[1].getCurrentTime.mockReturnValue(48);
  act(() => players[1].options.events.onStateChange({ data: 1 }));
  expect(snapshot().session.seconds).toBe(48);
});

it("restores TikTok progress after ready and resets it on a one-video loop", async () => {
  const videoId = "6718335390845095173";
  const view = mount();
  act(() => {
    store.getState().start("public", [{ identifier: "one", videoId, provider: "tiktok", title: "TikTok" }], "queue", "one");
    store.getState().detach();
  });
  let frame = document.querySelector<HTMLIFrameElement>('iframe[title="TikTok"]')!;
  const send = (type: string, value?: unknown) => act(() => {
    window.dispatchEvent(new MessageEvent("message", { origin: "https://www.tiktok.com", source: frame.contentWindow, data: { "x-tiktok-player": true, type, value } }));
  });
  send("onPlayerReady");
  send("onStateChange", 1);
  send("onCurrentTime", { currentTime: 18, duration: 100 });
  expect(snapshot().session.seconds).toBe(18);
  view.unmount();
  mount();
  frame = document.querySelector<HTMLIFrameElement>('iframe[title="TikTok"]')!;
  const command = vi.spyOn(frame.contentWindow!, "postMessage");
  send("onPlayerReady");
  expect(command).toHaveBeenCalledWith({ "x-tiktok-player": true, type: "seekTo", value: 18 }, "https://www.tiktok.com");
  send("onStateChange", 1);
  send("onCurrentTime", { currentTime: 0, duration: 100 });
  expect(snapshot().session.seconds).toBe(18);
  send("onCurrentTime", { currentTime: 24, duration: 100 });
  expect(snapshot().session.seconds).toBe(24);
  expect(command.mock.calls.filter(([data]) => data.type === "seekTo")).toHaveLength(1);
  send("onStateChange", 0);
  expect(snapshot().session.seconds).toBe(0);
  frame = document.querySelector<HTMLIFrameElement>('iframe[title="TikTok"]')!;
  const nextCommand = vi.spyOn(frame.contentWindow!, "postMessage");
  send("onPlayerReady");
  expect(nextCommand.mock.calls.some(([data]) => data.type === "seekTo")).toBe(false);
});
