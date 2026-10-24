import { expect, test } from "./fixtures";
import { installYouTubePlayerMock } from "./youtube-player";

const e2eBaseUrl = `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`;

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([
    { name: "kpool-mock-account-status", value: "active", url: e2eBaseUrl },
    { name: "kpool-e2e-wiki-principal", value: "basic", url: e2eBaseUrl },
    { name: "kpool-locale", value: "en", url: e2eBaseUrl },
  ]);
});

test("wiki detail page shows the public layout and flip interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/wiki/ja/gr-aurora-echo?themeColor=%234c5cff");

  await expect(
    page.getByRole("heading", { name: /Aurora Echo/i }),
  ).toBeVisible();
  await expect(page.getByTestId("wiki-theme-badge")).toHaveCount(0);
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

test("both legacy language edit URLs redirect to the draft ID", async ({ page }) => {
  for (const path of ["/wiki/ja/gr-twice/edit", "/ja/wiki/gr-twice/edit"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/wiki\/gr-twice\/edit\?resourceType=group$/);
    await expect(page.getByRole("heading", { name: "TWICE", exact: true })).toBeVisible();
  }
});

test("public edit moves to a draft ID and changing UI language preserves unsaved content", async ({ page }) => {
  await page.goto("/ko/wiki/gr-twice?themeColor=%234c5cff");
  await page.getByRole("link", { name: "섹션 편집: Overview", exact: true }).click();
  await expect(page).toHaveURL(/\/wiki\/ko--gr-twice\/edit\?resourceType=group&themeColor=%234c5cff$/);
  const editorUrl = page.url();
  await page.getByRole("button", { name: /^(code|코드)$/, exact: true }).click();
  const code = page.getByTestId("wiki-code-textarea");
  await code.fill(`${await code.inputValue()}\n\nUnsaved edit language check`);
  const unsaved = await code.inputValue();
  await page.getByRole("banner").getByRole("combobox").selectOption("ja");
  await expect(page).toHaveURL(editorUrl);
  await expect(code).toHaveValue(unsaved);
  await page.reload();
  await expect(page).toHaveURL(editorUrl);
  await expect(page.getByRole("heading", { name: "TWICE", exact: true })).toBeVisible();
});

test("anonymous edit returns through the public detail before resolving a draft", async ({ page }) => {
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "kpool-locale", value: "en", url: e2eBaseUrl }]);
  await page.goto("/ko/wiki/gr-twice?themeColor=%234c5cff");
  await page.getByRole("link", { name: "섹션 편집: Overview", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  const returnTo = new URL(page.url()).searchParams.get("returnTo");
  expect(returnTo).toBe("/ko/wiki/gr-twice?edit=1&themeColor=%234c5cff");
  // Resume the destination after login has established the authenticated session.
  await page.context().addCookies([
    { name: "kpool-mock-account-status", value: "active", url: e2eBaseUrl },
    { name: "kpool-e2e-wiki-principal", value: "basic", url: e2eBaseUrl },
  ]);
  await page.goto(returnTo!);
  await expect(page).toHaveURL(/\/wiki\/ko--gr-twice\/edit\?resourceType=group&themeColor=%234c5cff$/);
  await expect(page.getByRole("heading", { name: "TWICE", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "섹션 편집: Overview", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/ko\/wiki\/gr-twice\?themeColor=%234c5cff$/);
  await expect(page.getByRole("link", { name: "섹션 편집: Overview", exact: true })).toBeVisible();
});

test("wiki edit page supports inline edits and nested content controls", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const saveRequests: unknown[] = [];
  const submitRequests: unknown[] = [];

  await page.route("**/api/wiki/drafts/*/submit", async (route) => {
    submitRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "under_review",
        wikiIdentifier: "88888888-8888-4888-8888-888888888888",
      }),
    });
  });

  await page.route("**/api/wiki/drafts/*", async (route) => {
    saveRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        language: "ja",
        name: "Aurora Echo",
        resourceType: "group",
        status: "draft",
        wikiIdentifier: "88888888-8888-4888-8888-888888888888",
      }),
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/gr-aurora-echo/edit?resourceType=group&themeColor=%234c5cff");

  await expect(page.getByRole("heading", { name: "Aurora Echo" })).toBeVisible();
  await expect(page.getByTestId("wiki-edit-theme-badge")).toHaveCount(0);
  await expect(page.getByText("Saved")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save wiki changes" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Submit wiki for review" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Clear wiki changes" })).toBeVisible();
  await expect(page.getByLabel("Slug")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Preview mode" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Default" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Theme color" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Collapse editor sidebar" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.getByTestId("wiki-edit-preview")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Collapse editor sidebar" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Selected image").first()).toBeVisible();
  const editFlipInput = page.getByTestId("wiki-edit-flip-input");
  const editFlipButton = page.getByTestId("wiki-edit-flip-front-toggle");
  const editFlipCard = page.getByTestId("wiki-edit-flip-card");
  await expect(editFlipInput).not.toBeChecked();
  await editFlipButton.click();
  await expect(editFlipInput).toBeChecked();
  await expect(editFlipCard.getByText("North Harbor Entertainment")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/gr-aurora-echo/edit?resourceType=group&themeColor=%234c5cff");
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
    "/ja/wiki/%EB%AC%B8%EC%84%9C",
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
  await overviewTextBlock.getByRole("button", { name: "Edit block: Text" }).click();
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

  await page.getByRole("button", { name: "Expand editor sidebar" }).click();
  await page.getByRole("button", { name: "Save wiki changes" }).click();
  await expect(page.getByTestId("wiki-edit-save-state")).toHaveText("Saved");
  expect(saveRequests).toContainEqual(
    expect.objectContaining({
      resourceType: "group",
      themeColor: "#4c5cff",
      basic: expect.objectContaining({
        name: "Aurora Echo",
      }),
      sections: expect.arrayContaining([
        expect.objectContaining({
          type: "section",
          title: "Overview",
        }),
      ]),
    }),
  );

  const submitButton = page.getByRole("button", { name: "Submit wiki for review" });

  const submissionResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/wiki/drafts/gr-aurora-echo/submit") &&
      response.request().method() === "POST",
  );
  await submitButton.click();
  expect((await submissionResponse).status()).toBe(201);
  expect(submitRequests).toEqual([
    expect.objectContaining({
      resourceType: "group",
      wikiId: "gr-aurora-echo",
    }),
  ]);
});

