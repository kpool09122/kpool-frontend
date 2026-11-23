import { expect, test } from "./fixtures";

const baseURL = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
const widget = "https://trends.google.com/trends/embed/explore/TIMESERIES**";
const mockWidget = `<html><body><svg aria-label="Fixture trend chart" width="100%" height="300"><path d="M0 250 L100 100 L200 200 L300 50" fill="none" stroke="blue"/></svg><script>addEventListener("message", e => { if(e.source === parent) parent.postMessage({uniqueID:e.data.uniqueID,isReady:true,height:350}, e.origin); });</script></body></html>`;

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([
    { name: "kpool-mock-account-status", value: "active", url: baseURL },
    { name: "kpool-e2e-wiki-principal", value: "basic", url: baseURL },
    { name: "kpool-locale", value: "en", url: baseURL },
  ]);
});

for (const width of [1280, 390]) {
  test(`official widget boundary fixtures: multiple charts, navigation, temporary settings at ${width}px`, async ({
    page,
  }) => {
    await page.route(widget, (route) =>
      route.fulfill({ contentType: "text/html", body: mockWidget }),
    );
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date("2026-11-23T10:00:00Z"));
    await page.goto("/en/wiki/gr-google-trends");
    if (width === 390)
      await page.getByTestId("section-toggle-sec-trends").click();
    const charts = page.locator('iframe[title^="Google Trends:"]');
    await expect(charts).toHaveCount(2);
    const first = page.getByRole("figure", {
      name: "Google Trends: TWICE",
      exact: true,
    });
    await first.scrollIntoViewIfNeeded();
    await expect(first.getByRole("status")).toHaveCount(0);
    await expect(charts.first()).toHaveCSS("height", "350px");
    await first.getByLabel("Region", { exact: true }).selectOption("");
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
      const src = await charts.first().getAttribute("src");
      expect(JSON.parse(new URL(src!).searchParams.get("req")!).comparisonItem[0].time).toBe(date);
    }
    const bounds = await charts.first().boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: test.info().outputPath(`trends-${width}.png`),
      fullPage: true,
    });
    await page.reload();
    if (width === 390)
      await page.getByTestId("section-toggle-sec-trends").click();
    await expect(first.getByLabel("Region", { exact: true })).toHaveValue("JP");
    await page.goto("/en/wiki/gr-twice");
    await expect(charts).toHaveCount(0);
    await page.goBack();
    if (width === 390) {
      const section = page.getByTestId("section-sec-trends");
      if ((await section.getAttribute("open")) === null)
        await page.getByTestId("section-toggle-sec-trends").click();
    }
    await expect(charts).toHaveCount(2);
  });
}

test("blocked external loads preserve article, source link and retry", async ({
  page,
}) => {
  await page.route(widget, (route) => route.abort());
  await page.goto("/en/wiki/gr-google-trends");
  await expect(
    page.getByText("Other Wiki content remains available."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open Google Trends/ }),
  ).toHaveCount(2);
  await expect(page.getByText("If the chart is unavailable or there is insufficient data, open Google Trends.")).toHaveCount(
    2,
  );
  await page.getByRole("button", { name: "Reload chart" }).first().click();
  await expect(
    page.getByText("Other Wiki content remains available."),
  ).toBeVisible();
});

test("adds, edits, code round trips and saves a structured block in the actual editor", async ({
  page,
}) => {
  await page.route(widget, (route) =>
    route.fulfill({ contentType: "text/html", body: mockWidget }),
  );
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
  await expect(page.getByLabel("Search term")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit block: Google Trends", exact: true })).toHaveCount(0);
  await inserted.getByLabel("Region", { exact: true }).selectOption("KR");
  await inserted.getByLabel("Time range").selectOption("today 10-y");
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
            timeRange: "today 10-y",
          }),
        ]),
      }),
    ]),
  );
});
