import { expect, test } from "@playwright/test";

test("wiki detail page shows the public layout and flip interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/wiki/ja/gr-aurora-echo?themeColor=%234c5cff");

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
  await page.goto("/wiki/ja/empty");

  await expect(page.getByText("No public wiki yet")).toBeVisible();
});

test("wiki edit page supports inline edits and nested content controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/ja/gr-aurora-echo/edit?themeColor=%234c5cff");

  await expect(page.getByRole("heading", { name: "Aurora Echo" })).toBeVisible();
  await expect(page.getByTestId("wiki-edit-theme-badge")).toHaveText(
    "Theme #4C5CFF",
  );
  await expect(page.getByText("Saved")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save wiki changes" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Submit wiki for review" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Clear wiki changes" })).toBeVisible();
  await expect(page.getByLabel("Slug")).toHaveValue("gr-aurora-echo");
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
  await page.goto("/wiki/ja/gr-aurora-echo/edit?themeColor=%234c5cff");
  await expect(page.getByText("Saved")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save wiki changes" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Submit wiki for review" })).toHaveCount(1);

  await page.getByRole("button", { name: "code" }).click();
  await expect(page.getByTestId("wiki-code-editor")).toBeVisible();
  await page.getByLabel("Wiki code").fill(
    [
      "== Overview ==",
      "",
      "Updated overview from code mode.",
      "",
      "=== Style Guide ===",
      "",
      "A new nested section.",
      "",
      "== Members ==",
      "",
      "The lineup consists of five members handling a rotating balance of vocal, rap, and dance center duties.",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "gui" }).click();
  await expect(page.getByText("Style Guide")).toBeVisible();
  await expect(page.getByText("Updated overview from code mode.")).toBeVisible();

  await page.getByRole("button", { name: "code" }).click();
  await page.getByLabel("Wiki code").fill("== Overview ==\n\n[[image|id:cover]");
  await expect(page.getByTestId("wiki-code-error")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save wiki changes" })).toBeDisabled();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear wiki changes" }).click();
  await expect(page.getByTestId("wiki-code-error")).toHaveCount(0);
  await expect(page.getByLabel("Wiki code")).toHaveValue(/== Overview ==/);

  await page.getByLabel("Wiki code").fill(
    [
      "== Overview ==",
      "",
      "[[문서|대표 문서]]",
      "",
      "[[분류:테스트]]",
      "",
      "[* 주석 예시]",
      "",
      "[include(틀:Discography)]",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "gui" }).click();
  await expect(page.locator("a", { hasText: "대표 문서" })).toHaveAttribute(
    "href",
    "/wiki/ja/%EB%AC%B8%EC%84%9C",
  );
  await expect(page.getByLabel("Footnote: 주석 예시")).toBeVisible();
  await expect(page.getByText("Included from 틀:Discography")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear wiki changes" }).click();
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

test("wiki edit page exposes the TWICE namuwiki compatibility demo mock", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/ja/gr-twice/edit");

  await expect(page.getByRole("heading", { name: "TWICE", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "code" }).click();
  await expect(page.getByTestId("wiki-code-warnings")).toHaveCount(0);
  await expect(page.getByLabel("Wiki code")).toHaveValue(/== Overview ==/);
  await expect(page.getByLabel("Wiki code")).toHaveValue(/\[\[나연\(TWICE\)\|나연\]\]/);
  await page.getByRole("button", { name: "gui" }).click();
  await expect(page.locator('a[href="/wiki/ja/%EB%82%98%EC%97%B0(TWICE)"]')).toHaveCount(1);
  await expect(page.locator('a[href="/wiki/ja/tl-nayeon-twice"]')).toHaveAttribute(
    "href",
    "/wiki/ja/tl-nayeon-twice",
  );
  await expect(page.getByLabel("Footnote: 오디션 프로그램 SIXTEEN을 통해 결성되었다.")).toBeVisible();
  await expect(page.getByText("Included from 틀:TWICE/음반")).toBeVisible();
  await expect(page.getByTitle("YouTube embed: TWICE \"CHEER UP\" M/V")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/c7rCyll5AeY",
  );
  await expect(page.locator('a[href="/wiki/ja/tl-momo-twice"]')).toHaveAttribute(
    "href",
    "/wiki/ja/tl-momo-twice",
  );
});

test("twice member profile cards open the member wiki pages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/ja/gr-twice/edit");

  await page.locator('a[href="/wiki/ja/tl-nayeon-twice"]').click();
  await expect(page).toHaveURL(/\/wiki\/ja\/tl-nayeon-twice$/);
  await expect(page.getByRole("heading", { name: "나연" })).toBeVisible();
  await page.getByTestId("section-toggle-sec-nayeon-twice-overview").click({ force: true });
  await expect(page.getByText(/TWICE의 맏언니이자 리드보컬 포지션/)).toBeVisible();
});

test("wiki edit page converts supported media includes into embeds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/ja/gr-aurora-echo/edit");

  await page.getByRole("button", { name: "code" }).click();
  await page.getByLabel("Wiki code").fill(
    [
      "== Overview ==",
      "",
      "[include(틀:영상 정렬, url=jNQXAC9IVRw)]",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "gui" }).click();

  await expect(page.getByTitle("YouTube embed")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw",
  );
});
