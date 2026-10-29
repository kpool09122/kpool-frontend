import { expect, test, type Page } from "./fixtures";
import { wikiVideoAuthenticatedIdentity } from "./wiki-video-identity";
import { installTikTokPlayerMock, sendTikTokState } from "./tiktok-player";
import { installYouTubePlayerMock } from "./youtube-player";
const id = "00000000-0000-4000-8000-000000000001";
const source1 = "00000000-0000-4000-8000-000000000011";
const source2 = "00000000-0000-4000-8000-000000000012";
const baseURL = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
test("mixed playlist snapshots survive source deletion, reorder/save/refetch and select the matching provider", async ({ page }) => {
  await page.context().addCookies([
    { name: "kpool-locale", value: "en", url: baseURL }, { name: "XSRF-TOKEN", value: "csrf", url: baseURL },
    { name: "kpool-mock-account-status", value: "active", url: baseURL }, { name: "kpool-e2e-wiki-principal", value: "basic", url: baseURL },
  ]);
  await page.route("**/api/identity/auth/me", (route) => route.fulfill({ json: { ...wikiVideoAuthenticatedIdentity, accountIdentifier: "22222222-2222-2222-2222-222222222222", accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333", account: { ...wikiVideoAuthenticatedIdentity.account, accountIdentifier: "22222222-2222-2222-2222-222222222222" } } }));
  await installYouTubePlayerMock(page); await installTikTokPlayerMock(page);
  let items = [
    { provider: "youtube", externalVideoId: "abcdefghijk", sourceVideoLinkIdentifier: null, position: 0, title: "Saved YouTube", url: "https://youtu.be/abcdefghijk", thumbnailUrl: null, durationSeconds: 120 },
    { provider: "tiktok", externalVideoId: "6718335390845095173", sourceVideoLinkIdentifier: null, position: 1, title: "Deleted TikTok", url: "https://www.tiktok.com/@scout2015/video/6718335390845095173", thumbnailUrl: null, durationSeconds: 15 },
  ];
  const summary = { playlistIdentifier: id, name: "Mixed", videoCount: 2, createdAt: "2026-10-26T00:00:00Z", updatedAt: "2026-10-26T00:00:00Z" };
  const writes: unknown[] = [];
  await page.route("**/api/wiki/playlists", (route) => route.fulfill({ json: { playlists: [summary] } }));
  await page.route(`**/api/wiki/playlists/${id}`, (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON(); writes.push(body);
      items = body.items.map((item: { provider: string; externalVideoId: string }, position: number) => ({ ...items.find((existing) => existing.provider === item.provider && existing.externalVideoId === item.externalVideoId)!, position }));
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: { ...summary, items } });
  });
  await page.route("**/api/wiki/videos/likes?*", (route) => route.fulfill({ json: { likedVideoLinkIdentifiers: [], videos: [], pagination: { currentPage: 1, perPage: 20, total: 0 } } }));
  await page.goto("/admin/wiki/editing");
  await page.getByRole("tab", { name: "My playlists" }).click();
  await page.getByRole("combobox", { name: "Playlist", exact: true }).selectOption(id);
  const handle = page.getByRole("button", { name: "Reorder: Deleted TikTok", exact: true });
  await handle.focus(); await handle.press("ArrowUp");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toEqual({ name: "Mixed", items: [{ provider: "tiktok", externalVideoId: "6718335390845095173" }, { provider: "youtube", externalVideoId: "abcdefghijk" }] });
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Play all", exact: true }).click();
  await expect(page.locator('iframe[src*="tiktok.com/player/v1/"]')).toHaveCount(1);
  await sendTikTokState(page, 1); await sendTikTokState(page, 0);
  await expect(page.locator('iframe[src*="youtube-nocookie"]')).toHaveCount(1);
  await expect(page.locator('iframe[src*="tiktok.com/player/v1/"]')).toHaveCount(0);
});

async function dragPlaylistItem(page: Page, source: string, target: string, touch: boolean) {
  const handle = page.getByRole("button", { name: `Reorder: ${source}`, exact: true });
  await handle.click({ trial: true });
  const from = await handle.boundingBox();
  const to = await page.getByRole("button", { name: `Reorder: ${target}`, exact: true }).boundingBox();
  if (!from || !to) throw new Error("Playlist drag handles are not visible");
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  if (touch) {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    for (let step = 1; step <= 8; step++) {
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{
        x: start.x + (end.x - start.x) * step / 8,
        y: start.y + (end.y - start.y) * step / 8,
      }] });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  }
}

