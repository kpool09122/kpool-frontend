import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMockWikiDetail } from "@kpool/wiki";

import { WikiEditPage } from "./WikiEditPage";
import { wikiImageMaxFileSizeBytes } from "../../wikiImageModel";
import * as WikiImageLibraryModule from "../../../../components/Wiki/WikiImageLibrary";

const successState = {
  status: "success",
  data: createMockWikiDetail("gr-aurora-echo"),
} as const;

const renderPage = (
  wikiState: { status: "success"; data: ReturnType<typeof createMockWikiDetail> } | {
    status: "error";
    message: string;
  } | {
    status: "empty";
  } = successState,
  saveAdapter = vi.fn().mockResolvedValue({ ok: true }),
  submitAdapter = vi.fn().mockResolvedValue({ ok: true }),
) =>
  render(
    React.createElement(WikiEditPage, {
      language: "ja",
      saveAdapter,
      slug: "gr-aurora-echo",
      submitAdapter,
      wikiState,
    }),
  );

describe("WikiEditPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not expose retired wiki image library compatibility helpers", () => {
    expect(WikiImageLibraryModule).not.toHaveProperty("createDefaultWikiImageUploadBody");
    expect(WikiImageLibraryModule).not.toHaveProperty("wikiImageLibraryPerPage");
  });

  it("renders the editable wiki layout with image overlays and save state", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Aurora Echo" })).toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit wiki for review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear wiki changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "gui" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "code" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Resource type")).toHaveValue("group");
    expect(screen.getByText("gr-")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toHaveValue("aurora-echo");
    expect(screen.getByRole("group", { name: "Preview mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Default" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Theme color" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse editor sidebar" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByTestId("wiki-edit-root")).toHaveAttribute("data-theme", "light");
    expect(screen.getAllByTestId("wiki-edit-flip-input")[0]).not.toBeChecked();
    expect(screen.getAllByText("Editable image").length).toBeGreaterThan(0);
    expect(screen.getByTestId("wiki-edit-section-sec-overview")).toBeInTheDocument();
    expect(screen.getByTestId("wiki-edit-block-block-discography-quote")).toBeInTheDocument();
    expect(screen.getByTitle("YouTube embed: Stage video")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/low-tide-high-lights",
    );
    expect(screen.getByRole("link", { name: /Aurora Echo/i })).toHaveAttribute(
      "href",
      "/wiki/ja/gr-aurora-echo",
    );
  });

  it("opens the image library from the profile image and loads more images", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            images: [
              {
                imageIdentifier: "image-1",
                url: "https://images.example.test/image-1.jpg",
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
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            images: [
              {
                imageIdentifier: "image-2",
                url: "https://images.example.test/image-2.webp",
                resourceType: "group",
                wikiIdentifier: "gr-aurora-echo",
                translationSetIdentifier: "translation-set-aurora-echo",
                displayOrder: 2,
                sourceUrl: "https://source.example.test/image-2",
                sourceName: "stage.webp",
                altText: "Stage image",
                isHidden: false,
                uploadedAt: "2026-05-09T00:00:00Z",
              },
            ],
            current_page: 2,
            last_page: 2,
            total: 2,
            per_page: 1,
          }),
          { status: 200 },
        ),
      );

    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: "Open wiki image library" })[0]);

    expect(await screen.findByTestId("wiki-image-library")).toBeInTheDocument();
    expect(await screen.findByText("代替テキスト: Cover image")).toBeInTheDocument();
    expect(screen.queryByText("cover.jpg")).not.toBeInTheDocument();
    expect(screen.queryByText("image-1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "さらに読み込む" }));

    expect(await screen.findByText("代替テキスト: Stage image")).toBeInTheDocument();
    expect(screen.queryByText("stage.webp")).not.toBeInTheDocument();
    expect(screen.queryByText("image-2")).not.toBeInTheDocument();
    expect(screen.getByText("すべての画像を読み込みました")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "画像を選択: Stage image" }));

    expect(screen.queryByTestId("wiki-image-library")).not.toBeInTheDocument();
    expect(screen.getAllByAltText("Stage image")).toHaveLength(2);
    expect(screen.getAllByAltText("Stage image")[0]).toHaveAttribute(
      "src",
      "https://images.example.test/image-2.webp",
    );
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/wiki/images?translationSetIdentifier=translation-set-gr-aurora-echo&perPage=12&page=1",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/wiki/images?translationSetIdentifier=translation-set-gr-aurora-echo&perPage=12&page=2",
    );
  });

  it("keeps keyboard focus inside the image library dialog and restores focus on Escape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          images: [
            {
              imageIdentifier: "image-1",
              url: "https://images.example.test/image-1.jpg",
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
        }),
        { status: 200 },
      ),
    );

    renderPage();

    const opener = screen.getAllByRole("button", { name: "Open wiki image library" })[0];

    opener.focus();
    fireEvent.click(opener);

    const dialog = await screen.findByRole("dialog", { name: "画像ライブラリ" });
    const closeButton = screen.getByRole("button", { name: "閉じる" });

    expect(closeButton).toHaveFocus();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await screen.findByText("代替テキスト: Cover image");

    const loadMoreButton = screen.getByRole("button", { name: "さらに読み込む" });

    loadMoreButton.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(loadMoreButton).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "画像ライブラリ" })).toBeNull());
    expect(opener).toHaveFocus();
  });

  it("keeps the hidden image file input out of the dialog tab order", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          images: [],
          current_page: 1,
          last_page: 1,
          total: 0,
          per_page: 12,
        }),
        { status: 200 },
      ),
    );

    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: "Open wiki image library" })[0]);
    expect(await screen.findByText("アップロード済み画像はまだありません")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "画像の利用申請" }));

    const uploadInput = screen.getByLabelText("画像を選択またはここにドロップ");

    expect(uploadInput).toHaveAttribute("type", "file");
    expect(uploadInput).toHaveAttribute("tabindex", "-1");
  });

  it("switches tabs and submits an image usage request with source metadata", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            images: [],
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 12,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            imageIdentifier: "uploaded-image",
            resourceType: "group",
            status: "draft",
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            images: [
              {
                imageIdentifier: "uploaded-image",
                url: "https://images.example.test/uploaded-image.png",
                resourceType: "group",
                wikiIdentifier: "gr-aurora-echo",
                translationSetIdentifier: "translation-set-aurora-echo",
                displayOrder: 1,
                sourceUrl: "https://commons.wikimedia.org/wiki/File:Upload.png",
                sourceName: "Wikimedia Commons",
                altText: "Stage upload",
                isHidden: false,
                uploadedAt: "2026-05-09T00:00:00Z",
              },
            ],
            current_page: 1,
            last_page: 1,
            total: 1,
            per_page: 12,
          }),
          { status: 200 },
        ),
      );

    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: "Open wiki image library" })[0]);
    expect(await screen.findByText("アップロード済み画像はまだありません")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "画像一覧" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "画像の利用申請" }));
    expect(screen.getByRole("tab", { name: "画像の利用申請" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByText(
        "申請が承認されると、画像一覧からアップロードした画像を利用できるようになります。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("承認済み画像は他の言語のWikiでも利用できます。"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("wiki-image-upload-input"), {
      target: {
        files: [new File(["image"], "upload.png", { type: "image/png" })],
      },
    });

    expect(screen.getByText("選択中: upload.png")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("参照元URL"), {
      target: { value: "https://commons.wikimedia.org/wiki/File:Upload.png" },
    });
    fireEvent.change(screen.getByLabelText("参照元サイト名"), {
      target: { value: "Wikimedia Commons" },
    });
    fireEvent.change(screen.getByLabelText("altテキスト"), {
      target: { value: "Stage upload" },
    });
    fireEvent.click(
      screen.getByLabelText("著作権や肖像権に問題がないことを確認しました。"),
    );

    fireEvent.click(screen.getByRole("button", { name: "利用申請を送信" }));

    expect(
      await screen.findByText("申請を送信しました。申請内容を確認しますので、しばらくお待ちください。"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "承認を行うには？" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "画像の利用申請" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/wiki/images/upload",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"sourceName":"Wikimedia Commons"'),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual(
      expect.objectContaining({
        altText: "Stage upload",
        rightsConfirmationAgreed: true,
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Upload.png",
        translationSetIdentifier: "translation-set-gr-aurora-echo",
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          images: [],
          current_page: 1,
          last_page: 1,
          total: 0,
          per_page: 12,
        }),
        { status: 200 },
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Open wiki image library" })[0]);

    expect(await screen.findByTestId("wiki-image-library")).toBeInTheDocument();
    expect(
      screen.queryByText("申請を送信しました。申請内容を確認しますので、しばらくお待ちください。"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "画像一覧" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps image usage requests disabled until required fields are filled", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          images: [],
          current_page: 1,
          last_page: 1,
          total: 0,
          per_page: 12,
        }),
        { status: 200 },
      ),
    );

    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: "Open wiki image library" })[0]);
    expect(await screen.findByText("アップロード済み画像はまだありません")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "画像の利用申請" }));

    const submitButton = screen.getByRole("button", { name: "利用申請を送信" });

    expect(submitButton).toBeDisabled();
    fireEvent.change(screen.getByTestId("wiki-image-upload-input"), {
      target: {
        files: [new File(["image"], "upload.png", { type: "image/png" })],
      },
    });
    fireEvent.change(screen.getByLabelText("参照元URL"), {
      target: { value: "https://commons.wikimedia.org/wiki/File:Upload.png" },
    });
    fireEvent.change(screen.getByLabelText("参照元サイト名"), {
      target: { value: "Wikimedia Commons" },
    });
    fireEvent.change(screen.getByLabelText("altテキスト"), {
      target: { value: "Stage upload" },
    });

    expect(submitButton).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText("著作権や肖像権に問題がないことを確認しました。"),
    );

    expect(submitButton).toBeEnabled();
  });

  it("rejects unsupported image files before upload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          images: [],
          current_page: 1,
          last_page: 1,
          total: 0,
          per_page: 12,
        }),
        { status: 200 },
      ),
    );

    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: "Open wiki image library" })[0]);
    expect(await screen.findByText("アップロード済み画像はまだありません")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "画像の利用申請" }));

    fireEvent.change(screen.getByTestId("wiki-image-upload-input"), {
      target: {
        files: [new File(["text"], "notes.txt", { type: "text/plain" })],
      },
    });

    expect(
      await screen.findByText("jpg、jpeg、png、webp の画像のみアップロードできます。"),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized image files before upload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          images: [],
          current_page: 1,
          last_page: 1,
          total: 0,
          per_page: 12,
        }),
        { status: 200 },
      ),
    );

    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: "Open wiki image library" })[0]);
    expect(await screen.findByText("アップロード済み画像はまだありません")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "画像の利用申請" }));

    fireEvent.change(screen.getByTestId("wiki-image-upload-input"), {
      target: {
        files: [
          new File(
            [new Uint8Array(wikiImageMaxFileSizeBytes + 1)],
            "oversized.png",
            { type: "image/png" },
          ),
        ],
      },
    });

    expect(
      await screen.findByText("画像は5MB以下のファイルを選択してください。"),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("removes a selected image before upload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          images: [],
          current_page: 1,
          last_page: 1,
          total: 0,
          per_page: 12,
        }),
        { status: 200 },
      ),
    );

    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: "Open wiki image library" })[0]);
    expect(await screen.findByText("アップロード済み画像はまだありません")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "画像の利用申請" }));

    fireEvent.change(screen.getByTestId("wiki-image-upload-input"), {
      target: {
        files: [new File(["image"], "remove-me.webp", { type: "image/webp" })],
      },
    });

    expect(screen.getByText("選択中: remove-me.webp")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "選択を解除" }));

    expect(screen.queryByText("選択中: remove-me.webp")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "利用申請を送信" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("adds a block inside a section and opens the new block editor", () => {
    renderPage();

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Quote" }));

    expect(screen.getByLabelText("Quote")).toBeInTheDocument();
  });

  it("shows the formatting toolbar only while editing a text block", () => {
    renderPage();

    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit text block" })[0]);

    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Italic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Insert link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Strike" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Link destination")).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Insert link" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert link" }));

    expect(screen.getByLabelText("Link destination")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" }).at(-1)!);

    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit quote block" })[0]);

    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
  });

  it("clears draft changes back to the loaded wiki", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Quote" }));

    expect(screen.getByLabelText("Quote")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear wiki changes" }));

    expect(screen.queryByLabelText("Quote")).not.toBeInTheDocument();
    expect(confirmSpy).toHaveBeenCalledWith("Discard unsaved wiki changes?");

    confirmSpy.mockRestore();
  });

  it("keeps draft changes when clear is canceled", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderPage();

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Quote" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear wiki changes" }));

    expect(screen.getByLabelText("Quote")).toBeInTheDocument();
    expect(confirmSpy).toHaveBeenCalledWith("Discard unsaved wiki changes?");

    confirmSpy.mockRestore();
  });

  it("switches to code mode and reflects valid edits back into gui mode", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.change(screen.getByLabelText("Wiki code"), {
      target: {
        value: [
          "== Overview ==",
          "",
          "Updated overview from code mode.",
          "",
          "=== Style Guide ===",
          "",
          "A new nested section.",
        ].join("\n"),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "gui" }));

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Style Guide")).toBeInTheDocument();
    expect(screen.getByText("Updated overview from code mode.")).toBeInTheDocument();
  });

  it("shows a parse error for invalid code and clears back to the last loaded draft", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.change(screen.getByLabelText("Wiki code"), {
      target: {
        value: ["== Overview ==", "", "[[image|id:cover]"].join("\n"),
      },
    });

    expect(screen.getByTestId("wiki-code-error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Clear invalid code" }));

    expect(confirmSpy).toHaveBeenCalledWith("Discard unsaved wiki changes?");
    expect(screen.queryByTestId("wiki-code-error")).not.toBeInTheDocument();
    expect((screen.getByLabelText("Wiki code") as HTMLTextAreaElement).value).toContain(
      "== Overview ==",
    );

    confirmSpy.mockRestore();
  });

  it("saves the loaded draft through the injected save adapter", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });

    renderPage(successState, saveAdapter);

    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "custom-title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    expect(screen.getByText("Saving changes")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    expect(saveAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "gr-custom-title",
        wikiIdentifier: "gr-aurora-echo",
        translationSetIdentifier: "translation-set-gr-aurora-echo",
      }),
    );
  });

  it("shows save failure and allows retrying", async () => {
    const saveAdapter = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });

    renderPage(successState, saveAdapter);

    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "retry-title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    await waitFor(() => expect(screen.getByText("Save failed")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    expect(saveAdapter).toHaveBeenCalledTimes(2);
  });

  it("submits the loaded draft through the injected submit adapter", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });
    const submitAdapter = vi.fn().mockResolvedValue({ ok: true });

    renderPage(successState, saveAdapter, submitAdapter);

    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "review-title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit wiki for review" }));

    expect(screen.getByText("Submitting for review")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Submitted for review")).toBeInTheDocument());
    expect(submitAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "gr-review-title",
        wikiIdentifier: "gr-aurora-echo",
        translationSetIdentifier: "translation-set-gr-aurora-echo",
      }),
    );
  });

  it("shows submit failure, keeps draft changes, and allows retrying", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });
    const submitAdapter = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });

    renderPage(successState, saveAdapter, submitAdapter);

    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "retry-review" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit wiki for review" }));

    await waitFor(() => expect(screen.getByText("Submit failed")).toBeInTheDocument());
    expect(screen.getByLabelText("Slug")).toHaveValue("retry-review");
    expect(screen.getByRole("button", { name: "Submit wiki for review" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Submit wiki for review" }));

    await waitFor(() => expect(screen.getByText("Submitted for review")).toBeInTheDocument());
    expect(submitAdapter).toHaveBeenCalledTimes(2);
  });

  it("prevents duplicate submit clicks while the submit adapter is pending", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });
    let resolveSubmit: ((result: { ok: true }) => void) | undefined;
    const submitAdapter = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    renderPage(successState, saveAdapter, submitAdapter);

    const submitButton = screen.getByRole("button", { name: "Submit wiki for review" });

    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitAdapter).toHaveBeenCalledTimes(1);
    resolveSubmit?.({ ok: true });
    await waitFor(() => expect(screen.getByText("Submitted for review")).toBeInTheDocument());
  });

  it("keeps submit disabled while code has a parse error", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.change(screen.getByLabelText("Wiki code"), {
      target: {
        value: ["== Overview ==", "", "[[image|id:cover]"].join("\n"),
      },
    });

    expect(screen.getByTestId("wiki-code-error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit wiki for review" })).toBeDisabled();
  });

  it("shows compatibility warnings for namuwiki syntax that falls back to text blocks", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.change(screen.getByLabelText("Wiki code"), {
      target: {
        value: [
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
      },
    });

    expect(screen.queryByTestId("wiki-code-warnings")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wiki-code-error")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "gui" }));

    expect(
      document.querySelector('a[href="/wiki/ja/%EB%AC%B8%EC%84%9C"]'),
    ).not.toBeNull();
    expect(screen.getByLabelText("Footnote: 주석 예시")).toBeInTheDocument();
    expect(screen.getByText("Included from 틀:Discography")).toBeInTheDocument();
  });

  it("shows compatibility warnings immediately for the dedicated namuwiki demo mock", () => {
    renderPage({
      status: "success",
      data: createMockWikiDetail("gr-twice"),
    });

    fireEvent.click(screen.getByRole("button", { name: "code" }));

    expect(screen.queryByTestId("wiki-code-warnings")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "gui" }));
    expect(document.querySelector('a[href="/wiki/ja/tl-nayeon-twice"]')).not.toBeNull();
    expect(screen.getByText("TWICE Members")).toBeInTheDocument();
  });

  it("maps supported media include macros into embed blocks in gui mode", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "code" }));
    fireEvent.change(screen.getByLabelText("Wiki code"), {
      target: {
        value: [
          "== Overview ==",
          "",
          "[include(틀:영상 정렬, url=jNQXAC9IVRw)]",
        ].join("\n"),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "gui" }));

    expect(screen.getByTitle("YouTube embed")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw",
    );
  });

  it("moves resource type editing into the sidebar and keeps slug prefixes in sync", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "song" },
    });

    expect(screen.getByText("sg-")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toHaveValue("aurora-echo");

    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "custom-title" },
    });

    expect(screen.getByLabelText("Slug")).toHaveValue("custom-title");
  });

  it("renders error and empty states", () => {
    const { rerender } = renderPage({ status: "error", message: "Broken" });
    expect(screen.getByText("Broken")).toBeInTheDocument();

    rerender(
      React.createElement(WikiEditPage, {
        language: "ja",
        slug: "gr-aurora-echo",
        wikiState: { status: "empty" },
      }),
    );
    expect(screen.getByText("No wiki draft")).toBeInTheDocument();
  });
});
