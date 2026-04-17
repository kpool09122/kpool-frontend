import { expect, test } from "@playwright/test";

test("wiki detail page shows the public layout and flip interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/wiki/aurora-echo?themeColor=%234c5cff");

  await expect(
    page.getByRole("heading", { name: /Aurora Echo/i }),
  ).toBeVisible();
  await expect(page.getByTestId("wiki-theme-badge")).toHaveText("Theme #4C5CFF");
  await expect(page.getByTestId("wiki-theme-root")).toHaveAttribute(
    "style",
    /--wiki-header-background-light:/,
  );
  const flipInput = page.getByTestId("wiki-flip-input");
  const flipButton = page.getByTestId("wiki-flip-front-toggle");
  const flipCard = page.getByTestId("wiki-flip-card");

  await expect(flipInput).not.toBeChecked();

  await flipButton.click();

  await expect(flipInput).toBeChecked();
  await expect(flipCard.getByText("North Harbor Entertainment")).toBeVisible();
  const overviewToggle = page.getByTestId("section-toggle-sec-overview");
  const overviewSection = page.getByTestId("section-sec-overview");
  await expect(overviewSection).not.toHaveAttribute("open", "");
  await overviewToggle.click({ force: true });
  await expect(overviewSection).toHaveAttribute("open", "");
  await expect(
    page.getByText(
      /Aurora Echo debuted with a performance style built around fluid formations/i,
    ),
  ).toBeVisible();
});

test("wiki detail page shows the empty state", async ({ page }) => {
  await page.goto("/wiki/empty");

  await expect(page.getByText("No public wiki yet")).toBeVisible();
});

test("wiki edit page supports inline edits and nested content controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/aurora-echo/edit?themeColor=%234c5cff");

  await expect(page.getByRole("heading", { name: "Aurora Echo" })).toBeVisible();
  await expect(page.getByTestId("wiki-edit-theme-badge")).toHaveText(
    "Theme #4C5CFF",
  );
  await expect(page.getByText("Saved")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save wiki changes" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Submit wiki for review" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Clear wiki changes" })).toBeVisible();
  await expect(page.getByLabel("Slug")).toHaveValue("aurora-echo");
  await expect(page.getByRole("group", { name: "Preview mode" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Default" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Theme color" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Collapse editor sidebar" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.getByTestId("wiki-edit-root")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Collapse editor sidebar" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Editable image").first()).toBeVisible();
  const editFlipInput = page.getByTestId("wiki-edit-flip-input");
  const editFlipButton = page.getByTestId("wiki-edit-flip-front-toggle");
  const editFlipCard = page.getByTestId("wiki-edit-flip-card");
  await expect(editFlipInput).not.toBeChecked();
  await editFlipButton.click();
  await expect(editFlipInput).toBeChecked();
  await expect(editFlipCard.getByText("North Harbor Entertainment")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/aurora-echo/edit?themeColor=%234c5cff");
  await expect(page.getByText("Saved")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save wiki changes" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Submit wiki for review" })).toHaveCount(1);
  await page.getByRole("button", { name: "Collapse editor sidebar" }).click();

  const overviewAddControls = page.getByTestId("wiki-edit-add-section-sec-overview");
  await overviewAddControls.getByText("+ Block").click();
  await overviewAddControls.getByRole("button", { name: "Quote" }).click();
  await expect(page.getByRole("textbox", { name: "Quote" })).toBeVisible();

  const overviewTextBlock = page.getByTestId("wiki-edit-block-block-overview-text");
  await overviewTextBlock.getByRole("button", { name: "Edit text block" }).click();
  await expect(page.getByRole("button", { name: "Bold" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Insert link" })).toBeVisible();
  const textEditor = page.getByRole("textbox", { name: "Text" });
  await textEditor.evaluate((node: HTMLElement) => {
    const selection = window.getSelection();
    const findFirstTextNode = (current: Node): Text | null => {
      if (current.nodeType === Node.TEXT_NODE) {
        return current as Text;
      }

      for (const child of current.childNodes) {
        const textNode = findFirstTextNode(child);

        if (textNode) {
          return textNode;
        }
      }

      return null;
    };
    const firstTextNode = findFirstTextNode(node);

    if (!selection || !firstTextNode) {
      return;
    }

    const range = document.createRange();
    range.setStart(firstTextNode, 0);
    range.setEnd(firstTextNode, Math.min(6, firstTextNode.textContent?.length ?? 0));
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.getByRole("button", { name: "Insert link" }).click();
  await page.getByLabel("Link destination").fill("https://example.com");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Bold" })).toHaveCount(0);
  await expect(
    overviewTextBlock.getByRole("link", { name: "Aurora" }),
  ).toHaveAttribute("href", "https://example.com");
  await expect(
    overviewTextBlock.getByRole("link", { name: "Aurora" }),
  ).toHaveAttribute("target", "_blank");

  await expect(
    page.getByTestId("wiki-edit-add-section-sec-discography-highlights-chart"),
  ).toContainText("Max depth reached");
});