test("wiki edit page exposes the TWICE namuwiki compatibility demo mock", async ({
  page,
}) => {
  await installYouTubePlayerMock(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/gr-twice/edit?resourceType=group");

  await expect(page.getByRole("heading", { name: "TWICE", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "code" }).click();
  await expect(page.getByTestId("wiki-code-warnings")).toHaveCount(0);
  await expect(page.getByLabel("Wiki code")).toHaveValue(/== Overview ==/);
  await expect(page.getByLabel("Wiki code")).toHaveValue(/\[\[나연\(TWICE\)\|나연\]\]/);
  await page.getByRole("button", { name: "gui" }).click();
  await expect(page.locator('a[href="/ja/wiki/%EB%82%98%EC%97%B0(TWICE)"]')).toHaveCount(1);
  await expect(page.locator('a[href="/ja/wiki/tl-nayeon-twice"]')).toHaveCount(0);
  await expect(page.getByLabel("Footnote: 오디션 프로그램 SIXTEEN을 통해 결성되었다.")).toBeVisible();
  await expect(page.getByText("Included from 틀:TWICE/음반")).toBeVisible();
  const youtube = page.locator('iframe[src*="youtube-nocookie.com"]');
  await expect(youtube).toHaveCount(0);
  await page.getByRole("button", { name: 'Play: TWICE "CHEER UP" M/V', exact: true }).click();
  await expect(youtube).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/c7rCyll5AeY",
  );
  await expect(youtube).toHaveAttribute("title", 'TWICE "CHEER UP" M/V');
  await expect(page.locator('a[href="/ja/wiki/tl-momo-twice"]')).toHaveCount(0);
  await expect(page.getByText("No related profiles.")).toBeVisible();
});

test("wiki edit Profiles block loads related profiles from resource type selection", async ({
  page,
}) => {
  const saveRequests: unknown[] = [];
  let relatedProfilesRequestUrl = "";

  await page.route("**/api/wiki/ja/gr-twice/related-profiles?**", async (route) => {
    relatedProfilesRequestUrl = route.request().url();
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        profiles: [
          {
            wikiIdentifier: "11111111-1111-1111-1111-111111111111",
            slug: "tl-momo",
            language: "ja",
            resourceType: "talent",
            name: "MOMO",
            normalizedName: "momo",
            imageIdentifier: null,
            imageUrl: null,
            imageAltText: null,
          },
          {
            wikiIdentifier: "22222222-2222-2222-2222-222222222222",
            slug: "tl-sana",
            language: "ja",
            resourceType: "talent",
            name: "SANA",
            normalizedName: "sana",
            imageIdentifier: null,
            imageUrl: null,
            imageAltText: null,
          },
        ],
      }),
    });
  });
  await page.route("**/api/wiki/drafts/*", async (route) => {
    saveRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        language: "ja",
        name: "TWICE",
        resourceType: "group",
        status: "draft",
        wikiIdentifier: "88888888-8888-4888-8888-888888888888",
      }),
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/gr-twice/edit?resourceType=group");
  await page.getByRole("button", { name: "Collapse editor sidebar" }).click();

  const profilesBlock = page.getByTestId("wiki-edit-block-block-twice-members-profiles");
  await profilesBlock.getByRole("button", { name: "Edit block: Profiles" }).click();
  const resourceTypeSelect = profilesBlock.getByLabel("Resource type");

  await expect(resourceTypeSelect.locator("option[value='group']")).toHaveCount(0);
  await resourceTypeSelect.selectOption("talent");
  expect(relatedProfilesRequestUrl).toBe("");
  await profilesBlock.getByRole("button", { name: "Load related profiles" }).click();

  await expect(profilesBlock.getByText("MOMO").first()).toBeVisible();
  await expect(profilesBlock.getByText("SANA").first()).toBeVisible();
  await expect(profilesBlock.getByLabel("Wiki slugs")).toHaveCount(0);
  expect(relatedProfilesRequestUrl).toContain(
    "/api/wiki/ja/gr-twice/related-profiles?resourceType=talent",
  );

  await profilesBlock.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Expand editor sidebar" }).click();
  await page.getByRole("button", { name: "Save wiki changes" }).click();
  await expect(page.getByTestId("wiki-edit-save-state")).toHaveText("Saved");
  expect(JSON.stringify(saveRequests[0])).toContain(
    '"wikiIdentifiers":["11111111-1111-1111-1111-111111111111","22222222-2222-2222-2222-222222222222"]',
  );
});

