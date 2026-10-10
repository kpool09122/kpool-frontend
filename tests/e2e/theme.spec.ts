import { expect, test, type Page } from "./fixtures";

const url = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;
const addMember = async (page: Page) => {
  await page.context().addCookies([
    { name: "kpool-mock-account-status", value: "active", url },
    { name: "kpool-e2e-wiki-principal", value: "basic", url },
    { name: "kpool-locale", value: "en", url },
  ]);
};

test("guest keyboard toggle persists across desktop/mobile, navigation and reload", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => { if (/hydration|did not match/i.test(message.text())) hydrationErrors.push(message.text()); });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/en");
  const login = page.getByRole("banner").getByRole("link", { name: "Log in", exact: true });
  await expect(login).toHaveCSS("color", "rgb(29, 47, 73)");
  await expect(login).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const toggle = page.getByRole("switch", { name: "Display mode" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => localStorage.getItem("kpool-theme"))).toBe("dark");
  await page.getByRole("contentinfo").getByRole("link", { name: "Terms" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Navigation menu" }).click();
  const mobile = page.getByRole("navigation", { name: "Mobile menu" });
  await mobile.getByRole("button", { name: "Display mode" }).click();
  await expect(mobile.getByRole("radio", { name: "Dark", exact: true })).toBeChecked();
  await mobile.getByRole("radio", { name: "Light", exact: true }).click();
  await expect(mobile.getByRole("radio", { name: "Light", exact: true })).toBeChecked();
  await mobile.getByRole("button", { name: "Back to menu" }).click();
  await expect(mobile.getByRole("button", { name: "Language" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(toggle.first()).toHaveAttribute("aria-checked", "false");
  expect(hydrationErrors).toEqual([]);
});

for (const mode of ["light", "dark"] as const) {
  test(`all route groups and shared chrome follow ${mode}`, async ({ page }) => {
    await page.addInitScript((selected) => localStorage.setItem("kpool-theme", selected), mode);
    await addMember(page);
    const background = mode === "dark" ? "rgb(22, 34, 58)" : "rgb(255, 251, 247)";
    const raised = mode === "dark" ? "#21304b" : "#ffffff";
    for (const route of ["/en", "/en/wiki", "/wiki/ja/gr-aurora-echo", "/wiki/ja/gr-aurora-echo/edit", "/login", "/signup", "/admin", "/admin/user/language", "/en/terms", "/en/privacy", "/contact"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
      await expect(page.locator("body")).toHaveCSS("background-color", background);
      expect(await page.getByRole("banner").evaluate((element) => getComputedStyle(element).getPropertyValue("--surface-raised").trim())).toBe(raised);
      expect(await page.getByRole("contentinfo").evaluate((element) => getComputedStyle(element).getPropertyValue("--surface-raised").trim())).toBe(raised);
      await expect(page.getByRole("switch", { name: "Display mode" }).first()).toHaveAttribute("aria-checked", String(mode === "dark"));
    }
  });
}

test("Wiki preview isolates all four global/local combinations and preserves palette", async ({ page }) => {
  await addMember(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/ja/gr-aurora-echo/edit?themeColor=%234c5cff");
  const preview = page.getByTestId("wiki-edit-preview");
  const globalToggle = page.getByRole("banner").getByRole("switch", { name: "Display mode" });
  for (const globalMode of ["light", "dark"] as const) {
    if (await globalToggle.getAttribute("aria-checked") !== String(globalMode === "dark")) await globalToggle.click();
    for (const localMode of ["light", "dark"] as const) {
      const storageBefore = await page.evaluate(() => localStorage.getItem("kpool-theme"));
      await page.getByRole("group", { name: "Preview mode" }).getByRole("button", { name: localMode === "dark" ? "Dark" : "Light", exact: true }).click();
      await expect(preview).toHaveAttribute("data-theme", localMode);
      await expect(page.locator("html")).toHaveAttribute("data-theme", globalMode);
      expect(await page.evaluate(() => localStorage.getItem("kpool-theme"))).toBe(storageBefore);
      const palette = await preview.evaluate((element, mode) => {
        const style = getComputedStyle(element);
        return { actual: style.getPropertyValue("--wiki-card-background").trim(), expected: style.getPropertyValue(`--wiki-card-background-${mode}`).trim(), surface: style.getPropertyValue("--surface-base").trim() };
      }, localMode);
      expect(palette.actual).toBe(palette.expected);
      expect(palette.surface).toBe(localMode === "dark" ? "#16223a" : "#fffbf7");
      await expect(page.getByTestId("wiki-edit-root")).not.toHaveAttribute("data-theme");
      expect(await page.getByTestId("wiki-edit-sidebar").evaluate((element) => getComputedStyle(element).getPropertyValue("--surface-base").trim())).toBe(globalMode === "dark" ? "#16223a" : "#fffbf7");
      await globalToggle.click();
      await expect(preview).toHaveAttribute("data-theme", localMode);
      await globalToggle.click();
    }
  }
});

test("dark header login uses readable text without a button background", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("kpool-theme", "dark"));
  await page.goto("/login");
  const login = page.getByRole("banner").getByRole("link", { name: "Log in", exact: true });
  await expect(login).toHaveCSS("color", "rgb(255, 247, 239)");
  await expect(login).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("OS fallback and denied storage remain usable without false save success", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("storage denied"); } });
  });
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const toggle = page.getByRole("switch", { name: "Display mode" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("status").filter({ hasText: "Could not save" })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

for (const locale of ["ja", "ko"] as const) {
  test(`theme controls are localized for ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.getByRole("switch", { name: locale === "ja" ? "表示モード" : "표시 모드" })).toBeVisible();
  });
}
