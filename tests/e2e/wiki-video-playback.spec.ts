import { expect, test } from "./fixtures";

const videos = [
  {
    videoLinkIdentifier: "00000000-0000-4000-8000-000000000001",
    url: "https://youtu.be/abcdefghijk",
    title: "First video",
    thumbnailUrl: null,
    publishedAt: null,
    durationSeconds: 120,
    creatorPrincipalIdentifier: null,
    creatorIdentityName: null,
    videoUsage: "youtube_auto_view_count",
  },
  {
    videoLinkIdentifier: "00000000-0000-4000-8000-000000000002",
    url: "https://youtu.be/lmnopqrstuv",
    title: "Second video",
    thumbnailUrl: null,
    publishedAt: null,
    durationSeconds: 300,
    creatorPrincipalIdentifier: null,
    creatorIdentityName: null,
    videoUsage: "youtube_auto_view_count",
  },
];

test("mobile keyboard playback progresses, resumes blocked autoplay, stops and tears down on tab exit", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: "kpool-locale",
      value: "en",
      url: `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`,
    },
  ]);
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
  await page.route("**/api/identity/auth/me", (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.route("**/api/wiki/*/*/videos?*", (route) =>
    route.fulfill({
      json: {
        videos: new URL(route.request().url()).searchParams.has(
          "minDurationSeconds",
        )
          ? [videos[1]]
          : videos,
      },
    }),
  );
  await page.goto("/wiki/ja/gr-aurora-echo?tab=video");
  const random = page.getByRole("button", { name: "Random playback" });
  const loop = page.getByRole("button", { name: "Loop playback" });
  await expect(random).toHaveAttribute("aria-pressed", "false");
  await random.focus();
  await random.press("Space");
  await loop.click();
  await expect(random).toHaveAttribute("aria-pressed", "true");
  await expect(loop).toHaveAttribute("aria-pressed", "true");
  await loop.locator("..").screenshot({
    path: testInfo.outputPath("playback-controls-mobile.png"),
  });
  const originalTheme = await page.locator("html").getAttribute("data-theme");
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
    }, theme);
    await loop.locator("..").screenshot({
      path: testInfo.outputPath(`playback-controls-mobile-${theme}.png`),
      animations: "disabled",
    });
  }
  await page.evaluate((theme) => {
    if (theme === null) delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, originalTheme);
  await random.click();
  await loop.click();
  const start = page.getByRole("button", { name: "Play all" });
  await start.focus();
  await start.press("Enter");
  const region = page.getByRole("region", { name: "Now playing" });
  await expect(region).toContainText("First video (1/2)");
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(page.locator('li[aria-current="true"]')).toContainText(
    "First video",
  );
  const box = await page.locator("iframe").boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
  const event = async (name: "end" | "block" | "play") =>
    page.evaluate((name) => {
      const { queueTest } = window as unknown as {
        queueTest: {
          players: {
            options: {
              events: {
                onStateChange: (e: { data: number }) => void;
                onAutoplayBlocked: () => void;
              };
            };
          }[];
        };
      };
      const events = queueTest.players.at(-1)!.options.events;
      if (name === "block") events.onAutoplayBlocked();
      else events.onStateChange({ data: name === "end" ? 0 : 1 });
    }, name);
  // Reproduce seeking to the end when the ended notification is missed.
  // The real DOM should still advance using the player's reported state.
  await page.evaluate(() => {
    const state = (window as unknown as {
      queueTest: { players: { playerState: number }[] };
    }).queueTest;
    state.players.at(-1)!.playerState = 0;
  });
  await expect(region).toContainText("Second video (2/2)");
  await expect(page.locator("iframe")).toHaveCount(1);
  // A video can also change inside the same iframe without an ended event.
  const changeVideo = async (videoId: string) => page.evaluate((videoId) => {
    const state = (window as unknown as {
      queueTest: { players: { videoId: string }[] };
    }).queueTest;
    state.players.at(-1)!.videoId = videoId;
  }, videoId);
  await changeVideo("abcdefghijk");
  await expect(region).toContainText("First video (1/2)");
  await expect(page.locator("iframe")).toHaveAttribute("title", "First video");
  await changeVideo("lmnopqrstuv");
  await expect(region).toContainText("Second video (2/2)");
  await expect(page.locator("iframe")).toHaveAttribute("title", "Second video");
  await event("block");
  const resume = page.getByRole("button", { name: "Resume playback" });
  await resume.focus();
  await resume.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as { queueTest: { players: { plays: number }[] } }
          ).queueTest.players.at(-1)!.plays,
      ),
    )
    .toBe(2);
  await event("play");
  await expect(resume).toHaveCount(0);
  await region.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("continuous-playback-mobile.png"),
  });
  await event("end");
  await expect(region).toHaveCount(0);
  await start.click();
  await expect(region).toBeVisible();
  const stop = page.getByRole("button", { name: "Stop playback" });
  await stop.focus();
  await stop.press("Space");
  await expect(start).toBeFocused();
  await expect(region).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  await start.click();
  await page
    .getByRole("slider", { name: "Minimum duration (minutes)" })
    .fill("3");
  await page.getByRole("button", { name: "Apply filter" }).click();
  await expect(region).toHaveCount(0);
  await start.click();
  await expect(region).toContainText("Second video (1/1)");
  await page.getByRole("tab", { name: "Wiki", exact: true }).click();
  await expect(region).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as {
            queueTest: { players: { destroyed: boolean }[] };
          }
        ).queueTest.players.every((p) => p.destroyed),
      ),
    )
    .toBe(true);
  await event("end"); // a stale callback must not create another player
  await page.getByRole("tab", { name: "Video", exact: true }).click();
  await expect(start).toBeEnabled();
  await expect(region).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
});