test("wiki edit page opens the image library and submits an image usage request", async ({
  page,
}) => {
  let listRequestCount = 0;
  let uploadRequestBody: unknown = null;

  await page.route("**/api/wiki/images?**", async (route) => {
    listRequestCount += 1;
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify(
        listRequestCount === 1
          ? {
              images: [
                {
                  imageIdentifier: "image-1",
                  url: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg",
                  resourceType: "group",
                  wikiIdentifier: "gr-aurora-echo",
                  translationSetIdentifier: "translation-set-aurora-echo",
                  displayOrder: 1,
                  sourceUrl: "https://source.example.test/image-1",
                  sourceName: "cover.jpg",
                  altText: "Cover image",
                  isHidden: false,
                  uploadedAt: "2026-05-09T00:00:00Z",
                },
              ],
              current_page: 1,
              last_page: 2,
              total: 2,
              per_page: 1,
            }
          : {
              images: [
                {
                  imageIdentifier: "image-uploaded",
                  url: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg",
                  resourceType: "group",
                  wikiIdentifier: "gr-aurora-echo",
                  translationSetIdentifier: "translation-set-aurora-echo",
                  displayOrder: 2,
                  sourceUrl: "https://commons.wikimedia.org/wiki/File:Upload.png",
                  sourceName: "Wikimedia Commons",
                  altText: "Stage upload",
                  isHidden: false,
                  uploadedAt: "2026-05-09T00:00:00Z",
                },
              ],
              current_page: 2,
              last_page: 2,
              total: 2,
              per_page: 1,
            },
      ),
    });
  });
  await page.route("**/api/wiki/images/upload", async (route) => {
    uploadRequestBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        imageIdentifier: "image-uploaded",
        resourceType: "group",
        status: "draft",
        wikiIdentifier: "88888888-8888-4888-8888-888888888888",
      }),
    });
  });

  await page.context().addCookies([
    { name: "kpool-locale", value: "ja", url: e2eBaseUrl },
  ]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/gr-aurora-echo/edit?resourceType=group");
  await page.getByRole("button", { name: "Wiki画像ライブラリを開く" }).last().click();

  await expect(page.getByTestId("wiki-image-library")).toBeVisible();
  await expect(page.getByRole("tab", { name: "画像一覧" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /Cover image/ })).toBeVisible();
  await page.getByRole("button", { name: "さらに読み込む" }).click();
  await expect(page.getByText("Stage upload")).toBeVisible();

  await page.getByRole("tab", { name: "画像の利用申請" }).click();
  await page.getByTestId("wiki-image-upload-input").setInputFiles({
    name: "upload.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1kAAAAASUVORK5CYII=", "base64"),
  });
  await page.getByRole("button", { name: "切り取りを確定" }).click();
  await expect(page.getByText("選択中: upload.png")).toBeVisible();
  await expect.poll(() => uploadRequestBody).toBeNull();
  await expect(page.getByRole("button", { name: "利用申請を送信" })).toBeDisabled();
  await page.getByLabel("参照元URL").fill("https://commons.wikimedia.org/wiki/File:Upload.png");
  await page.getByLabel("参照元サイト名").fill("Wikimedia Commons");
  await page.getByLabel("altテキスト").fill("Stage upload");
  await expect(page.getByRole("button", { name: "利用申請を送信" })).toBeDisabled();
  await page.getByLabel("著作権や肖像権に問題がないことを確認しました。").check();

  await page.getByRole("button", { name: "利用申請を送信" }).click();
  await expect(
    page.getByText("申請を送信しました。申請内容を確認しますので、しばらくお待ちください。"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "承認を行うには？" })).toHaveCount(0);

  await expect.poll(() => uploadRequestBody).toEqual(
    expect.objectContaining({
      altText: "Stage upload",
      resourceType: "group",
      rightsConfirmationAgreed: true,
      sourceName: "Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Upload.png",
      translationSetIdentifier: "translation-set-gr-aurora-echo",
    }),
  );
});

