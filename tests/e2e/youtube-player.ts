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
        videoId: string;
        playerState: number;
      }[],
    };
    Object.assign(window, {
      queueTest: state,
      YT: {
        Player: function (element: HTMLElement, options: Options) {
          const frame = document.createElement("iframe");
          frame.title = "Mock YouTube player";
          frame.src = `https://www.youtube-nocookie.com/embed/${options.videoId}`;
          frame.style.cssText = "width:100%;height:100%;border:0";
          frame.srcdoc = "<p>YouTube API test double</p>";
          element.replaceWith(frame);
          const item = {
            options, destroyed: false, plays: 0,
            videoId: options.videoId, playerState: 1,
          };
          state.players.push(item);
          setTimeout(() => options.events.onReady(), 0);
          return {
            getVideoUrl: () => `https://www.youtube.com/watch?v=${item.videoId}`,
            getPlayerState: () => item.playerState,
            playVideo: () => {
              item.plays += 1;
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
