import { expect, test } from "./fixtures";

const baseURL = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
test.beforeEach(async ({ page }) => {
  await page.route("https://ssl.gstatic.com/trends_nrtr/**/embed_loader.js*", route =>
    route.abort(),
  );
  await page.context().addCookies([
    { name: "kpool-mock-account-status", value: "active", url: baseURL },
    { name: "kpool-e2e-wiki-principal", value: "basic", url: baseURL },
    { name: "kpool-locale", value: "en", url: baseURL },
  ]);
});

for (const width of [1280, 390]) {
  test(`viewer region and period changes remain temporary at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date("2026-11-23T10:00:00Z"));
    await page.goto("/en/wiki/gr-google-trends");
    if (width === 390)
      await page.getByTestId("section-toggle-sec-trends").click();
    const first = page.getByRole("figure", {
      name: "Google Trends: TWICE",
      exact: true,
    });
    await first.scrollIntoViewIfNeeded();
    await first.getByLabel("Region", { exact: true }).selectOption("all");
    await expect(first.getByLabel("Region", { exact: true })).toHaveValue("all");
    await expect(first.getByLabel("Time range")).toHaveValue("today 12-m");
    for (const [value, date] of [
      ["today 3-m", "today 3-m"],
      ["today 6-m", "2026-05-23 2026-11-23"],
      ["today 12-m", "today 12-m"],
      ["today 2-y", "2024-11-23 2026-11-23"],
      ["today 5-y", "today 5-y"],
      ["today 10-y", "2016-11-23 2026-11-23"],
    ]) {
      await first.getByLabel("Time range").selectOption(value);
      const href = await first.getByRole("link", { name: /Open Google Trends/ }).getAttribute("href");
      expect(new URL(href!).searchParams.get("date")).toBe(date);
      expect(new URL(href!).searchParams.get("geo")).toBe("");
    }
    const second = page.getByRole("figure", { name: "Google Trends: BTS", exact: true });
    await expect(second.getByLabel("Region", { exact: true })).toHaveValue("all");
    await expect(second.getByLabel("Time range")).toHaveValue("today 5-y");
    await page.reload();
    if (width === 390)
      await page.getByTestId("section-toggle-sec-trends").click();
    await expect(first.getByLabel("Region", { exact: true })).toHaveValue("JP");
    await expect(first.getByLabel("Time range")).toHaveValue("today 12-m");
  });
}

test("adds, edits, code round trips and saves a structured block in the actual editor", async ({
  page,
}) => {
  let payload: { sections: unknown[] } | undefined;
  await page.route("**/api/wiki/drafts/gr-google-trends", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "draft",
        wikiIdentifier: "88888888-8888-4888-8888-888888888888",
      }),
    });
  });
  await page.goto("/wiki/gr-google-trends/edit?resourceType=group");
  await page.getByRole("button", { name: "Collapse editor sidebar" }).click();
  const controls = page.getByTestId("wiki-edit-add-section-sec-trends");
  await controls.getByText("+ Block", { exact: true }).click();
  await controls
    .getByRole("button", { name: "Google Trends", exact: true })
    .click();
  const inserted = page.getByRole("figure", { name: "Google Trends: Aurora Echo", exact: true });
  await expect(inserted).toBeVisible();
  await expect(inserted.getByLabel("Time range")).toHaveValue("today 10-y");
  await expect(page.getByLabel("Search term")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit block: Google Trends", exact: true })).toHaveCount(0);
  await inserted.getByLabel("Region", { exact: true }).selectOption("KR");
  await inserted.getByLabel("Time range").selectOption("today 6-m");
  await page.getByRole("button", { name: "Expand editor sidebar" }).click();
  await page.getByRole("button", { name: "code", exact: true }).click();
  const code = page.getByLabel("Wiki code");
  await expect(code).toHaveValue(/google_trends/);
  await code.fill(
    (await code.inputValue()).replace(
      "searchTerm:TWICE",
      "searchTerm:TWICE%20updated",
    ),
  );
  await page.getByRole("button", { name: "gui", exact: true }).click();
  await expect(
    page.getByRole("figure", {
      name: "Google Trends: TWICE updated",
      exact: true,
    }),
  ).toBeVisible();
  await expect(inserted.getByLabel("Region", { exact: true })).toHaveValue("KR");
  await expect(inserted.getByLabel("Time range")).toHaveValue("today 6-m");
  await page.getByRole("button", { name: "Save wiki changes" }).click();
  await expect(page.getByTestId("wiki-edit-save-state")).toHaveText("Saved");
  expect(payload?.sections).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sectionKey: "sec-trends",
        contents: expect.arrayContaining([
          expect.objectContaining({
            type: "google_trends",
            blockKey: "trends-one",
            searchTerm: "TWICE updated",
            region: "JP",
            timeRange: "today 12-m",
          }),
          expect.objectContaining({
            type: "google_trends",
            searchTerm: "Aurora Echo",
            region: "KR",
            timeRange: "today 6-m",
          }),
        ]),
      }),
    ]),
  );
});