test("identifier-only profile cards do not open mock member wiki pages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/gr-twice/edit?resourceType=group");

  await expect(page.locator('a[href="/ja/wiki/tl-nayeon-twice"]')).toHaveCount(0);
  await expect(page.getByText("No related profiles.")).toBeVisible();
});

test("wiki edit page converts supported media includes into embeds", async ({
  page,
}) => {
  await installYouTubePlayerMock(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/gr-aurora-echo/edit?resourceType=group");

  await page.getByRole("button", { name: "code" }).click();
  await page.getByLabel("Wiki code").fill(
    [
      "== Overview ==",
      "",
      "[include(틀:영상 정렬, url=jNQXAC9IVRw)]",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "gui" }).click();

  const youtube = page.locator('iframe[src*="youtube-nocookie.com"]');
  await expect(youtube).toHaveCount(0);
  await page.getByRole("button", { name: "Play: YouTube", exact: true }).click();
  await expect(youtube).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw",
  );
  await expect(youtube).toHaveAttribute("title", "YouTube");
});

test("editor UI language changes preserve basic input and local validation messages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/ko--gr-twice/edit?resourceType=group");
  const url = page.url();
  await page.getByRole("button", { name: "Collapse editor sidebar" }).click();
  await page.getByRole("button", { name: "Edit basic", exact: true }).click();
  await page.getByRole("textbox", { name: "Fandom Name", exact: true }).fill("Unsaved fandom");
  await page.getByRole("banner").getByRole("combobox").selectOption("ja");
  await expect(page).toHaveURL(url);
  await expect(page.getByRole("textbox", { name: "ファンダム名", exact: true })).toHaveValue("Unsaved fandom");
  await expect(page.getByRole("textbox", { name: "事務所: 検索キーワード", exact: true })).toHaveAttribute("placeholder", "Wiki名で検索");
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
  await page.getByRole("button", { name: "編集サイドバーを開く" }).click();
  await page.getByRole("button", { name: "コード", exact: true }).click();
  await page.getByTestId("wiki-code-textarea").fill("invalid code without a heading");
  await expect(page.getByTestId("wiki-code-error")).toContainText("最上位の見出し");
  await page.getByRole("banner").getByRole("combobox").selectOption("ko");
  await expect(page.getByTestId("wiki-code-error")).toContainText("최상위 제목");
  await expect(page.getByTestId("wiki-code-textarea")).toHaveValue("invalid code without a heading");
  await expect(page).toHaveURL(url);
});