for (const width of [1280, 390])
  test(`collaborator manages and plays playlists at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.context().addCookies([
      { name: "kpool-locale", value: "en", url: baseURL },
      { name: "XSRF-TOKEN", value: "csrf", url: baseURL },
      { name: "kpool-mock-account-status", value: "active", url: baseURL },
      { name: "kpool-e2e-wiki-principal", value: "basic", url: baseURL },
    ]);
    await page.setViewportSize({ width, height: 844 });
    await installYouTubePlayerMock(page);
    await page.route("**/api/identity/auth/me", (route) =>
      route.fulfill({
        json: {
          ...wikiVideoAuthenticatedIdentity,
          accountIdentifier: "22222222-2222-2222-2222-222222222222",
          accountPrincipalIdentifier: "33333333-3333-3333-3333-333333333333",
          account: {
            ...wikiVideoAuthenticatedIdentity.account,
            accountIdentifier: "22222222-2222-2222-2222-222222222222",
          },
        },
      }),
    );
    let exists = false;
    let saved = {
      playlistIdentifier: id,
      name: "My music",
      videoCount: 0,
      createdAt: "2026-10-26T00:00:00Z",
      updatedAt: "2026-10-26T00:00:00Z",
      items: [] as {
        sourceVideoLinkIdentifier: string | null;
        provider: string;
        externalVideoId: string;
        position: number;
        url: string;
        title: string;
        thumbnailUrl: null;
        durationSeconds: null;
      }[],
    };
    const writes: unknown[] = [];
    await page.route("**/api/wiki/playlists", (route) => {
      if (route.request().method() === "POST") {
        exists = true;
        return route.fulfill({ status: 201, json: saved });
      }
      return route.fulfill({ json: { playlists: exists ? [saved] : [] } });
    });
    await page.route(`**/api/wiki/playlists/${id}`, (route) => {
      if (route.request().method() === "DELETE") {
        exists = false;
        return route.fulfill({ status: 204 });
      }
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON();
        writes.push(body);
        saved = {
          ...saved,
          name: body.name,
          videoCount: body.items.length,
          items: body.items.map(
            (
              item: { videoLinkIdentifier?: string; externalVideoId?: string },
              position: number,
            ) => {
              const second =
                item.videoLinkIdentifier === source2 ||
                item.externalVideoId === "lmnopqrstuv";
              return {
                sourceVideoLinkIdentifier: null,
                provider: "youtube",
                externalVideoId: second ? "lmnopqrstuv" : "abcdefghijk",
                position,
                url: `https://youtu.be/${second ? "lmnopqrstuv" : "abcdefghijk"}`,
                title: second ? "Second" : "First",
                thumbnailUrl: null,
                durationSeconds: null,
              };
            },
          ),
        };
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({ json: saved });
    });
    await page.route("**/api/wiki/videos/likes?*", (route) => {
      const second =
        new URL(route.request().url()).searchParams.get("page") === "2";
      const video = {
        provider: "youtube", externalVideoId: "abcdefghijk",
        videoLinkIdentifier: source1,
        url: "https://youtu.be/abcdefghijk",
        title: "First",
        thumbnailUrl: null,
        durationSeconds: null,
        language: "ja",
        resourceType: "group",
        slug: "group",
        likedAt: "2026-10-26T00:00:00Z", isOfficialOwnerLike: false,
        playlists: saved.items.some((item) => item.externalVideoId === "abcdefghijk")
          ? [{ playlistIdentifier: id, name: saved.name }] : [],
      };
      return route.fulfill({
        json: {
          likedVideoLinkIdentifiers: [],
          videos: second
            ? [
                {
                  ...video,
                  videoLinkIdentifier: "00000000-0000-4000-8000-000000000013",
                  language: "ko",
                  title: "Duplicate",
                },
                {
                  ...video,
                  videoLinkIdentifier: source2,
                  externalVideoId: "lmnopqrstuv", url: "https://youtu.be/lmnopqrstuv",
                  title: "Second",
                  language: "en",
                  playlists: saved.items.some((item) => item.externalVideoId === "lmnopqrstuv")
                    ? [{ playlistIdentifier: id, name: saved.name }] : [],
                },
              ]
            : Array.from({ length: 20 }, (_, i) => ({
                ...video,
                videoLinkIdentifier: `00000000-0000-4000-8000-${String(100 + i).padStart(12, "0")}`,
                ...(i === 0 ? { videoLinkIdentifier: source1 } : {}),
              })),
          pagination: { currentPage: second ? 2 : 1, perPage: 20, total: 22 },
        },
      });
    });
    await page.goto("/admin/wiki/editing");
    if (width < 768)
      await expect(page.getByRole("button", { name: "Expand admin menu" })).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("tab", { name: "My playlists" }).click();
    await expect(page.getByText("No playlists yet.")).toBeVisible();
    await page.getByRole("tab", { name: "Create", exact: true }).click();
    await page.getByLabel("New playlist name").fill("My music");
    await page
      .getByRole("region", { name: "My playlists", exact: true })
      .getByRole("button", { name: "Create", exact: true })
      .click();
    await expect(page.getByText("Empty playlist created. Add videos from the Edit tab.")).toBeVisible();
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("tabpanel", { name: "Edit", exact: true }).getByRole("combobox")).toHaveCount(0);
    await page.getByRole("button", { name: "Add: First", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Choose a playlist" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("playlist-add-dialog.png") });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add: First", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Add: First", exact: true }).click();
    await page.getByRole("dialog", { name: "Choose a playlist", exact: true }).getByRole("button", { name: "My music", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
    expect(writes).toHaveLength(0);
    await page.getByRole("button", { name: "Load more", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add: Duplicate" }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Add: Second", exact: true })
      .click();
    await page.getByRole("dialog", { name: "Choose a playlist", exact: true }).getByRole("button", { name: "My music", exact: true }).click();
    await expect(page.getByText(/Total VideoLinks/)).toHaveCount(0);
    await expect(page.getByText(/(?:ja|ko|en) · group/)).toHaveCount(0);
    const badges = page.getByRole("list", { name: "Added to playlists", exact: true });
    await expect(badges).toHaveCount(2);
    for (const badge of await badges.all()) await expect(badge).toHaveText("My music");
    await page.screenshot({ path: testInfo.outputPath("playlist-membership-badges.png") });
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
    expect(writes).toHaveLength(0);
    await page.getByRole("tab", { name: "List", exact: true }).click();
    await expect(page.getByRole("button", { name: "Reorder: First", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    expect(writes[0]).toEqual({ name: "My music", items: [{ videoLinkIdentifier: source1 }, { videoLinkIdentifier: source2 }] });
    await dragPlaylistItem(page, "Second", "First", width < 768);
    await expect.poll(() => page.getByRole("button", { name: /^Reorder:/ }).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")))).toEqual(["Reorder: Second", "Reorder: First"]);
    expect(writes).toHaveLength(1);
    await page.reload();
    if (width < 768) await expect(page.getByRole("button", { name: "Expand admin menu" })).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await page.getByRole("button", { name: "Load more", exact: true }).click();
    await expect(page.getByRole("list", { name: "Added to playlists", exact: true })).toHaveCount(2);
    await page.getByRole("button", { name: "Add: First", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("button", { name: "My music", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "List", exact: true }).click();
    await page.getByRole("combobox", { name: "Playlist", exact: true }).selectOption(id);
    await expect(page.getByRole("button", { name: "Reorder: First", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    expect(await page.getByRole("button", { name: /^Reorder:/ }).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")))).toEqual(["Reorder: First", "Reorder: Second"]);
    await dragPlaylistItem(page, "Second", "First", width < 768);
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    expect(writes[1]).toEqual({ name: "My music", items: [
      { provider: "youtube", externalVideoId: "lmnopqrstuv" },
      { provider: "youtube", externalVideoId: "abcdefghijk" },
    ] });
    await page.screenshot({ path: testInfo.outputPath("playlist-list.png") });
    await page
      .getByRole("button", { name: "Random playback", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Random playback", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Random playback", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Loop playback", exact: true })
      .click();
    // Start from the second row using its thumbnail, then switch via row whitespace.
    await page.getByRole("button", { name: "Play video: First", exact: true }).click({ position: { x: 65, y: 25 } });
    await expect(page.locator('iframe[src*="youtube-nocookie.com"]')).toHaveAttribute("src", /abcdefghijk/);
    await page.getByRole("complementary", { name: "Playback queue", exact: true })
      .getByRole("button", { name: "Play video: Second", exact: true }).click({ position: { x: 5, y: 5 } });
    await expect.poll(() => page.evaluate(() =>
      (window as unknown as { queueTest: { players: { videoId: string }[] } }).queueTest.players.at(-1)?.videoId,
    )).toBe("lmnopqrstuv");
    await expect(
      page.locator('iframe[src*="youtube-nocookie.com"]'),
    ).toHaveAttribute("src", /abcdefghijk/);
    const queue = page.getByRole("complementary", { name: "Playback queue", exact: true });
    await expect(queue).toBeVisible();
    await expect(queue.getByRole("button", { name: "Play video: Second", exact: true })).toHaveAttribute("aria-current", "true");
    const player = page.getByRole("region", { name: "Now playing", exact: true });
    const queueBox = await queue.boundingBox();
    const playerBox = await player.boundingBox();
    await expect(page.getByRole("heading", { name: "My music", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete playlist", exact: true })).toHaveCount(0);
    expect(queueBox).not.toBeNull();
    expect(playerBox).not.toBeNull();
    if (width >= 1024) expect(queueBox!.x).toBeGreaterThanOrEqual(playerBox!.x + playerBox!.width);
    else expect(queueBox!.y).toBeGreaterThanOrEqual(playerBox!.y + playerBox!.height - 1);
    const iframe = await page.locator('iframe[src*="youtube-nocookie.com"]').elementHandle();
    await queue.getByRole("button", { name: "Play video: First", exact: true }).click();
    await expect.poll(() => page.evaluate(() =>
      (window as unknown as { queueTest: { players: { videoId: string }[] } }).queueTest.players.at(-1)?.videoId,
    )).toBe("abcdefghijk");
    await expect(queue.getByRole("button", { name: "Play video: First", exact: true })).toHaveAttribute("aria-current", "true");
    expect(await iframe!.evaluate((node) => node.isConnected)).toBe(true);
    await queue.getByRole("button", { name: "Play video: Second", exact: true }).click();
    await expect.poll(() => page.evaluate(() =>
      (window as unknown as { queueTest: { players: { videoId: string }[] } }).queueTest.players.at(-1)?.videoId,
    )).toBe("lmnopqrstuv");
    await expect(queue.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
    await expect(queue.getByRole("button", { name: /^Reorder:/ })).toHaveCount(0);
    await expect(queue.getByRole("button", { name: /^Remove:/ })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("playlist-playing-queue.png") });
    const sourceLayout = await queue.locator("..").evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { top: rect.top + window.scrollY, width: rect.width, height: rect.height };
    });
    await page.getByRole("button", { name: "Continue in mini player" }).click();
    await expect(
      page.getByRole("region", { name: "Mini player", exact: true }),
    ).toBeVisible();
    await expect(queue).toBeVisible();
    await expect(queue.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
    await expect(queue.getByRole("button", { name: /^Reorder:/ })).toHaveCount(0);
    await expect(queue.getByRole("button", { name: /^Remove:/ })).toHaveCount(0);
    await expect(page.getByText("Playing in the mini player", { exact: true })).toBeVisible();
    const detachedLayout = await queue.locator("..").evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { top: rect.top + window.scrollY, width: rect.width, height: rect.height };
    });
    expect(detachedLayout.top).toBeCloseTo(sourceLayout.top, 0);
    expect(detachedLayout.width).toBeCloseTo(sourceLayout.width, 0);
    expect(detachedLayout.height).toBeCloseTo(sourceLayout.height, 0);
    await page.getByRole("button", { name: "Return player here", exact: true }).click();
    await expect(page.getByRole("region", { name: "Mini player", exact: true })).toHaveCount(0);
    await expect(player).toBeVisible();
    await expect(player).toBeFocused();
    await expect(player).toContainText("Second (1/2)");
    expect(await iframe!.evaluate((node) => node.isConnected)).toBe(true);
    await expect(player.getByRole("button", { name: "Continue in mini player" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Loop playback", exact: true })).toHaveAttribute("aria-pressed", "true");
    const restoredLayout = await queue.locator("..").evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { top: rect.top + window.scrollY, width: rect.width, height: rect.height };
    });
    expect(restoredLayout.top).toBeCloseTo(sourceLayout.top, 0);
    expect(restoredLayout.width).toBeCloseTo(sourceLayout.width, 0);
    expect(restoredLayout.height).toBeCloseTo(sourceLayout.height, 0);
    await player.getByRole("button", { name: "Continue in mini player" }).click();
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
    const mini = page.getByRole("region", { name: "Mini player", exact: true });
    await expect(
      mini.getByRole("button", { name: "Loop playback" }),
    ).toHaveAttribute("aria-pressed", "true");
    await mini.getByRole("button", { name: "Loop playback" }).click();
    const repeatOne = mini.getByRole("button", { name: "Repeat current video" });
    await expect(repeatOne).toHaveText("1");
    await expect(page.getByRole("region", { name: "My playlists", exact: true })
      .getByRole("button", { name: "Repeat current video" })).toHaveAttribute("data-loop-mode", "one");
    const loads = await page.evaluate(() =>
      (window as unknown as { queueTest: { players: { loads: string[] }[] } }).queueTest.players[0].loads.length,
    );
    await page.evaluate(() => {
      (window as unknown as { queueTest: { players: { playerState: number }[] } }).queueTest.players[0].playerState = 0;
    });
    await expect.poll(() => page.evaluate(() =>
      (window as unknown as { queueTest: { players: { loads: string[] }[] } }).queueTest.players[0].loads.length,
    )).toBe(loads + 1);
    await expect(mini).toContainText("Second (1/2)");
    await page.screenshot({ path: testInfo.outputPath("playlist-repeat-one.png") });
    await repeatOne.click();
    await expect(mini.getByRole("button", { name: "Loop playback" })).toHaveAttribute("aria-pressed", "false");
    await mini.getByRole("button", { name: "Loop playback" }).click();
    await page.evaluate(() => {
      (
        window as unknown as {
          queueTest: { players: { playerState: number }[] };
        }
      ).queueTest.players[0].playerState = 0;
    });
    await expect(mini).toContainText("First (2/2)");
    await page.evaluate(() => {
      (
        window as unknown as {
          queueTest: { players: { playerState: number }[] };
        }
      ).queueTest.players[0].playerState = 0;
    });
    await expect(mini).toContainText("Second (1/2)");
    await page.screenshot({
      path: testInfo.outputPath("my-playlist-mini-player.png"),
    });
    await page
      .getByRole("region", { name: "Mini player" })
      .getByRole("button", { name: "Stop playback" })
      .click();
    await expect(page.getByRole("button", { name: "Remove: First" })).toBeVisible();
    const startPlayback = page.getByRole("button", { name: "Play all", exact: true });
    await startPlayback.scrollIntoViewIfNeeded();
    const startBox = await startPlayback.boundingBox();
    await startPlayback.click();
    const stopPlayback = page.getByRole("button", { name: "Stop playback", exact: true });
    await expect(stopPlayback).toBeEnabled();
    expect(await stopPlayback.boundingBox()).toEqual(startBox);
    await stopPlayback.click();
    await expect(startPlayback).toBeEnabled();
    await expect(startPlayback).toBeFocused();
    await page.getByRole("button", { name: "Remove: First" }).click();
    await page.getByRole("button", { name: "Remove: Second" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    expect(writes[2]).toEqual({ name: "My music", items: [] });
    await expect(page.getByText("No videos.", { exact: true })).toBeVisible();
    const actions = page.getByRole("button", { name: "Playlist actions" });
    const deletion = page.getByRole("button", { name: "Delete playlist", exact: true });
    await actions.click();
    await expect(deletion).toBeVisible();
    const triggerBox = (await actions.boundingBox())!;
    const menuBox = (await deletion.locator("..").boundingBox())!;
    expect(menuBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height);
    expect(menuBox.x + menuBox.width).toBeCloseTo(triggerBox.x + triggerBox.width, 0);
    await page.screenshot({ path: testInfo.outputPath("playlist-actions-popover.png") });
    await page.keyboard.press("Tab");
    await expect(deletion).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(deletion).toBeHidden();
    await expect(actions).toBeFocused();
    await actions.click();
    await page.getByRole("heading", { name: "My playlists", exact: true }).click();
    await expect(deletion).toBeHidden();
    await actions.click();
    page.once("dialog", (dialog) => dialog.dismiss());
    await deletion.click();
    await expect(deletion).toBeHidden();
    await expect(page.getByRole("combobox", { name: "Playlist", exact: true })).toHaveValue(id);
    await page.getByRole("button", { name: "Playlist actions" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete playlist", exact: true }).click();
    await expect(page.getByText("Deleted.", { exact: true })).toBeVisible();
    await expect(page.getByText("No playlists yet.", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Playlist", exact: true })).toHaveCount(0);
  });
