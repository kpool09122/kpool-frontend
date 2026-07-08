import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockWikiDetail, type WikiDraftDetail } from "@kpool/wiki";

import { WikiEditPage } from "./WikiEditPage";
import { wikiImageMaxBase64Length, wikiImageMaxFileSizeBytes } from "@kpool/wiki";
import * as WikiImageLibraryModule from "../../../../components/Wiki/WikiImageLibrary";

const navigationMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: navigationMocks.refresh,
  }),
}));

const successState = {
  status: "success",
  data: createMockWikiDetail("gr-aurora-echo"),
} as const;
const underReviewState = {
  status: "success",
  data: {
    ...createMockWikiDetail("gr-aurora-echo"),
    status: "under_review",
  },
} as const;

const renderPage = (
  wikiState: { status: "success"; data: WikiDraftDetail } | {
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

const loadCropperImage = () => {
  const image = screen.getByTestId("image-cropper-image") as HTMLImageElement;

  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: 100 },
    naturalHeight: { configurable: true, value: 100 },
    width: { configurable: true, value: 100 },
    height: { configurable: true, value: 100 },
  });
  fireEvent.load(image);
};

describe("WikiEditPage", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,CROPPED_IMAGE");
  });

  afterEach(() => {
    cleanup();
    navigationMocks.refresh.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
    expect(screen.queryByLabelText("Slug")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Preview mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Default" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Theme color" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse editor sidebar" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByTestId("wiki-edit-root")).toHaveAttribute("data-theme", "light");
    expect(screen.getAllByTestId("wiki-edit-flip-input")[0]).not.toBeChecked();
    expect(screen.getAllByText("Selected image").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Edit hero image" })).not.toBeInTheDocument();
    expect(screen.getByTestId("wiki-edit-section-sec-overview")).toBeInTheDocument();
    expect(screen.getByTestId("wiki-edit-block-block-discography-quote")).toBeInTheDocument();
    expect(screen.getByTitle("YouTube embed: Stage video")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/low-tide-high-lights",
    );
    expect(screen.getAllByText("関連プロフィールはありません")[0]).toBeInTheDocument();
  });

  it("locks under-review drafts from editing, saving, and submitting", () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });
    const submitAdapter = vi.fn().mockResolvedValue({ ok: true });

    renderPage(underReviewState, saveAdapter, submitAdapter);

    const saveButton = screen.getByRole("button", { name: "Save wiki changes" });
    const submitButton = screen.getByRole("button", { name: "Submit wiki for review" });

    expect(saveButton).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("Under review");
    expect(screen.getByRole("button", { name: "Clear wiki changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "code" })).toBeDisabled();
    expect(screen.getByLabelText("Resource type")).toBeDisabled();
    expect(screen.getByLabelText("Theme color")).toBeDisabled();

    fireEvent.click(saveButton);
    fireEvent.click(submitButton);

    expect(saveAdapter).not.toHaveBeenCalled();
    expect(submitAdapter).not.toHaveBeenCalled();

    expect(screen.getByRole("button", { name: "Edit wiki title" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Edit basic" })[0]).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Open wiki image library" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Edit section Overview` })).toBeDisabled();
    expect(screen.getByRole("button", { name: `Delete section Overview` })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Edit text block" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "+ Section" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "+ Block" })[0]).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "code" }));

    expect(screen.queryByTestId("wiki-code-editor")).not.toBeInTheDocument();
  });

  it("keeps rejected drafts editable and submittable", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });
    const submitAdapter = vi.fn().mockResolvedValue({ ok: true });

    renderPage({
      status: "success",
      data: {
        ...createMockWikiDetail("gr-aurora-echo"),
        status: "rejected",
      },
    }, saveAdapter, submitAdapter);

    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Submit wiki for review" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "code" })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: "+ Section" })[0]).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    await waitFor(() => expect(saveAdapter).toHaveBeenCalled());
    expect(submitAdapter).not.toHaveBeenCalled();
  });

  it("renders relation names in the editable basic view", () => {
    renderPage({
      status: "success",
      data: {
        ...createMockWikiDetail("gr-twice"),
        basic: {
          ...createMockWikiDetail("gr-twice").basic,
          talents: [
            {
              wikiIdentifier: "talent-wiki-1",
              slug: "tl-momo",
              language: "ko",
              name: "MOMO",
              normalizedName: "momo",
            },
            {
              wikiIdentifier: "talent-wiki-2",
              slug: "tl-sana",
              language: "ko",
              name: "SANA",
              normalizedName: "sana",
            },
          ],
        },
      },
    });

    expect(screen.getAllByText("Talents").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "MOMO" })[0]).toHaveAttribute(
      "href",
      "/ko/wiki/tl-momo",
    );
  });

  it("opens the image library from the profile image and loads more images", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });
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

    renderPage(successState, saveAdapter);

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
    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));
    await waitFor(() => expect(saveAdapter).toHaveBeenCalled());
    expect(saveAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        heroImage: expect.objectContaining({
          imageIdentifier: "image-2",
        }),
      }),
    );
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

    await screen.findByText("画像を切り取る");
    expect(screen.queryByText("画像を選択またはここにドロップ")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "画像を選び直す" })).not.toBeInTheDocument();
    loadCropperImage();
    fireEvent.click(screen.getByRole("button", { name: "切り取りを確定" }));

    expect(await screen.findByText("選択中: upload.png")).toBeInTheDocument();
    expect(screen.queryByText("画像を選択またはここにドロップ")).not.toBeInTheDocument();
    expect(screen.getByAltText("選択中の画像プレビュー")).toHaveAttribute(
      "src",
      "data:image/png;base64,CROPPED_IMAGE",
    );
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
    await screen.findByText("画像を切り取る");
    loadCropperImage();
    fireEvent.click(screen.getByRole("button", { name: "切り取りを確定" }));
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

  it("rejects cropped wiki images that exceed the encoded upload limit", async () => {
    function MockFileReader(this: {
      onload: (() => void) | null;
      onerror: (() => void) | null;
      readAsDataURL: () => void;
      result: string | ArrayBuffer | null;
    }) {
      this.onload = null;
      this.onerror = null;
      this.result = null;
      this.readAsDataURL = () => {
        this.result = `data:image/png;base64,${"A".repeat(wikiImageMaxBase64Length + 1)}`;
        this.onload?.();
      };
    }

    vi.stubGlobal("FileReader", MockFileReader);
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
        files: [new File(["image"], "oversized-crop.png", { type: "image/png" })],
      },
    });

    await screen.findByText("画像を切り取る");
    vi.mocked(HTMLCanvasElement.prototype.toDataURL).mockReturnValue(
      `data:image/png;base64,${"A".repeat(wikiImageMaxBase64Length + 1)}`,
    );
    loadCropperImage();
    fireEvent.click(screen.getByRole("button", { name: "切り取りを確定" }));

    expect(
      await screen.findByText("画像は5MB以下のファイルを選択してください。"),
    ).toBeInTheDocument();
    expect(screen.queryByText("選択中: oversized-crop.png")).not.toBeInTheDocument();
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

    await screen.findByText("画像を切り取る");
    loadCropperImage();
    fireEvent.click(screen.getByRole("button", { name: "切り取りを確定" }));

    expect(await screen.findByText("選択中: remove-me.webp")).toBeInTheDocument();
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

  it("removes a newly added block when its editor is canceled", () => {
    renderPage();

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Quote" }));

    expect(screen.getByLabelText("Quote")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" }).at(-1)!);

    expect(screen.queryByLabelText("Quote")).not.toBeInTheDocument();
    expect(screen.queryByTestId(/wiki-edit-block-block-quote/)).not.toBeInTheDocument();
  });

  it("removes a newly added section when its editor is canceled", () => {
    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: "+ Section" }).at(-1)!);

    expect(screen.getByLabelText("Section title")).toHaveValue("New section");

    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" }).at(-1)!);

    expect(screen.queryByLabelText("Section title")).not.toBeInTheDocument();
    expect(screen.queryByText("New section")).not.toBeInTheDocument();
  });

  it("shows related profile cards from the Profiles block resource type selection", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
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
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderPage({
      status: "success",
      data: createMockWikiDetail("gr-twice"),
    }, saveAdapter);

    fireEvent.click(screen.getAllByRole("button", { name: "Edit profile_card_list block" })[0]);
    const resourceTypeSelect = screen.getAllByLabelText("Resource type")[0] as HTMLSelectElement;

    expect([...resourceTypeSelect.options].map((option) => option.value)).not.toContain("group");

    fireEvent.change(resourceTypeSelect, {
      target: { value: "talent" },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Load related profiles" }));

    expect(await screen.findAllByText("MOMO")).toHaveLength(1);
    expect(screen.getAllByText("SANA")).toHaveLength(1);
    expect(screen.queryByLabelText("Wiki slugs")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wiki/ja/gr-twice/related-profiles?resourceType=talent",
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Save" }).at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    await waitFor(() => expect(saveAdapter).toHaveBeenCalled());
    expect(JSON.stringify(saveAdapter.mock.calls[0]?.[0])).toContain(
      '"wikiIdentifiers":["11111111-1111-1111-1111-111111111111","22222222-2222-2222-2222-222222222222"]',
    );
  });

  it("edits the wiki title and saves it with the draft", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });

    renderPage(successState, saveAdapter);

    fireEvent.click(screen.getByRole("button", { name: "Edit wiki title" }));
    const titleForm = screen.getByDisplayValue("Aurora Echo").closest("form");

    expect(titleForm).not.toBeNull();
    fireEvent.change(within(titleForm as HTMLFormElement).getByLabelText("Title"), {
      target: { value: "Aurora Echo Updated" },
    });
    fireEvent.click(within(titleForm as HTMLFormElement).getByRole("button", { name: "Save" }));

    expect(screen.getByRole("heading", { name: "Aurora Echo Updated" })).toBeInTheDocument();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    await waitFor(() => expect(saveAdapter).toHaveBeenCalled());
    expect(saveAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        basic: expect.objectContaining({
          name: "Aurora Echo Updated",
        }),
      }),
    );
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

  it("keeps embed block edits out of code mode until the block form is saved", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });

    renderPage(successState, saveAdapter);

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Embed" }));
    fireEvent.change(screen.getByLabelText("Embed ID"), {
      target: { value: "ohVNJ2gxsmo" },
    });

    expect(screen.getByRole("button", { name: "code" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeDisabled();

    fireEvent.click(screen.getAllByRole("button", { name: "Save" }).at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: "code" }));

    const code = screen.getByLabelText("Wiki code") as HTMLTextAreaElement;
    expect(code.value).toContain(
      "[[embed|provider:youtube|id:ohVNJ2gxsmo|caption:New embed caption]]",
    );
    expect(code.value).not.toContain("id:new-embed-id");

    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    await waitFor(() => expect(saveAdapter).toHaveBeenCalled());
    expect(JSON.stringify(saveAdapter.mock.calls[0]?.[0])).toContain(
      '"embedId":"ohVNJ2gxsmo"',
    );
    expect(JSON.stringify(saveAdapter.mock.calls[0]?.[0])).not.toContain(
      '"embedId":"new-embed-id"',
    );
  });

  it("keeps new nested embed block edits when switching to code mode", () => {
    renderPage();

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview-style"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Embed" }));
    fireEvent.change(screen.getByLabelText("Embed ID"), {
      target: { value: "ohVNJ2gxsmo" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" }).at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: "code" }));

    const code = screen.getByLabelText("Wiki code") as HTMLTextAreaElement;
    expect(code.value).toContain(
      "[[embed|provider:youtube|id:ohVNJ2gxsmo|caption:New embed caption]]",
    );
    expect(code.value).not.toContain("id:new-embed-id");
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

    fireEvent.change(screen.getByLabelText("Theme color"), {
      target: { value: "#123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    expect(screen.getByText("Saving changes")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    expect(saveAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "gr-aurora-echo",
        themeColor: "#123456",
        wikiIdentifier: "gr-aurora-echo",
        translationSetIdentifier: "translation-set-gr-aurora-echo",
      }),
    );
  });

  it("saves SEO metadata updated from the sidebar", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });

    renderPage(successState, saveAdapter);

    fireEvent.change(screen.getByLabelText("Metadata title"), {
      target: { value: "  Aurora Echo SEO  " },
    });
    fireEvent.change(screen.getByLabelText("Metadata meta description"), {
      target: { value: "  Aurora Echo meta description.  " },
    });
    fireEvent.change(screen.getByLabelText("Keyword 1"), {
      target: { value: " aurora " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add keyword" }));
    fireEvent.change(screen.getByLabelText("Keyword 2"), {
      target: { value: " echo " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add keyword" }));
    fireEvent.change(screen.getByLabelText("Keyword 3"), {
      target: { value: " k-pop " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    await waitFor(() => expect(saveAdapter).toHaveBeenCalled());
    expect(saveAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "  Aurora Echo SEO  ",
        metaDescription: "  Aurora Echo meta description.  ",
        keywords: [" aurora ", " echo ", " k-pop "],
      }),
    );
  });

  it("keeps spaces while editing SEO text fields", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Metadata title"), {
      target: { value: "Aurora Echo SEO Title" },
    });
    fireEvent.change(screen.getByLabelText("Metadata meta description"), {
      target: { value: "Aurora Echo meta description with spaces." },
    });

    expect(screen.getByLabelText("Metadata title")).toHaveValue("Aurora Echo SEO Title");
    expect(screen.getByLabelText("Metadata meta description")).toHaveValue(
      "Aurora Echo meta description with spaces.",
    );
  });

  it("saves nested section blocks through the injected save adapter", async () => {
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });

    renderPage(successState, saveAdapter);

    const addControls = within(screen.getByTestId("wiki-edit-add-section-sec-overview-style"));
    fireEvent.click(addControls.getByText("+ Block"));
    fireEvent.click(addControls.getByRole("button", { name: "Quote" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Save" }).at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: "Save wiki changes" }));

    await waitFor(() => expect(saveAdapter).toHaveBeenCalled());
    expect(saveAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: expect.arrayContaining([
          expect.objectContaining({
            sectionIdentifier: "sec-overview",
            contents: expect.arrayContaining([
              expect.objectContaining({
                sectionIdentifier: "sec-overview-style",
                contents: expect.arrayContaining([
                  expect.objectContaining({
                    blockType: "quote",
                    content: "New quote",
                  }),
                ]),
              }),
            ]),
          }),
        ]),
      }),
    );
  });

  it("shows save failure and allows retrying", async () => {
    const saveAdapter = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });

    renderPage(successState, saveAdapter);

    fireEvent.change(screen.getByLabelText("Theme color"), {
      target: { value: "#123456" },
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
    const submitAdapter = vi.fn().mockResolvedValue({ ok: true, status: "under_review" });

    const { rerender } = renderPage(successState, saveAdapter, submitAdapter);

    fireEvent.change(screen.getByLabelText("Theme color"), {
      target: { value: "#123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit wiki for review" }));

    expect(screen.getByText("Submitting for review")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Submitted for review")).toBeInTheDocument());
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Submit wiki for review" })).toHaveTextContent("Under review");
    });
    expect(screen.getByRole("button", { name: "Edit wiki title" })).toBeDisabled();
    expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);

    rerender(
      React.createElement(WikiEditPage, {
        language: "ja",
        saveAdapter,
        slug: "gr-aurora-echo",
        submitAdapter,
        wikiState: successState,
      }),
    );

    expect(screen.getByRole("button", { name: "Save wiki changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submit wiki for review" })).toHaveTextContent("Under review");
    expect(submitAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "gr-aurora-echo",
        themeColor: "#123456",
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

    fireEvent.change(screen.getByLabelText("Theme color"), {
      target: { value: "#123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit wiki for review" }));

    await waitFor(() => expect(screen.getByText("Submit failed")).toBeInTheDocument());
    expect(screen.getByLabelText("Theme color")).toHaveValue("#123456");
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
      document.querySelector('a[href="/ja/wiki/%EB%AC%B8%EC%84%9C"]'),
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
    expect(document.querySelector('a[href="/ja/wiki/tl-nayeon-twice"]')).toBeNull();
    expect(screen.getByText("TWICE Members")).toBeInTheDocument();
    expect(screen.getAllByText("関連プロフィールはありません")[0]).toBeInTheDocument();
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

  it("moves resource type editing into the sidebar without showing slug controls", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "song" },
    });

    expect(screen.getByLabelText("Resource type")).toHaveValue("song");
    expect(screen.queryByLabelText("Slug")).not.toBeInTheDocument();
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