test("unsaved Wiki edits warn on links, browser back and reload, and stop after saving", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/en/wiki/gr-aurora-echo");
  await page.getByRole("link", { name: "Edit section: Overview", exact: true }).click();
  await expect(page).toHaveURL(/\/wiki\/en--gr-aurora-echo\/edit\?resourceType=group$/);
  const editorUrl = page.url();
  await page.getByRole("button", { name: "Collapse editor sidebar" }).click();
  await page.getByRole("button", { name: "Edit basic", exact: true }).click();
  await page.getByRole("textbox", { name: "Fandom Name", exact: true }).fill("Unsaved fandom");
  const warning = "You have unsaved changes. Leaving without saving will lose your edits. Leave this page?";
  let dialog = page.waitForEvent("dialog");
  const homeClick = page.getByRole("banner").locator('a[href="/en"]').click();
  expect((await dialog).message()).toBe(warning);
  await (await dialog).dismiss();
  await homeClick;
  await expect(page).toHaveURL(editorUrl);
  await expect(page.getByRole("textbox", { name: "Fandom Name", exact: true })).toHaveValue("Unsaved fandom");
  dialog = page.waitForEvent("dialog");
  const back = page.evaluate(() => history.back());
  const backDialog = await dialog;
  expect(["confirm", "beforeunload"]).toContain(backDialog.type());
  if (backDialog.type() === "confirm") expect(backDialog.message()).toBe(warning);
  await backDialog.dismiss();
  await back;
  await expect(page).toHaveURL(editorUrl);
  dialog = page.waitForEvent("dialog");
  const reload = page.evaluate(() => location.reload());
  expect((await dialog).type()).toBe("beforeunload");
  await (await dialog).dismiss();
  await reload;
  await expect(page.getByRole("textbox", { name: "Fandom Name", exact: true })).toHaveValue("Unsaved fandom");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Expand editor sidebar" }).click();
  await page.route("**/api/wiki/drafts/en--gr-aurora-echo", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "draft", wikiIdentifier: "88888888-8888-4888-8888-888888888888", language: "en", name: "Aurora Echo", resourceType: "group" }) }));
  await page.getByRole("button", { name: "Save wiki changes", exact: true }).click();
  await expect(page.getByTestId("wiki-edit-save-state")).toContainText("Saved");
  await page.getByRole("banner").locator('a[href="/en"]').click();
  await expect(page).toHaveURL(/\/en$/);
});

test("restoring Wiki data and unfinished form inputs clears unsaved warnings", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/wiki/gr-aurora-echo/edit?resourceType=group");
  const font = page.getByRole("combobox", { name: "Font style", exact: true });
  const originalFont = await font.inputValue();
  const otherFont = await font.locator("option").evaluateAll((options, original) => options.map((option) => (option as HTMLOptionElement).value).find((value) => value !== original), originalFont);
  await font.selectOption(otherFont!);
  await expect(page.getByTestId("wiki-edit-save-state")).toHaveText("Unsaved changes");
  await font.selectOption(originalFont);
  await expect(page.getByTestId("wiki-edit-save-state")).toHaveCount(0);
  const hasLeaveWarning = () => page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  await expect.poll(hasLeaveWarning).toBe(false);
  await page.getByRole("button", { name: "Collapse editor sidebar" }).click();
  await page.getByRole("button", { name: "Edit basic", exact: true }).click();
  const fandom = page.getByRole("textbox", { name: "Fandom Name", exact: true });
  const originalFandom = await fandom.inputValue();
  await fandom.fill("Changed fandom");
  await expect.poll(hasLeaveWarning).toBe(true);
  await fandom.fill(originalFandom);
  await expect.poll(hasLeaveWarning).toBe(false);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Edit block: Text", exact: true }).first().click();
  const text = page.getByRole("textbox", { name: "Text", exact: true });
  await expect(text).toBeVisible();
  await expect.poll(hasLeaveWarning).toBe(false);
  await text.fill("Changed paragraph");
  await expect.poll(hasLeaveWarning).toBe(true);
  await text.press("ControlOrMeta+z");
  await expect.poll(hasLeaveWarning).toBe(false);
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  await page.getByRole("banner").locator('a[href="/en"]').click();
  await expect(page).toHaveURL(/\/en$/);
  expect(dialogs).toEqual([]);
});

