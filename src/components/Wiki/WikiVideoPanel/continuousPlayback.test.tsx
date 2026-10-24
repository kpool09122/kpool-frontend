import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { WikiVideo } from "@/gateways/wiki/wikiVideos";
import { WikiVideoPanel } from "./index";
import {
  YouTubeQueuePlayer,
  type QueuePlayerOptions,
} from "./YouTubeQueuePlayer";

const first: WikiVideo = {
  videoLinkIdentifier: "00000000-0000-4000-8000-000000000001",
  url: "https://youtu.be/abcdefghijk",
  title: "First video",
  thumbnailUrl: null,
  publishedAt: null,
  durationSeconds: 120,
  creatorPrincipalIdentifier: null,
  creatorIdentityName: null,
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
const players: {
  options: QueuePlayerOptions;
  playVideo: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}[] = [];
const key = ["public-wiki-videos", "ja", "group", "gr-test", {}];
function mount(videos = [first, second], locale: "en" | "ja" | "ko" = "en") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  client.setQueryData(key, { videos });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ videos })));
  const tree = (slug = "gr-test") => (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={locale}>
        <WikiVideoPanel language="ja" resourceType="group" slug={slug} />
      </I18nProvider>
    </QueryClientProvider>
  );
  return { client, tree, ...render(tree()) };
}
const start = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Play all" }));
  await waitFor(() => expect(players.length).toBeGreaterThan(0));
};
beforeEach(() => {
  players.length = 0;
  useAuthStore.setState({ status: "guest", identity: null });
  vi.stubGlobal("YT", {
    Player: vi.fn(function (
      _element: HTMLElement,
      options: QueuePlayerOptions,
    ) {
      const player = { options, playVideo: vi.fn(), destroy: vi.fn() };
      players.push(player);
      return player;
    }),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document
    .querySelectorAll('script[src="https://www.youtube.com/iframe_api"]')
    .forEach((script) => script.remove());
});

describe("continuous playback", () => {
  it("excludes invalid URLs, preserves display order and marks the current card", async () => {
    mount([second, invalid, first]);
    await start();
    expect(players[0].options).toMatchObject({
      videoId: "lmnopqrstuv",
      host: "https://www.youtube-nocookie.com",
      playerVars: { playsinline: 1, origin: window.location.origin },
    });
    expect(
      screen.getByText("Now playing: Second video (1/2)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: second.title }).closest("li"),
    ).toHaveAttribute("aria-current", "true");
    act(() => players[0].options.events.onStateChange({ data: 0 }));
    await waitFor(() => expect(players).toHaveLength(2));
    expect(players[1].options.videoId).toBe("abcdefghijk");
    expect(
      screen.getByRole("heading", { name: second.title }).closest("li"),
    ).not.toHaveAttribute("aria-current");
  });
  it.each([{ videos: [] }, { videos: [invalid] }])(
    "disables start with no playable videos: %j",
    ({ videos }) => {
      mount(videos);
      expect(screen.getByRole("button", { name: "Play all" })).toBeDisabled();
      expect(players).toHaveLength(0);
    },
  );
  it("finishes a single video and can start again", async () => {
    mount([first]);
    await start();
    act(() => players[0].options.events.onStateChange({ data: 0 }));
    expect(players[0].destroy).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("region", { name: "Now playing" }),
    ).not.toBeInTheDocument();
    await start();
    await waitFor(() => expect(players).toHaveLength(2));
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
      players[0].options.events.onError();
      players[0].options.events.onError();
      players[0].options.events.onStateChange({ data: 0 });
    });
    await waitFor(() => expect(players).toHaveLength(2));
    expect(
      screen.getByText("Skipped an unavailable video: First video"),
    ).toBeInTheDocument();
    act(() => players[1].options.events.onError());
    expect(players[1].destroy).toHaveBeenCalledOnce();
    expect(
      screen.getByText("Skipped an unavailable video: Second video"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Stop playback" }),
    ).not.toBeInTheDocument();
    expect(players).toHaveLength(2);
  });
  it("offers manual resume after autoplay is blocked without skipping the item", async () => {
    mount();
    await start();
    act(() => players[0].options.events.onAutoplayBlocked());
    expect(screen.getByText(/Autoplay was blocked/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume playback" }));
    expect(players[0].playVideo).toHaveBeenCalledOnce();
    act(() => players[0].options.events.onStateChange({ data: 1 }));
    expect(
      screen.queryByRole("button", { name: "Resume playback" }),
    ).not.toBeInTheDocument();
    expect(players).toHaveLength(1);
  });
  it("mutually excludes individual and continuous players and stops late events", async () => {
    const view = mount();
    fireEvent.click(
      screen.getByRole("button", { name: `Play: ${first.title}` }),
    );
    expect(view.container.querySelectorAll("iframe")).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", { name: `Play: ${second.title}` }),
    );
    expect(view.container.querySelectorAll("iframe")).toHaveLength(1);
    expect(
      screen.queryByTitle(`YouTube embed: ${first.title}`),
    ).not.toBeInTheDocument();
    await start();
    expect(view.container.querySelectorAll("iframe")).toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", { name: `Play: ${second.title}` }),
    );
    expect(players[0].destroy).toHaveBeenCalledOnce();
    act(() => players[0].options.events.onStateChange({ data: 0 }));
    expect(players).toHaveLength(1);
    expect(
      screen.getByTitle(`YouTube embed: ${second.title}`),
    ).toBeInTheDocument();
    await start();
    await waitFor(() => expect(players).toHaveLength(2));
    fireEvent.click(screen.getByRole("button", { name: "Stop playback" }));
    expect(players[1].destroy).toHaveBeenCalledOnce();
    act(() => {
      players[1].options.events.onAutoplayBlocked();
      players[1].options.events.onError();
    });
    expect(
      screen.queryByRole("region", { name: "Now playing" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Skipped/)).not.toBeInTheDocument();
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
      await waitFor(() => expect(players[0].destroy).toHaveBeenCalledOnce());
      act(() => {
        players[0].options.events.onStateChange({ data: 0 });
        players[0].options.events.onReady();
      });
      expect(players).toHaveLength(1);
      expect(players[0].playVideo).not.toHaveBeenCalled();
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
    expect(players[0].destroy).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Play all" }));
    await waitFor(() => expect(players).toHaveLength(2));
    expect(players[1].options.videoId).toBe("lmnopqrstuv");
    expect(
      screen.getByText("Now playing: Second video (1/1)"),
    ).toBeInTheDocument();
  });
  it.each([
    ["ja", "連続再生", "再生を停止", "再生中"],
    ["ko", "연속 재생", "재생 중지", "재생 중"],
  ] as const)(
    "localizes playback in %s",
    async (locale, startLabel, stopLabel, currentLabel) => {
      mount([first], locale);
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
  it("does not create a player if unmounted before the constructor microtask", async () => {
    const view = render(player());
    view.unmount();
    await act(async () => {});
    expect(players).toHaveLength(0);
  });
  it("cleans API polling/timeout after unmount, before the script loads", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("YT", undefined);
    const view = render(player());
    expect(vi.getTimerCount()).toBe(2);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => vi.advanceTimersByTimeAsync(21_000));
    expect(players).toHaveLength(0);
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
