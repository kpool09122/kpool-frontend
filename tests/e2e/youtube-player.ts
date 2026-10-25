import type { Page } from "./fixtures";

export async function installYouTubePlayerMock(page: Page) {
  // Mock YouTube at the external boundary; real React, DOM and tab routing run
  // in Chromium with fixture API data, without YouTube network access.
  await page.addInitScript(() => {
    type Options = {
      videoId: string;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
        onAutoplayBlocked: () => void;
      };
    };
    const state = {
      players: [] as {
        options: Options;
        destroyed: boolean;
        plays: number;
        loads: string[];
        videoId: string;
        playerState: number;
      }[],
    };
    Object.assign(window, {
      queueTest: state,
      YT: {
        Player: function (element: HTMLElement, options: Options) {
          if (!(element instanceof HTMLIFrameElement)) throw new Error("Expected a React-rendered iframe");
          const frame = element;
          frame.srcdoc = "<p>YouTube API test double</p>";
          const item = {
            options, destroyed: false, plays: 0, loads: [options.videoId],
            videoId: options.videoId, playerState: 1,
          };
          state.players.push(item);
          setTimeout(() => options.events.onReady(), 0);
          return {
            getVideoUrl: () => `https://www.youtube.com/watch?v=${item.videoId}`,
            getPlayerState: () => item.playerState,
            playVideo: () => {
              item.plays += 1;
              item.playerState = 1;
              options.events.onStateChange({ data: 1 });
            },
            loadVideoById: (videoId: string) => {
              item.videoId = videoId;
              item.loads.push(videoId);
              item.playerState = 1;
              options.events.onStateChange({ data: 1 });
            },
            destroy: () => {
              item.destroyed = true;
              frame.remove();
            },
          };
        },
      },
    });
  });
  await page.route("https://www.youtube.com/**", (route) => route.abort());
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.abort(),
  );
}
