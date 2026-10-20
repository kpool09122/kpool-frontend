import { expect, test, type Page } from "./fixtures";

const origin = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
const statement = {
  effect: "allow",
  actions: ["search_free_materials"],
  resourceTypes: ["image"],
  condition: null,
};
const site = {
  siteName: "Commons",
  pageUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
  reason: "Matches the edited Wiki",
  usageEvidence: "Creative Commons attribution required",
  usageEvidenceUrl: "https://commons.wikimedia.org/wiki/Commons:Licensing",
};
const setup = async (page: Page, statements = [statement]) => {
  await page.context().addCookies([
    { name: "kpool-mock-account-status", value: "active", url: origin },
    { name: "kpool-e2e-wiki-principal", value: "basic", url: origin },
    { name: "kpool-locale", value: "en", url: origin },
  ]);
  await page.route("**/api/wiki/principal/me", (route) =>
    route.fulfill({
      json: {
        principalIdentifier: "33333333-3333-4333-8333-333333333333",
        identityIdentifier: "11111111-1111-4111-8111-111111111111",
        accountPrincipalCount: 1,
        isDelegatedPrincipal: false,
        status: "active",
        policies: [
          {
            policyIdentifier: "22222222-2222-4222-8222-222222222222",
            name: "Search",
            isSystemPolicy: true,
            statements,
          },
        ],
      },
    }),
  );
  await page.route("**/api/wiki/images?**", (route) =>
    route.fulfill({
      json: {
        images: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 24,
      },
    }),
  );
};
const warned = (page: Page) =>
  page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`material search retains temporary results and guards departure on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await setup(page);
    let calls = 0;
    await page.route(
      "**/api/wiki/images/search-free-materials",
      async (route) => {
        const input = route.request().postDataJSON();
        expect(input).toMatchObject({
          language: "en",
          resourceType: "group",
          relatedWikis: [],
        });
        calls += 1;
        await route.fulfill({ json: { sites: [site] } });
      },
    );
    await page.goto("/en/wiki/gr-aurora-echo");
    await page
      .getByRole("link", { name: "Edit section: Overview", exact: true })
      .click();
    await expect(page).toHaveURL(/\/wiki\/[^/]+\/edit\?resourceType=group$/);
    const editorUrl = page.url();
    if (viewport.name === "mobile")
      await page
        .getByRole("button", { name: "Collapse editor sidebar" })
        .click();
    await expect.poll(() => warned(page)).toBe(false);
    await page
      .getByRole("button", { name: "Open wiki image library" })
      .filter({ visible: true })
      .click();
    await page.getByRole("tab", { name: "AI material search" }).click();
    await expect(
      page.getByText("Review the current context, then search."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Search materials", exact: true })
      .click();
    await expect(page.getByText(site.reason)).toBeVisible();
    await expect(
      page.getByRole("link", { name: site.pageUrl, exact: true }),
    ).toHaveAttribute("target", "_blank");
    await page.getByRole("tab", { name: "AI material search" }).press("Home");
    await expect(page.getByRole("tab", { name: "Image list" })).toBeFocused();
    await page.getByRole("tab", { name: "Image list" }).press("End");
    await expect(page.getByText(site.reason)).toBeVisible();
    await page
      .getByRole("button", { name: "Use source for upload request" })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Source URL", exact: true }),
    ).toHaveValue(site.pageUrl);
    await expect(
      page.getByRole("textbox", { name: "Source site name", exact: true }),
    ).toHaveValue(site.siteName);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("button", { name: "Open wiki image library" })
      .filter({ visible: true })
      .click();
    await page.getByRole("tab", { name: "AI material search" }).click();
    await expect(page.getByText(site.reason)).toBeVisible();
    expect(calls).toBe(1);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect.poll(() => warned(page)).toBe(true);
    let dialog = page.waitForEvent("dialog", { timeout: 6000 });
    const click = page.getByRole("banner").locator('a[href="/en"]').click();
    expect((await dialog).message()).toContain("search results");
    await (await dialog).dismiss();
    await click;
    await expect(page).toHaveURL(editorUrl);
    dialog = page.waitForEvent("dialog", { timeout: 6000 });
    const back = page.evaluate(() => history.back());
    await (await dialog).dismiss();
    await back;
    await expect(page).toHaveURL(editorUrl);
    dialog = page.waitForEvent("dialog", { timeout: 6000 });
    const reload = page.evaluate(() => location.reload());
    expect((await dialog).type()).toBe("beforeunload");
    await (await dialog).dismiss();
    await reload;
    dialog = page.waitForEvent("dialog", { timeout: 6000 });
    const leave = page.getByRole("banner").locator('a[href="/en"]').click();
    await (await dialog).accept();
    await leave;
    await expect(page).toHaveURL(/\/en$/);
    await page.goto(editorUrl);
    if (viewport.name === "mobile")
      await page
        .getByRole("button", { name: "Collapse editor sidebar" })
        .click();
    await expect.poll(() => warned(page)).toBe(false);
    await page
      .getByRole("button", { name: "Open wiki image library" })
      .filter({ visible: true })
      .click();
    await page.getByRole("tab", { name: "AI material search" }).click();
    await expect(page.getByText(site.reason)).toHaveCount(0);
    await expect(
      page.getByText("Review the current context, then search."),
    ).toBeVisible();
  });
}

test("a missing search grant or explicit deny hides the search tab", async ({
  page,
}) => {
  for (const statements of [
    [],
    [statement, { ...statement, effect: "deny" }],
  ]) {
    await setup(page, statements);
    await page.goto("/wiki/gr-aurora-echo/edit?resourceType=group");
    await page
      .getByRole("button", { name: "Open wiki image library" })
      .filter({ visible: true })
      .click();
    await expect(
      page.getByRole("tab", { name: "Image usage request" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "AI material search" }),
    ).toHaveCount(0);
  }
});

test("failed searches can retry, and empty results do not enable departure guards", async ({
  page,
}) => {
  await setup(page);
  let attempts = 0;
  await page.route("**/api/wiki/images/search-free-materials", (route) => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 503, json: { message: "Unavailable" } })
      : route.fulfill({ json: { sites: [] } });
  });
  await page.goto("/wiki/gr-aurora-echo/edit?resourceType=group");
  await page
    .getByRole("button", { name: "Open wiki image library" })
    .filter({ visible: true })
    .click();
  await page.getByRole("tab", { name: "AI material search" }).click();
  await page
    .getByRole("button", { name: "Search materials", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Search failed",
  );
  await expect.poll(() => warned(page)).toBe(false);
  await page
    .getByRole("button", { name: "Search materials", exact: true })
    .click();
  await expect(
    page.getByText("No materials with verified evidence found."),
  ).toBeVisible();
  await expect.poll(() => warned(page)).toBe(false);
});
