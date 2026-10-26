import { expect, test } from "./fixtures";
import { wikiVideoAuthenticatedIdentity } from "./wiki-video-identity";
import { installYouTubePlayerMock } from "./youtube-player";
const id = "00000000-0000-4000-8000-000000000001";
const source1 = "00000000-0000-4000-8000-000000000011";
const source2 = "00000000-0000-4000-8000-000000000012";
const baseURL = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
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
        videoLinkIdentifier: source1,
        url: "https://youtu.be/abcdefghijk",
        title: "First",
        thumbnailUrl: null,
        durationSeconds: null,
        language: "ja",
        resourceType: "group",
        slug: "group",
        likedAt: "2026-10-26T00:00:00Z",
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
                  url: "https://youtu.be/lmnopqrstuv",
                  title: "Second",
                  language: "en",
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
      await page.getByRole("button", { name: "Collapse admin menu" }).click();
    await page.getByRole("tab", { name: "My playlists" }).click();
    await expect(page.getByText("No playlists yet.")).toBeVisible();
    await page.getByLabel("New playlist name").fill("My music");
    await page
      .getByRole("region", { name: "My playlists", exact: true })
      .getByRole("button", { name: "Create", exact: true })
      .click();
    await expect(
      page.getByLabel("Playlist name", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Add: First", exact: true }).click();
    await page.getByRole("button", { name: "Load more", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add: Duplicate" }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Add: Second", exact: true })
      .click();
    await expect(
      page.getByText("Total VideoLinks (includes language variants): 22", {
        exact: true,
      }),
    ).toBeVisible();
    expect(writes).toHaveLength(0);
    await page.getByRole("button", { name: "Move up: Second" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
    expect(writes[0]).toEqual({
      name: "My music",
      items: [
        { videoLinkIdentifier: source2 },
        { videoLinkIdentifier: source1 },
      ],
    });
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
    await page
      .getByRole("button", { name: "Play continuously", exact: true })
      .click();
    await expect(
      page.locator('iframe[src*="youtube-nocookie.com"]'),
    ).toHaveAttribute("src", /lmnopqrstuv/);
    await page.getByRole("button", { name: "Continue in mini player" }).click();
    await expect(
      page.getByRole("region", { name: "Mini player", exact: true }),
    ).toBeVisible();
    const mini = page.getByRole("region", { name: "Mini player", exact: true });
    await expect(
      mini.getByRole("button", { name: "Loop playback" }),
    ).toHaveAttribute("aria-pressed", "true");
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
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("button", { name: "Remove: First" }).click();
    await page.getByRole("button", { name: "Remove: Second" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Edit", exact: true }),
    ).toBeVisible();
    expect(writes[1]).toEqual({ name: "My music", items: [] });
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Delete playlist", exact: true })
      .click();
    await expect(page.getByText("No playlists yet.")).toBeVisible();
  });
