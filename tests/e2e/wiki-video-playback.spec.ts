import { expect, test, type Page } from "./fixtures";
import { installYouTubePlayerMock } from "./youtube-player";
import { wikiVideoAuthenticatedIdentity } from "./wiki-video-identity";

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
    likeCount: 0,
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
    likeCount: 0,
    videoUsage: "youtube_auto_view_count",
  },
];

async function setupPlayback(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: "kpool-locale",
      value: "en",
      url: `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`,
    },
  ]);
  await installYouTubePlayerMock(page);
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
}

test("admin language changes preserve the mini player and its playback queue", async ({ page }) => {
  await setupPlayback(page);
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.context().addCookies([{
    name: "kpool-e2e-wiki-principal", value: "basic", domain: "127.0.0.1", path: "/",
  }]);
  await page.route("**/api/identity/auth/me", (route) => route.fulfill({ json: {
    ...wikiVideoAuthenticatedIdentity,
    accountIdentifier: "22222222-2222-2222-2222-222222222222",
    accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
    account: { ...wikiVideoAuthenticatedIdentity.account, accountIdentifier: "22222222-2222-2222-2222-222222222222" },
  } }));
  await page.reload();
  await page.getByRole("button", { name: "Play all" }).click();
  await page.getByRole("button", { name: "Continue in mini player" }).click();
  await page.locator("iframe").evaluate((frame) => frame.setAttribute("data-persisted-player", "true"));
  const header = page.getByRole("banner");
  await header.getByRole("button", { name: "member", exact: true }).hover();
  await header.getByRole("link", { name: "Admin", exact: true }).click();
  await expect(page).toHaveURL(/\/admin(?:\/wiki\/editing)?$/);
  await expect(page.getByRole("complementary", { name: "Admin menu" })).toBeVisible();
  // A document navigation would recreate this marker and the native player.
  const documentNavigations: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentNavigations.push(request.url());
  });
  const serverRefresh = page.waitForResponse((response) =>
    new URL(response.url()).pathname.startsWith("/admin") && response.request().headers()["rsc"] === "1",
  );
  await header.getByRole("combobox", { name: "Language", exact: true }).selectOption("ja");
  await serverRefresh;
  const mini = page.getByRole("region", { name: "ミニプレイヤー" });
  await expect(page.getByRole("complementary", { name: "管理画面メニュー" })).toBeVisible();
  await expect(mini).toContainText("First video (1/2)");
  await expect(page.locator("iframe")).toHaveAttribute("data-persisted-player", "true");
  expect(documentNavigations).toEqual([]);
  await page.evaluate(() => {
    const state = (window as unknown as { queueTest: { players: { playerState: number }[] } }).queueTest;
    state.players[0].playerState = 0;
  });
  await expect(mini).toContainText("Second video (2/2)");
  await expect(page.locator("iframe")).toHaveAttribute("data-persisted-player", "true");
  expect(await page.evaluate(() => {
    const state = (window as unknown as { queueTest: { players: { destroyed: boolean }[] } }).queueTest;
    return state.players.length === 1 && !state.players[0].destroyed;
  })).toBe(true);
});

