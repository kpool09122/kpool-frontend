import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { WikiVideo } from "@/gateways/wiki/wikiVideos";
import { WikiVideoPanel } from "./index";
import { WikiEmbedFrame } from "../WikiEmbedFrame";
import { YouTubePlaybackProvider } from "@/components/YouTubePlayback/YouTubePlaybackProvider";
import { YouTubeQueuePlayer } from "@/components/YouTubePlayback/YouTubeQueuePlayer";
import type { YouTubePlayerOptions } from "@/components/YouTubePlayback/youtubeIframeApi";

const first: WikiVideo = {
  videoLinkIdentifier: "00000000-0000-4000-8000-000000000001",
  url: "https://youtu.be/abcdefghijk",
  title: "First video",
  thumbnailUrl: null,
  publishedAt: null,
  durationSeconds: 120,
  creatorPrincipalIdentifier: null,
  creatorIdentityName: null,
  likeCount: 0,
  videoUsage: "youtube_auto_view_count",
};
const second: WikiVideo = {
  ...first,
  videoLinkIdentifier: "00000000-0000-4000-8000-000000000002",
  url: "https://youtu.be/lmnopqrstuv",
  title: "Second video",
};
const invalid: WikiVideo = {
  ...first,
  videoLinkIdentifier: "00000000-0000-4000-8000-000000000003",
  url: "https://tracker.example/abcdefghijk",
  title: "Invalid video",
};
// One record per loaded video; successive records can share one native player.
const requests: {
  options: YouTubePlayerOptions;
  playVideo: ReturnType<typeof vi.fn>;
  loadVideoById: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  getVideoUrl: ReturnType<typeof vi.fn>;
  getPlayerState: ReturnType<typeof vi.fn>;
}[] = [];
let blockAutoplay = false;
const key = ["public-wiki-videos", "ja", "group", "gr-test", {}];
function mount(videos = [first, second], locale: "en" | "ja" | "ko" = "en") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  client.setQueryData(key, { videos });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ videos })));
  const tree = (slug = "gr-test", withEmbed = false) => (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={locale}>
        <YouTubePlaybackProvider>
          <WikiVideoPanel language="ja" resourceType="group" slug={slug} />
          {withEmbed ? <WikiEmbedFrame block={{
            blockType: "embed", blockIdentifier: "body-video", displayOrder: 0,
            provider: "youtube", embedId: "12345678901", caption: "Body video",
          }} /> : null}
        </YouTubePlaybackProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
  return { client, tree, ...render(tree()) };
}
const start = async () => {
  const previous = requests.length;
  fireEvent.click(screen.getByRole("button", { name: "Play all" }));
  await waitFor(() => expect(requests.length).toBeGreaterThan(previous));
};
function expectCurrentVideo(video: WikiVideo, position: number, total: number) {
  expect(requests.at(-1)?.options.videoId).toBe(
    new URL(video.url).pathname.slice(1),
  );
  expect(screen.getByRole("region", { name: "Now playing" })).toHaveTextContent(
    `${video.title} (${position}/${total})`,
  );
  expect(
    screen.getByRole("heading", { name: video.title }).closest("li"),
  ).toHaveAttribute("aria-current", "true");
  expect(document.querySelectorAll('li[aria-current="true"]')).toHaveLength(1);
}
beforeEach(() => {
  requests.length = 0;
  blockAutoplay = false;
  useAuthStore.setState({ status: "guest", identity: null });
  vi.stubGlobal("YT", {
    Player: vi.fn(function (
      _element: HTMLElement,
      options: YouTubePlayerOptions,
    ) {
      const player = {
        playVideo: vi.fn(() => {
          if (blockAutoplay) {
            player.getPlayerState.mockReturnValue(2);
            options.events.onAutoplayBlocked();
            return;
          }
          player.getPlayerState.mockReturnValue(1);
          options.events.onStateChange({ data: 1 });
        }),
        loadVideoById: vi.fn((id: string) => {
          // YouTube may deliver the previous track's ENDED while loading.
          options.events.onStateChange({ data: 0 });
          record(id);
          player.playVideo();
        }),
        destroy: vi.fn(() => _element.remove()),
        getVideoUrl: vi.fn(() => `https://www.youtube.com/watch?v=${options.videoId}`),
        getPlayerState: vi.fn(() => 1),
      };
      function record(id: string) {
        player.getVideoUrl.mockReturnValue(`https://www.youtube.com/watch?v=${id}`);
        const recorded: (typeof requests)[number] = {
          ...player,
          options: { ...options, videoId: id, events: {
            ...options.events,
            onStateChange: ({ data }) => {
              if (requests.at(-1) === recorded) player.getPlayerState.mockReturnValue(data);
              options.events.onStateChange({ data });
            },
          } },
        };
        requests.push(recorded);
      }
      record(options.videoId);
      void Promise.resolve().then(() => options.events.onReady());
      return player;
    }),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document
    .querySelectorAll('script[src="https://www.youtube.com/iframe_api"]')
    .forEach((script) => script.remove());
});

describe("continuous playback", () => {
  it.each([false, true])("keeps the fullscreen host through video changes and restores presentation (mini: %s)", async (mini) => {
    let fullscreenElement: Element | null = null;
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreenElement });
    const enter = vi.fn(() => {
      fullscreenElement = screen.getByRole("button", { name: "Play in fullscreen" }).closest("section");
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    const exit = vi.fn(() => {
      fullscreenElement = null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { configurable: true, value: enter });
    Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exit });
    try {
      mount();
      await start();
      if (mini) fireEvent.click(screen.getByRole("button", { name: "Continue in mini player" }));
      const host = screen.getByRole("region", { name: mini ? "Mini player" : "Now playing" });
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Play in fullscreen" })));
      expect(fullscreenElement).toBe(host);
      expect(host.querySelector("[data-player-resize]")).toBeNull();
      act(() => requests[0].options.events.onStateChange({ data: 0 }));
      expect(host).toHaveTextContent("Second video (2/2)");
      expect(fullscreenElement).toBe(host);
      expect(requests[0].destroy).not.toHaveBeenCalled();
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Exit fullscreen" })));
      expect(exit).toHaveBeenCalledOnce();
      expect(screen.getByRole("button", { name: "Play in fullscreen" })).toHaveAttribute("aria-pressed", "false");
      expect(host.querySelectorAll("[data-player-resize]")).toHaveLength(mini ? 8 : 0);
      // Browser exit (e.g. Escape) must also update the toggle.
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Play in fullscreen" })));
      act(() => { void exit(); });
      expect(screen.getByRole("button", { name: "Play in fullscreen" })).toBeInTheDocument();
    } finally {
      delete (HTMLElement.prototype as Partial<HTMLElement>).requestFullscreen;
      Reflect.deleteProperty(document, "fullscreenEnabled");
      Reflect.deleteProperty(document, "fullscreenElement");
      delete (document as Partial<Document>).exitFullscreen;
    }
  });

  it("reports a rejected fullscreen request and continues playback", async () => {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true, value: vi.fn().mockRejectedValue(new Error("denied")),
    });
    try {
      mount();
      await start();
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Play in fullscreen" })));
      expect(screen.getByText("Could not switch fullscreen. Please try again.")).toBeInTheDocument();
      expect(requests[0].destroy).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Play in fullscreen" })).toHaveAttribute("aria-pressed", "false");
    } finally {
      delete (HTMLElement.prototype as Partial<HTMLElement>).requestFullscreen;
      Reflect.deleteProperty(document, "fullscreenEnabled");
      Reflect.deleteProperty(document, "fullscreenElement");
    }
  });

  it.each([false, true])("updates the title and queue position without an ended event (random: %s)", async (random) => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    mount();
    if (random) fireEvent.click(screen.getByRole("button", { name: "Random playback" }));
    await start();
    const target = random ? first : second;
    requests[0].getVideoUrl.mockReturnValue(target.url);
    act(() => requests[0].options.events.onStateChange({ data: 1 }));
    expect(screen.getByRole("region", { name: "Now playing" })).toHaveTextContent(
      `${target.title} (2/2)`,
    );
    expect(requests[0].destroy).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: target.title }).closest("li"))
      .toHaveAttribute("aria-current", "true");
    act(() => requests[0].options.events.onStateChange({ data: 0 }));
    expect(screen.queryByRole("region", { name: "Now playing" })).not.toBeInTheDocument();
    expect(requests).toHaveLength(1);
  });
  it.each(["ended", "changed video"])(
    "reconciles player state after seeking near the end without a notification: %s",
    async (scenario) => {
      vi.useFakeTimers();
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Play all" }));
      await act(async () => {});
      expect(requests).toHaveLength(1);
      act(() => requests[0].options.events.onReady());
      if (scenario === "ended") requests[0].getPlayerState.mockReturnValue(0);
      else requests[0].getVideoUrl.mockReturnValue(second.url);
      await act(async () => vi.advanceTimersByTimeAsync(501));
      expect(screen.getByRole("region", { name: "Now playing" })).toHaveTextContent(
        "Second video (2/2)",
      );
      if (scenario === "ended") {
        expect(requests).toHaveLength(2);
        expect(requests[0].destroy).not.toHaveBeenCalled();
        // A delayed ended notification must not advance the new player again.
        act(() => requests[0].options.events.onStateChange({ data: 0 }));
        expect(requests).toHaveLength(2);
      } else {
        expect(requests).toHaveLength(1);
        expect(requests[0].destroy).not.toHaveBeenCalled();
      }
      fireEvent.click(screen.getByRole("button", { name: "Stop playback" }));
      await act(async () => vi.advanceTimersByTimeAsync(2_000));
      expect(screen.queryByRole("region", { name: "Now playing" })).not.toBeInTheDocument();
    },
  );
  it("clears the previous title if the player switches outside the queue", async () => {
    mount();
    await start();
    requests[0].getVideoUrl.mockReturnValue("https://youtu.be/12345678901");
    act(() => requests[0].options.events.onStateChange({ data: 1 }));
    expect(screen.queryByRole("region", { name: "Now playing" })).not.toBeInTheDocument();
    expect(screen.getByText(/outside this list/)).toBeInTheDocument();
    expect(requests[0].destroy).toHaveBeenCalledOnce();
  });
  it("toggles playback options with pressed state and allows changes during playback", async () => {
    mount();
    const loop = screen.getByRole("button", { name: "Loop playback" });
    const random = screen.getByRole("button", { name: "Random playback" });
    expect(loop).toHaveAttribute("aria-pressed", "false");
    expect(random).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(loop);
    fireEvent.click(random);
    expect(loop).toHaveAttribute("aria-pressed", "true");
    expect(random).toHaveAttribute("aria-pressed", "true");
    await start();
    fireEvent.click(loop);
    fireEvent.click(random);
    expect(loop).toHaveAttribute("aria-pressed", "false");
    expect(random).toHaveAttribute("aria-pressed", "false");
    expect(requests).toHaveLength(1);
    expect(requests[0].destroy).not.toHaveBeenCalled();
    act(() => requests[0].options.events.onStateChange({ data: 0 }));
    await waitFor(() => expect(requests).toHaveLength(2));
    act(() => requests[1].options.events.onStateChange({ data: 0 }));
    expect(screen.queryByRole("region", { name: "Now playing" })).not.toBeInTheDocument();
  });
  it("shuffles only upcoming videos when enabled during playback", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const third = { ...invalid, url: "https://youtu.be/12345678901" };
    mount([first, second, third]);
    await start();
    expectCurrentVideo(first, 1, 3);
    const random = screen.getByRole("button", { name: "Random playback" });
    fireEvent.click(random);
    expect(requests[0].destroy).not.toHaveBeenCalled();
    expectCurrentVideo(first, 1, 3);
    act(() => requests[0].options.events.onStateChange({ data: 0 }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].options.videoId).toBe("12345678901");
    expectCurrentVideo(third, 2, 3);
    fireEvent.click(random);
    expectCurrentVideo(third, 2, 3);
    act(() => requests[1].options.events.onStateChange({ data: 0 }));
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].options.videoId).toBe("lmnopqrstuv");
    expectCurrentVideo(second, 3, 3);
  });
  it("loops the list and stops when requested", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Loop playback" }));
    await start();
    for (let i = 0; i < 2; i++) {
      act(() => requests[i].options.events.onStateChange({ data: 0 }));
      await waitFor(() => expect(requests).toHaveLength(i + 2));
    }
    expect(requests.map((player) => player.options.videoId)).toEqual([
      "abcdefghijk", "lmnopqrstuv", "abcdefghijk",
    ]);
    expect(screen.getByText("First video (1/2)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop playback" }));
    act(() => requests[2].options.events.onStateChange({ data: 0 }));
    expect(requests).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Loop playback" })).toBeEnabled();
  });
  it("reloads a single video without recreating the player", async () => {
    mount([first]);
    fireEvent.click(screen.getByRole("button", { name: "Loop playback" }));
    await start();
    act(() => requests[0].options.events.onStateChange({ data: 0 }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0].destroy).not.toHaveBeenCalled();
    expect(requests[1].options.videoId).toBe("abcdefghijk");
    expect(requests[0].loadVideoById).toHaveBeenCalledWith("abcdefghijk");
  });
  it.each([false, true])("shuffles without repeats within a pass (loop: %s)", async (loop) => {
    const third = { ...invalid, url: "https://youtu.be/12345678901" };
    vi.spyOn(Math, "random").mockReturnValue(0);
    mount([first, second, third]);
    fireEvent.click(screen.getByRole("button", { name: "Random playback" }));
    if (loop) fireEvent.click(screen.getByRole("button", { name: "Loop playback" }));
    await start();
    expect(screen.getByRole("button", { name: "Random playback" })).toBeEnabled();
    expectCurrentVideo(second, 1, 3);
    for (let i = 0; i < 2; i++) {
      act(() => requests[i].options.events.onStateChange({ data: 0 }));
      await waitFor(() => expect(requests).toHaveLength(i + 2));
      expectCurrentVideo([third, first][i], i + 2, 3);
    }
    expect(requests.map((player) => player.options.videoId)).toEqual([
      "lmnopqrstuv", "12345678901", "abcdefghijk",
    ]);
    act(() => requests[2].options.events.onStateChange({ data: 0 }));
    if (loop) {
      await waitFor(() => expect(requests).toHaveLength(4));
      expect(requests[3].options.videoId).not.toBe(requests[2].options.videoId);
      expectCurrentVideo(second, 1, 3);
    } else {
      expect(screen.queryByRole("region", { name: "Now playing" })).not.toBeInTheDocument();
      expect(requests).toHaveLength(3);
    }
  });
  it("excludes failed videos from later loops and stops when all have failed", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Loop playback" }));
    await start();
    act(() => requests[0].options.events.onError());
    await waitFor(() => expect(requests).toHaveLength(2));
    act(() => requests[1].options.events.onStateChange({ data: 0 }));
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].options.videoId).toBe("lmnopqrstuv");
    expect(screen.getByText("Second video (1/1)")).toBeInTheDocument();
    act(() => requests[2].options.events.onError());
    expect(screen.queryByRole("region", { name: "Now playing" })).not.toBeInTheDocument();
    expect(requests).toHaveLength(3);
  });
  it("avoids repeating the last video when the next shuffled pass starts with it", async () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.99).mockReturnValue(0);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Loop playback" }));
    fireEvent.click(screen.getByRole("button", { name: "Random playback" }));
    await start();
    for (let i = 0; i < 2; i++) {
      act(() => requests[i].options.events.onStateChange({ data: 0 }));
      await waitFor(() => expect(requests).toHaveLength(i + 2));
    }
    expect(requests.map((player) => player.options.videoId)).toEqual([
      "abcdefghijk", "lmnopqrstuv", "abcdefghijk",
    ]);
  });
  it("stops after a full pass of errors even with loop and random enabled", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Loop playback" }));
    fireEvent.click(screen.getByRole("button", { name: "Random playback" }));
    await start();
    act(() => requests[0].options.events.onError());
    await waitFor(() => expect(requests).toHaveLength(2));
    act(() => requests[1].options.events.onError());
    expect(screen.queryByRole("button", { name: "Stop playback" })).not.toBeInTheDocument();
    expect(requests).toHaveLength(2);
  });
  it("excludes invalid URLs, preserves display order and marks the current card", async () => {
    mount([second, invalid, first]);
    await start();
    expect(requests[0].options).toMatchObject({
      videoId: "lmnopqrstuv",
      host: "https://www.youtube-nocookie.com",
      playerVars: { playsinline: 1, origin: window.location.origin },
    });
    expect(
      screen.getByText("Second video (1/2)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: second.title }).closest("li"),
    ).toHaveAttribute("aria-current", "true");
    act(() => requests[0].options.events.onStateChange({ data: 0 }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].options.videoId).toBe("abcdefghijk");
    expect(
      screen.getByRole("heading", { name: second.title }).closest("li"),
    ).not.toHaveAttribute("aria-current");
  });
  it.each([{ videos: [] }, { videos: [invalid] }])(
    "disables start with no playable videos: %j",
    ({ videos }) => {
      mount(videos);
      expect(screen.getByRole("button", { name: "Play all" })).toBeDisabled();
      expect(requests).toHaveLength(0);
    },
  );
  it("finishes a single video and can start again", async () => {
    mount([first]);
    await start();
    act(() => requests[0].options.events.onStateChange({ data: 0 }));
    expect(requests[0].destroy).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("region", { name: "Now playing" }),
    ).not.toBeInTheDocument();
    await start();
    await waitFor(() => expect(requests).toHaveLength(2));
  });
  it("returns keyboard focus to the start button after stopping", async () => {
    mount();
    await start();
    const stop = screen.getByRole("button", { name: "Stop playback" });
    stop.focus();
    fireEvent.click(stop);
    expect(screen.getByRole("button", { name: "Play all" })).toHaveFocus();
  });
  it("prevents restarting an active item without first stopping it", async () => {
    mount();
    await start();
    expect(screen.getByRole("button", { name: "Play all" })).toBeDisabled();
  });
  it("skips unavailable videos exactly once and never loops when every item fails", async () => {
    mount();
    await start();
    act(() => {
      requests[0].options.events.onError();
      requests[0].options.events.onError();
      requests[0].options.events.onStateChange({ data: 0 });
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(
      screen.getByText("Skipped an unavailable video: First video"),
    ).toBeInTheDocument();
    act(() => requests[1].options.events.onError());
    expect(requests[1].destroy).toHaveBeenCalledOnce();
    expect(
      screen.getByText("Skipped an unavailable video: Second video"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Stop playback" }),
    ).not.toBeInTheDocument();
    expect(requests).toHaveLength(2);
  });
  it.each(["single", "queue"])("leaves initial blocked %s playback to the embedded player without a resume message", async (kind) => {
    blockAutoplay = true;
    mount();
    if (kind === "queue") await start();
    else {
      fireEvent.click(screen.getByRole("button", { name: `Play: ${first.title}` }));
      await waitFor(() => expect(requests).toHaveLength(1));
    }
    expect(requests[0].playVideo).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Autoplay was blocked/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume playback" })).not.toBeInTheDocument();
    // Starting from YouTube's play button still works without an extra K-Pool step.
    blockAutoplay = false;
    act(() => requests[0].options.events.onStateChange({ data: 1 }));
    expect(screen.getByRole("region", { name: "Now playing" })).toHaveTextContent(first.title);
    if (kind === "queue") expectCurrentVideo(first, 1, 2);
    expect(requests[0].destroy).not.toHaveBeenCalled();
  });
  it("offers manual resume when the next video is blocked without skipping the item", async () => {
    mount();
    await start();
    blockAutoplay = true;
    act(() => requests[0].options.events.onStateChange({ data: 0 }));
    expectCurrentVideo(second, 2, 2);
    expect(screen.getByText(/Autoplay was blocked/)).toBeInTheDocument();
    blockAutoplay = false;
    fireEvent.click(screen.getByRole("button", { name: "Resume playback" }));
    expect(requests[0].playVideo).toHaveBeenCalledTimes(3);
    expect(
      screen.queryByRole("button", { name: "Resume playback" }),
    ).not.toBeInTheDocument();
    expect(requests).toHaveLength(2);
    expect(requests[0].destroy).not.toHaveBeenCalled();
  });
  it("uses one player for individual and continuous playback and ignores late events", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: `Play: ${first.title}` }));
    await waitFor(() => expect(requests).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: `Play: ${second.title}` }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0].destroy).toHaveBeenCalledOnce();
    expect(requests[1].options.videoId).toBe("lmnopqrstuv");
    await start();
    expect(requests[1].destroy).toHaveBeenCalledOnce();
    expect(requests[2].options.videoId).toBe("abcdefghijk");
    fireEvent.click(screen.getByRole("button", { name: `Play: ${second.title}` }));
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(requests[2].destroy).toHaveBeenCalledOnce();
    act(() => requests[2].options.events.onStateChange({ data: 0 }));
    expect(requests).toHaveLength(4);
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Stop playback" }));
    expect(requests[4].destroy).toHaveBeenCalledOnce();
    act(() => {
      requests[4].options.events.onAutoplayBlocked();
      requests[4].options.events.onError();
    });
    expect(screen.queryByRole("region", { name: "Now playing" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Skipped/)).not.toBeInTheDocument();
  });
  it("switches the floating player from the video list to a Wiki body embed", async () => {
    const view = mount();
    view.rerender(view.tree("gr-test", true));
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Continue in mini player" }));
    fireEvent.click(screen.getByRole("button", { name: "Play: Body video" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0].destroy).toHaveBeenCalledOnce();
    expect(requests[1].options.videoId).toBe("12345678901");
    expect(screen.getByRole("region", { name: "Mini player" })).toHaveTextContent("Body video");
    act(() => requests[0].options.events.onStateChange({ data: 0 }));
    expect(requests).toHaveLength(2);
  });
  it("keeps the same player when detached and continues the queue", async () => {
    mount();
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Continue in mini player" }));
    expect(screen.getByRole("region", { name: "Mini player" })).toHaveStyle({ position: "fixed", right: "16px", bottom: "16px" });
    const mini = within(screen.getByRole("region", { name: "Mini player" }));
    const heart = mini.getByRole("button", { name: "Like: First video" });
    expect(heart).toBeEnabled();
    expect(heart).toHaveTextContent("");
    const buttons = mini.getAllByRole("button");
    expect(buttons.indexOf(heart)).toBe(buttons.indexOf(mini.getByRole("button", { name: "Loop playback" })) + 1);
    expect(buttons.indexOf(mini.getByRole("button", { name: "Stop playback" }))).toBe(buttons.indexOf(heart) + 1);
    expect(requests).toHaveLength(1);
    expect(requests[0].destroy).not.toHaveBeenCalled();
    act(() => requests[0].options.events.onStateChange({ data: 0 }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(screen.getByRole("region", { name: "Mini player" })).toHaveTextContent("Second video (2/2)");
    expect(mini.getByRole("button", { name: "Like: Second video" })).toBeInTheDocument();
    expect(mini.queryByRole("button", { name: "Like: First video" })).not.toBeInTheDocument();
  });
  it("retains the queue across Wiki navigation and switches to a new selection", async () => {
    const view = mount();
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Continue in mini player" }));
    view.rerender(view.tree("gr-other"));
    await screen.findByRole("button", { name: "Play all" });
    expect(screen.getByRole("region", { name: "Mini player" })).toHaveTextContent("First video (1/2)");
    expect(requests[0].destroy).not.toHaveBeenCalled();
    act(() => requests[0].options.events.onStateChange({ data: 0 }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].options.videoId).toBe("lmnopqrstuv");
    await start();
    expect(requests[1].destroy).toHaveBeenCalledOnce();
    expect(screen.getByRole("region", { name: "Mini player" })).toHaveTextContent("First video (1/2)");
    fireEvent.click(screen.getByRole("button", { name: "Stop playback" }));
    expect(screen.queryByRole("region", { name: "Mini player" })).not.toBeInTheDocument();
  });
  it.each(["filter", "same filter", "wiki", "delete", "reorder", "unmount"])(
    "destroys playback on %s and rejects late callbacks",
    async (action) => {
      const view = mount();
      await start();
      if (action === "filter" || action === "same filter") {
        if (action === "filter")
          fireEvent.change(
            screen.getByRole("slider", { name: "Minimum duration (minutes)" }),
            { target: { value: "1" } },
          );
        fireEvent.click(screen.getByRole("button", { name: "Apply filter" }));
      } else if (action === "wiki") view.rerender(view.tree("gr-other"));
      else if (action === "delete" || action === "reorder") {
        await act(async () => {
          view.client.setQueryData(key, {
            videos: action === "delete" ? [second] : [second, first],
          });
        });
      } else view.unmount();
      await waitFor(() => expect(requests[0].destroy).toHaveBeenCalledOnce());
      act(() => {
        requests[0].options.events.onStateChange({ data: 0 });
        requests[0].options.events.onReady();
      });
      expect(requests).toHaveLength(1);
      expect(requests[0].playVideo).toHaveBeenCalledOnce();
      expect(
        screen.queryByRole("region", { name: "Now playing" }),
      ).not.toBeInTheDocument();
    },
  );
  it("uses the filtered cached list as the only queue", async () => {
    const view = mount();
    view.client.setQueryData(
      [...key.slice(0, -1), { minDurationSeconds: 60 }],
      { videos: [second] },
    );
    await start();
    fireEvent.change(
      screen.getByRole("slider", { name: "Minimum duration (minutes)" }),
      { target: { value: "1" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply filter" }));
    expect(requests[0].destroy).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Play all" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].options.videoId).toBe("lmnopqrstuv");
    expect(
      screen.getByText("Second video (1/1)"),
    ).toBeInTheDocument();
  });
  it.each([
    ["ja", "連続再生", "再生を停止", "再生中", "ループ再生", "ランダム再生"],
    ["ko", "연속 재생", "재생 중지", "재생 중", "반복 재생", "무작위 재생"],
  ] as const)(
    "localizes playback in %s",
    async (locale, startLabel, stopLabel, currentLabel, loopLabel, randomLabel) => {
      mount([first], locale);
      expect(screen.getByRole("button", { name: loopLabel })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: randomLabel })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: startLabel }));
      await screen.findByRole("region", { name: currentLabel });
      expect(
        screen.getByRole("button", { name: stopLabel }),
      ).toBeInTheDocument();
    },
  );
});