for (const viewport of [{ name: "desktop", width: 1280, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
  test(`unsaved editor logout confirms before the request on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    let logoutRequests = 0;
    await page.route("**/api/identity/auth/logout", async (route) => {
      logoutRequests += 1;
      await page.context().clearCookies({ name: "kpool-mock-account-status" });
      await page.route("**/api/identity/auth/me", (authRoute) => authRoute.fulfill({ status: 401 }));
      await route.fulfill({ status: 204 });
    });
    await page.goto("/wiki/gr-aurora-echo/edit?resourceType=group");
    const editorUrl = page.url();
    await page.getByRole("button", { name: "Collapse editor sidebar" }).click();
    if (viewport.name === "mobile") await page.getByTestId("wiki-edit-flip-front-toggle").click();
    await page.getByRole("button", { name: "Edit basic", exact: true }).click();
    const fandom = page.getByRole("textbox", { name: "Fandom Name", exact: true });
    await fandom.fill("Unsaved fandom");
    const banner = page.getByRole("banner");
    if (viewport.name === "mobile") await banner.getByRole("button", { name: "Navigation menu" }).click();
    else await banner.getByRole("button", { name: /member/ }).hover();
    const messages: string[] = [];
    page.on("dialog", async (dialog) => {
      messages.push(dialog.message());
      if (messages.length <= 2) expect(logoutRequests).toBe(0);
      if (messages.length === 2) await dialog.accept();
      else await dialog.dismiss();
    });
    await banner.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(page).toHaveURL(editorUrl);
    expect(logoutRequests).toBe(0);
    expect((await page.context().cookies()).find((cookie) => cookie.name === "kpool-mock-account-status")?.value).toBe("active");
    await expect(fandom).toHaveValue("Unsaved fandom");
    expect(messages).toHaveLength(1);
    if (viewport.name === "desktop") await banner.getByRole("button", { name: /member/ }).hover();
    await banner.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(logoutRequests).toBe(1);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("Leaving without saving will lose your edits");
  });
}

for (const width of [1280, 390]) {
  test(`official colors remain editable after saving at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/wiki/gr-aurora-echo/edit?resourceType=group");
    await page.getByRole("button", { name: "Collapse editor sidebar", exact: true }).click();
    if (width < 1024) {
      await page.getByTestId("wiki-edit-flip-front-toggle").click();
    }

    await page.getByRole("button", { name: "Edit basic", exact: true }).click();
    const colorName = page.locator('input[name="officialColorLabel"]:visible').first();
    const color = page.locator('input[name="officialColorCode"]:visible').first();
    const originalName = await colorName.inputValue();
    const originalColor = await color.inputValue();
    await colorName.fill("First color");
    await expect(colorName).toHaveValue("First color");
    await color.fill("#112233");
    await expect(color).toHaveValue("#112233");
    await page.getByRole("button", { name: "Save", exact: true }).filter({ visible: true }).click();

    await page.getByRole("button", { name: "Edit basic", exact: true }).click();
    await expect(colorName).toHaveValue("First color");
    await expect(color).toHaveValue("#112233");
    await colorName.fill("Second color");
    await expect(colorName).toHaveValue("Second color");
    await color.fill("#abcdef");
    await expect(color).toHaveValue("#abcdef");
    await page.getByRole("button", { name: "Save", exact: true }).filter({ visible: true }).click();

    await page.getByRole("button", { name: "Edit basic", exact: true }).click();
    await expect(colorName).toHaveValue("Second color");
    await expect(color).toHaveValue("#abcdef");
    await colorName.fill("Unsaved color");
    await expect(colorName).toHaveValue("Unsaved color");
    const leaveDialog = page.waitForEvent("dialog");
    const leaveClick = page.getByRole("banner").locator("a[href]").first().click();
    const dialog = await leaveDialog;
    expect(dialog.type()).toBe("confirm");
    await dialog.dismiss();
    await leaveClick;
    await expect(colorName).toHaveValue("Unsaved color");

    await colorName.fill(originalName);
    await color.fill(originalColor);
    await page.getByRole("button", { name: "Save", exact: true }).filter({ visible: true }).click();
    await expect(page.getByTestId("wiki-edit-save-state")).toHaveCount(0);
    const hasLeaveWarning = () => page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    await expect.poll(hasLeaveWarning).toBe(false);

    await page.getByRole("button", { name: "Edit basic", exact: true }).click();
    await colorName.fill("Saved color");
    await page.getByRole("button", { name: "Save", exact: true }).filter({ visible: true }).click();
    await expect.poll(hasLeaveWarning).toBe(true);
    await page.route("**/api/wiki/drafts/*", (route) => route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        language: "ja", name: "Aurora Echo", resourceType: "group", status: "pending",
        wikiIdentifier: "88888888-8888-4888-8888-888888888888",
      }),
    }));
    await page.getByRole("button", { name: "Expand editor sidebar", exact: true }).click();
    await page.getByRole("button", { name: "Save wiki changes", exact: true }).click();
    await expect.poll(hasLeaveWarning).toBe(false);
  });
}