for (const mini of [false, true]) {
  test(`K-Pool fullscreen survives the next video and restores ${mini ? "mini player" : "inline playback"}`, async ({ page }, testInfo) => {
    await setupPlayback(page);
    await page.getByRole("button", { name: "Play all" }).click();
    if (mini) await page.getByRole("button", { name: "Continue in mini player" }).click();
    const host = page.getByRole("region", { name: mini ? "Mini player" : "Now playing" });
    await expect(host).toContainText("First video (1/2)");
    await page.locator("iframe").evaluate((frame) => frame.setAttribute("data-persisted-player", "true"));
    const original = (await host.boundingBox())!;
    await host.getByRole("button", { name: "Play in fullscreen" }).click();
    await expect.poll(() => host.evaluate((element) => document.fullscreenElement === element)).toBe(true);
    await expect(host.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();
    await expect.poll(async () => {
      const box = (await host.boundingBox())!;
      const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
      return Math.abs(box.width - viewport.width) < 2 && Math.abs(box.height - viewport.height) < 2;
    }).toBe(true);
    await page.evaluate(() => {
      const state = (window as unknown as { queueTest: { players: { playerState: number }[] } }).queueTest;
      state.players[0].playerState = 0;
    });
    await expect(host).toContainText("Second video (2/2)");
    await expect.poll(() => host.evaluate((element) => document.fullscreenElement === element)).toBe(true);
    await expect(page.locator("iframe")).toHaveAttribute("data-persisted-player", "true");
    await page.screenshot({ path: testInfo.outputPath("kpool-fullscreen.png") });
    await host.getByRole("button", { name: "Exit fullscreen" }).click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
    await expect(host.getByRole("button", { name: "Play in fullscreen" })).toBeVisible();
    await expect.poll(async () => Math.abs((await host.boundingBox())!.width - original.width)).toBeLessThan(2);
    await expect(page.locator("iframe")).toHaveAttribute("data-persisted-player", "true");
    // Ending the session removes its fullscreen element and exits fullscreen.
    await host.getByRole("button", { name: "Play in fullscreen" }).click();
    await host.getByRole("button", { name: "Stop playback" }).click();
    await expect(host).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  });
}

test("mobile keyboard playback progresses, resumes blocked autoplay, stops and tears down on tab exit", async ({
  page,
}, testInfo) => {
  await setupPlayback(page);
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
  // The iframe can appear before onReady starts playback. Wait before ending it.
  await expect.poll(() => page.evaluate(() =>
    (window as unknown as { queueTest: { players: { plays: number }[] } }).queueTest.players.at(-1)?.plays,
  )).toBe(1);
  const event = async (name: "end" | "block" | "play") =>
    page.evaluate((name) => {
      const { queueTest } = window as unknown as {
        queueTest: {
          players: {
            playerState: number;
            options: {
              events: {
                onStateChange: (e: { data: number }) => void;
                onAutoplayBlocked: () => void;
              };
            };
          }[];
        };
      };
      const current = queueTest.players.at(-1)!;
      const events = current.options.events;
      current.playerState = name === "block" ? 2 : name === "end" ? 0 : 1;
      if (name === "block") events.onAutoplayBlocked();
      else events.onStateChange({ data: current.playerState });
    }, name);
  await page.locator("iframe").evaluate((frame) => frame.setAttribute("data-session-frame", "original"));
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
  await expect(page.locator("iframe")).toHaveAttribute("data-session-frame", "original");
  await expect.poll(() => page.evaluate(() => {
    const state = (window as unknown as { queueTest: { players: { loads: string[] }[] } }).queueTest;
    return { instances: state.players.length, loads: state.players[0].loads };
  })).toEqual({ instances: 1, loads: ["abcdefghijk", "lmnopqrstuv"] });
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


test("mini player preserves the iframe across navigation, dragging and video takeover", async ({ page }, testInfo) => {
  await setupPlayback(page);
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.getByRole("button", { name: "Play all" }).click();
  await expect(page.getByRole("region", { name: "Now playing" })).toContainText("First video (1/2)");
  await page.locator("iframe").evaluate((frame) => frame.setAttribute("data-persisted-player", "true"));
  await page.getByRole("button", { name: "Continue in mini player" }).click();
  const mini = page.getByRole("region", { name: "Mini player" });
  await expect(mini).toBeVisible();
  await expect(page.locator("iframe")).toHaveAttribute("data-persisted-player", "true");
  const initial = (await mini.boundingBox())!;
  expect(initial.width).toBeCloseTo(480, 0);
  expect(Math.abs(initial.x + initial.width - 984)).toBeLessThan(2);
  expect(Math.abs(initial.y + initial.height - 784)).toBeLessThan(2);
  await page.mouse.move(initial.x + 9, initial.y + 9);
  await page.mouse.down();
  await page.mouse.move(initial.x - 71, initial.y - 36, { steps: 8 });
  await page.mouse.up();
  const resized = (await mini.boundingBox())!;
  expect(resized.width).toBeGreaterThan(initial.width + 60);
  expect(resized.x + resized.width).toBeCloseTo(initial.x + initial.width, 0);
  expect(resized.y + resized.height).toBeCloseTo(initial.y + initial.height, 0);
  await expect(page.locator("iframe")).toHaveAttribute("data-persisted-player", "true");
  const titleBox = (await mini.getByRole("status").boundingBox())!;
  await page.mouse.move(titleBox.x + 30, titleBox.y + 10);
  await page.mouse.down();
  await page.mouse.move(titleBox.x - 150, titleBox.y - 130, { steps: 8 });
  await page.mouse.up();
  const moved = (await mini.boundingBox())!;
  expect(moved.x).toBeLessThan(initial.x - 100);
  expect(moved.y).toBeLessThan(initial.y - 80);
  await expect(page.locator("iframe")).toHaveAttribute("data-persisted-player", "true");
  await mini.press("ArrowLeft");
  expect((await mini.boundingBox())!.x).toBeLessThan(moved.x);
  const beforePadding = (await mini.boundingBox())!;
  await page.mouse.move(beforePadding.x + 10, beforePadding.y + beforePadding.height - 20);
  await page.mouse.down();
  await page.mouse.move(beforePadding.x - 10, beforePadding.y + beforePadding.height - 40, { steps: 4 });
  await page.mouse.up();
  expect((await mini.boundingBox())!.x).toBeLessThan(beforePadding.x);
  const beforeControls = (await mini.boundingBox())!;
  const loop = mini.getByRole("button", { name: "Loop playback" });
  await loop.click();
  await expect(loop).toHaveAttribute("aria-pressed", "true");
  const loopBox = (await loop.boundingBox())!;
  await page.mouse.move(loopBox.x + 20, loopBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(loopBox.x - 20, loopBox.y - 20, { steps: 4 });
  await page.mouse.up();
  const videoBox = (await page.locator("iframe").boundingBox())!;
  await page.mouse.move(videoBox.x + 40, videoBox.y + 40);
  await page.mouse.down();
  await page.mouse.move(videoBox.x + 80, videoBox.y + 80, { steps: 4 });
  await page.mouse.up();
  const afterControls = (await mini.boundingBox())!;
  expect(afterControls.x).toBeCloseTo(beforeControls.x, 0);
  expect(afterControls.y).toBeCloseTo(beforeControls.y, 0);
  await expect(page.locator("iframe")).toHaveAttribute("data-persisted-player", "true");
  await page.getByRole("link", { name: "k-pool", exact: true }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(mini).toContainText("First video (1/2)");
  await expect(page.locator("iframe")).toHaveAttribute("data-persisted-player", "true");
  await page.screenshot({ path: testInfo.outputPath("mini-player-after-navigation.png") });
  await page.getByRole("switch", { name: "Display mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await mini.screenshot({ path: testInfo.outputPath("mini-player-dark.png"), animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 700 });
  await expect.poll(async () => {
    const box = (await mini.boundingBox())!;
    return box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 700;
  }).toBe(true);
  const touch = await page.context().newCDPSession(page);
  await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
  const pinch = async (startDistance: number, endDistance: number) => {
    const title = (await mini.getByRole("status").boundingBox())!;
    const center = { x: title.x + title.width / 2, y: title.y + title.height / 2 };
    const start = Math.min(startDistance, title.width - 16);
    const points = (distance: number) => [
      { id: 1, x: center.x - distance / 2, y: center.y },
      { id: 2, x: center.x + distance / 2, y: center.y },
    ];
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points(start) });
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points(start * endDistance / startDistance) });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const beforePinch = (await mini.boundingBox())!;
  await pinch(160, 112);
  await expect.poll(async () => (await mini.boundingBox())!.width).toBeLessThan(beforePinch.width - 30);
  const shrunk = (await mini.boundingBox())!;
  await pinch(120, 180);
  await expect.poll(async () => (await mini.boundingBox())!.width).toBeGreaterThan(shrunk.width + 30);
  await expect(page.locator("iframe")).toHaveAttribute("data-persisted-player", "true");
  const fitted = (await mini.boundingBox())!;
  expect(fitted.x + fitted.width).toBeLessThanOrEqual(390);
  expect(fitted.y + fitted.height).toBeLessThanOrEqual(700);
  await touch.detach();
  await page.screenshot({ path: testInfo.outputPath("mini-player-mobile.png"), animations: "disabled" });
  await page.setViewportSize({ width: 1000, height: 800 });
  for (let step = 0; step < 16; step++) await mini.press("ArrowLeft");
  await page.goBack();
  await page.getByRole("button", { name: "Play: Second video", exact: true }).click();
  await expect(mini).toContainText("Second video");
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(page.locator("iframe")).not.toHaveAttribute("data-persisted-player");
  await page.getByRole("button", { name: "Stop playback" }).click();
  await expect(mini).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
});