describe("external player lifecycle", () => {
  const player = () => (
    <I18nProvider initialLocale="en">
      <YouTubeQueuePlayer
        videoId="abcdefghijk"
        title="First video"
        onEnded={vi.fn()}
        onError={vi.fn()}
        onUnavailable={vi.fn()}
      />
    </I18nProvider>
  );
  it("keeps a React-owned iframe through Strict Mode setup and video/title updates", async () => {
    const unavailable = vi.fn();
    const tree = (videoId: string, title: string) => (
      <React.StrictMode>
        <I18nProvider initialLocale="en">
          <YouTubeQueuePlayer videoId={videoId} title={title} onEnded={vi.fn()}
            onError={vi.fn()} onUnavailable={unavailable} />
        </I18nProvider>
      </React.StrictMode>
    );
    const view = render(tree("abcdefghijk", "First video"));
    await waitFor(() => expect(requests).toHaveLength(1));
    const frame = screen.getByTitle("First video");
    expect(frame).toBeInstanceOf(HTMLIFrameElement);
    const src = frame.getAttribute("src");
    const url = new URL(src!);
    expect(url.searchParams.get("enablejsapi")).toBe("1");
    expect(url.searchParams.get("origin")).toBe(window.location.origin);
    expect(frame).toHaveAttribute("allowfullscreen");
    expect(frame).toHaveAttribute("allow", expect.stringContaining("autoplay"));
    view.rerender(tree("lmnopqrstuv", "Second video"));
    expect(screen.getByTitle("Second video")).toBe(frame);
    expect(frame).toHaveAttribute("src", src!);
    expect(requests[0].loadVideoById).toHaveBeenCalledExactlyOnceWith("lmnopqrstuv");
    expect(requests[0].destroy).not.toHaveBeenCalled();
    expect(unavailable).not.toHaveBeenCalled();
    view.unmount();
    expect(requests[0].destroy).toHaveBeenCalledOnce();
    expect(frame.isConnected).toBe(false);
  });
  it("reports a player error before ready without waiting for the timeout", async () => {
    const error = vi.fn();
    vi.stubGlobal("YT", { Player: vi.fn(function (_element: HTMLElement, options: YouTubePlayerOptions) {
      void Promise.resolve().then(() => options.events.onError());
      return { playVideo: vi.fn(), loadVideoById: vi.fn(), destroy: vi.fn() };
    }) });
    render(<I18nProvider initialLocale="en">
      <YouTubeQueuePlayer videoId="abcdefghijk" title="First video" onEnded={vi.fn()}
        onError={error} onUnavailable={vi.fn()} />
    </I18nProvider>);
    await waitFor(() => expect(error).toHaveBeenCalledOnce());
  });
  it.each([false, true])("uses updated callbacks and iframe title without recreating the player (before ready: %s)", async (beforeReady) => {
    let options!: YouTubePlayerOptions;
    const native = {
      playVideo: vi.fn(), loadVideoById: vi.fn(), destroy: vi.fn(),
      getVideoUrl: () => "https://youtu.be/abcdefghijk",
      getPlayerState: vi.fn(() => 1),
    };
    const constructor = vi.fn(function (element: HTMLElement, next: YouTubePlayerOptions) {
      options = next;
      expect(element).toBeInstanceOf(HTMLIFrameElement);
      return native;
    });
    vi.stubGlobal("YT", { Player: constructor });
    const previousEnded = vi.fn();
    const latestEnded = vi.fn();
    const tree = (title: string, onEnded: (id?: string) => void) => (
      <I18nProvider initialLocale="en">
        <YouTubeQueuePlayer videoId="abcdefghijk" title={title} onEnded={onEnded}
          onError={vi.fn()} onUnavailable={vi.fn()} />
      </I18nProvider>
    );
    const view = render(tree("Previous title", previousEnded));
    await act(async () => {});
    if (!beforeReady) act(() => options.events.onReady());
    view.rerender(tree("Latest title", latestEnded));
    if (beforeReady) act(() => options.events.onReady());
    expect(screen.getByTitle("Latest title")).toBeInTheDocument();
    act(() => {
      options.events.onStateChange({ data: 1 });
      native.getPlayerState.mockReturnValue(0);
      options.events.onStateChange({ data: 0 });
    });
    expect(previousEnded).not.toHaveBeenCalled();
    expect(latestEnded).toHaveBeenCalledExactlyOnceWith("abcdefghijk");
    expect(constructor).toHaveBeenCalledOnce();
    expect(native.loadVideoById).not.toHaveBeenCalled();
    expect(native.destroy).not.toHaveBeenCalled();
  });
  it.each([false, true])("keeps the instance and ignores old ended states while loading (before ready: %s)", async (beforeReady) => {
    let options!: YouTubePlayerOptions;
    let actualId = "abcdefghijk";
    let state = 1;
    const native = {
      playVideo: vi.fn(), loadVideoById: vi.fn(), destroy: vi.fn(),
      getVideoUrl: () => `https://youtu.be/${actualId}`,
      getPlayerState: () => state,
    };
    const constructor = vi.fn(function (_element: HTMLElement, next: YouTubePlayerOptions) {
      options = next;
      return native;
    });
    vi.stubGlobal("YT", { Player: constructor });
    const ended = vi.fn();
    const changed = vi.fn();
    const tree = (id: string) => <I18nProvider initialLocale="en">
      <YouTubeQueuePlayer videoId={id} title={id} onEnded={ended}
        onVideoChange={changed} onError={vi.fn()} onUnavailable={vi.fn()} />
    </I18nProvider>;
    const view = render(tree(actualId));
    await act(async () => {});
    if (!beforeReady) act(() => {
      options.events.onReady();
      options.events.onStateChange({ data: 1 });
    });
    view.rerender(tree("lmnopqrstuv"));
    if (beforeReady) act(() => options.events.onReady());
    expect(constructor).toHaveBeenCalledOnce();
    expect(native.loadVideoById).toHaveBeenCalledExactlyOnceWith("lmnopqrstuv");
    expect(native.destroy).not.toHaveBeenCalled();
    act(() => {
      state = 0;
      options.events.onStateChange({ data: 0 });
      state = 1;
      options.events.onStateChange({ data: 1 });
    });
    expect(ended).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    act(() => {
      actualId = "lmnopqrstuv";
      options.events.onStateChange({ data: 1 });
      state = 0;
      options.events.onStateChange({ data: 0 });
      options.events.onStateChange({ data: 0 });
    });
    expect(ended).toHaveBeenCalledExactlyOnceWith("lmnopqrstuv");
    view.unmount();
    expect(native.destroy).toHaveBeenCalledOnce();
  });
  it("does not create a player if unmounted before the constructor microtask", async () => {
    const view = render(player());
    view.unmount();
    await act(async () => {});
    expect(requests).toHaveLength(0);
  });
  it("cleans API polling/timeout after unmount, before the script loads", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("YT", undefined);
    const view = render(player());
    expect(vi.getTimerCount()).toBe(2);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => vi.advanceTimersByTimeAsync(21_000));
    expect(requests).toHaveLength(0);
  });
  it("shares an in-flight API script across player mounts and replaces a failed script on retry", () => {
    vi.useFakeTimers();
    vi.stubGlobal("YT", undefined);
    const firstMount = render(player());
    const script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    expect(script).not.toBeNull();
    firstMount.unmount();
    const secondMount = render(player());
    expect(document.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]')).toHaveLength(1);
    expect(document.querySelector('script[src="https://www.youtube.com/iframe_api"]')).toBe(script);
    act(() => script!.dispatchEvent(new Event("error")));
    expect(script!.isConnected).toBe(false);
    secondMount.unmount();
    const retry = render(player());
    expect(document.querySelector('script[src="https://www.youtube.com/iframe_api"]')).not.toBe(script);
    retry.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["script", "timeout", "constructor"])(
    "stops with a recoverable error on %s failure",
    async (failure) => {
      mount();
      vi.useFakeTimers();
      vi.stubGlobal(
        "YT",
        failure === "constructor"
          ? {
              Player: vi.fn(function () {
                throw new Error("unavailable");
              }),
            }
          : undefined,
      );
      fireEvent.click(screen.getByRole("button", { name: "Play all" }));
      if (failure === "script")
        act(() =>
          document
            .querySelector('script[src="https://www.youtube.com/iframe_api"]')!
            .dispatchEvent(new Event("error")),
        );
      if (failure === "timeout")
        await act(async () => vi.advanceTimersByTimeAsync(20_001));
      if (failure === "constructor") await act(async () => {});
      expect(screen.getByText(/Could not load the player/)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Stop playback" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Play all" })).toBeEnabled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});
