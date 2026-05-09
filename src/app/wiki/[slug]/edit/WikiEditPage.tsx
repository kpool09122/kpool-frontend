"use client";

import { useId, useState } from "react";
import { type WikiDetail } from "@kpool/wiki";

import {
  type WikiEditorMode,
  type WikiPreviewMode,
  WikiBasicPanel,
  WikiCodeEditor,
  WikiEditSidebar,
  WikiHeroBasicFlipCard,
  WikiHeroPanel,
  WikiImageLibrary,
  WikiSectionEditor,
  WikiStatePanel,
  cardSurfaceStyle,
  mainBackgroundStyle,
} from "../../../../components/Wiki";
import { useI18n } from "../../../i18n/I18nProvider";
import { getWikiResourceLabel, type WikiResourceType } from "../../wikiRouting";
import { buildWikiThemeCssVariables } from "../wikiThemePalette";
import { type loadDraftWikiState } from "../../draftWiki";
import {
  createWikiImageUploadRequest,
  defaultWikiImagePerPage,
  type WikiImageListResponse,
  type WikiUploadedImage,
  wikiImageListResponseSchema,
  wikiImageUploadResponseSchema,
} from "../../wikiImages";
import { saveWikiDraft, type WikiSaveResult } from "./saveWikiDraft";
import { useWikiEditDraft } from "./useWikiEditDraft";

type WikiEditPageProps = {
  language: string;
  slug: string;
  themeColor?: string;
  wikiState: Awaited<ReturnType<typeof loadDraftWikiState>>;
  saveAdapter?: (draft: WikiDetail) => Promise<WikiSaveResult>;
};

type ImageLibraryState = {
  images: WikiUploadedImage[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  isOpen: boolean;
  isUploading: boolean;
  loadError: string | null;
  pageInfo: Pick<WikiImageListResponse, "current_page" | "last_page" | "total"> | null;
  uploadError: string | null;
};

const initialImageLibraryState: ImageLibraryState = {
  images: [],
  isInitialLoading: false,
  isLoadingMore: false,
  isOpen: false,
  isUploading: false,
  loadError: null,
  pageInfo: null,
  uploadError: null,
};

const readJsonResponse = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const getRouteErrorMessage = (body: unknown, fallback: string): string =>
  typeof body === "object" &&
  body !== null &&
  "message" in body &&
  typeof (body as { message: unknown }).message === "string"
    ? (body as { message: string }).message
    : fallback;

function WikiEditContent({
  data,
  language,
  saveAdapter,
}: {
  data: WikiDetail;
  language: string;
  saveAdapter: (draft: WikiDetail) => Promise<WikiSaveResult>;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki;
  const flipCardId = useId();
  const [isBasicFlipped, setIsBasicFlipped] = useState(false);
  const [editorMode, setEditorMode] = useState<WikiEditorMode>("gui");
  const [imageLibrary, setImageLibrary] = useState<ImageLibraryState>(
    initialImageLibraryState,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState<WikiPreviewMode>("light");
  const {
    canPersist,
    code,
    codeParseError,
    codeWarnings,
    draft,
    editingId,
    saveState,
    clearDraft,
    requestPublication,
    saveDraft,
    setEditingId,
    updateCode,
    updateBasic,
    updateHeroImage,
    updateSettings,
    updateSection,
    updateBlock,
    addSection,
    addBlock,
    deleteContent,
  } = useWikiEditDraft(data, { saveAdapter });
  const resourceLabel = getWikiResourceLabel(draft.resourceType as WikiResourceType);
  const themeStyles = buildWikiThemeCssVariables(draft.themeColor);
  const closeEditor = () => setEditingId(null);
  const editHeroImage = () => {
    setIsBasicFlipped(false);
    setEditingId("hero");
  };
  const editBasic = () => {
    setIsBasicFlipped(true);
    setEditingId("basic");
  };
  const isBusy = saveState.status === "saving" || saveState.status === "submitting";
  const clearChanges = () => {
    if (!window.confirm(t.discardChanges)) {
      return;
    }

    setIsBasicFlipped(false);
    clearDraft();
  };
  const loadImageLibraryPage = async (page: number) => {
    setImageLibrary((state) => ({
      ...state,
      isInitialLoading: page === 1,
      isLoadingMore: page > 1,
      isOpen: true,
      loadError: null,
    }));

    try {
      const response = await fetch(
        `/api/wiki/images?wikiIdentifier=${encodeURIComponent(
          draft.wikiIdentifier,
        )}&perPage=${defaultWikiImagePerPage}&page=${page}`,
      );
      const body = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getRouteErrorMessage(body, t.imageLibrary.listLoadFailed));
      }

      const imagePage = wikiImageListResponseSchema.parse(body);

      setImageLibrary((state) => ({
        ...state,
        images: page === 1 ? imagePage.images : [...state.images, ...imagePage.images],
        isInitialLoading: false,
        isLoadingMore: false,
        pageInfo: {
          current_page: imagePage.current_page,
          last_page: imagePage.last_page,
          total: imagePage.total,
        },
      }));
    } catch (error) {
      setImageLibrary((state) => ({
        ...state,
        isInitialLoading: false,
        isLoadingMore: false,
        loadError:
          error instanceof Error ? error.message : t.imageLibrary.listLoadFailed,
      }));
    }
  };
  const openImageLibrary = () => {
    void loadImageLibraryPage(1);
  };
  const uploadImage = async (file: File, base64Image: string) => {
    setImageLibrary((state) => ({
      ...state,
      isUploading: true,
      uploadError: null,
    }));

    try {
      const response = await fetch("/api/wiki/images/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          createWikiImageUploadRequest({
            altText: file.name,
            base64EncodedImage: base64Image,
            displayOrder: imageLibrary.images.length + 1,
            fileName: file.name,
            resourceType: draft.resourceType,
            wikiIdentifier: draft.wikiIdentifier,
          }),
        ),
      });
      const body = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getRouteErrorMessage(body, t.imageLibrary.uploadFailed));
      }

      wikiImageUploadResponseSchema.parse(body);
      setImageLibrary((state) => ({
        ...state,
        isUploading: false,
      }));
      await loadImageLibraryPage(1);
    } catch (error) {
      setImageLibrary((state) => ({
        ...state,
        isUploading: false,
        uploadError: error instanceof Error ? error.message : t.imageLibrary.uploadFailed,
      }));
    }
  };

  return (
    <main
      className="wiki-theme-scope min-h-screen px-5 py-6 text-text-strong sm:px-8 sm:py-10"
      data-theme={previewMode}
      data-testid="wiki-edit-root"
      style={{
        ...themeStyles,
        ...mainBackgroundStyle,
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-text-strong lg:text-5xl">
              {draft.basic.name}
            </h1>
            {saveState.showMessage ? (
              <p
                className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-text-muted"
                data-testid="wiki-edit-save-state"
              >
                {saveState.message}
              </p>
            ) : null}
          </div>
        </header>

        <div className="flex min-w-0 flex-col gap-8">
          <section>
            <WikiHeroBasicFlipCard
              basic={draft.basic}
              flipCardId={flipCardId}
              heroImage={draft.heroImage}
              isBasicEditing={editingId === "basic"}
              isFlipped={isBasicFlipped}
              isHeroEditing={editingId === "hero"}
              onCancel={closeEditor}
              onEditBasic={editBasic}
              onEditHero={editHeroImage}
              onFlipChange={setIsBasicFlipped}
              onOpenImageLibrary={openImageLibrary}
              onSaveBasic={(basic) => {
                updateBasic(basic);
                closeEditor();
              }}
              profileLabel={`${resourceLabel} ${t.profileSuffix}`}
              onSaveHero={(heroImage) => {
                updateHeroImage(heroImage);
                closeEditor();
              }}
            />
            <div className="hidden gap-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
              <WikiHeroPanel
                heroImage={draft.heroImage}
                isEditing={editingId === "hero"}
                onCancel={closeEditor}
                onEdit={editHeroImage}
                onOpenImageLibrary={openImageLibrary}
                onSave={(heroImage) => {
                  updateHeroImage(heroImage);
                  closeEditor();
                }}
              />
              <WikiBasicPanel
                basic={draft.basic}
                isEditing={editingId === "basic"}
                onCancel={closeEditor}
                onEdit={editBasic}
                onSave={(basic) => {
                  updateBasic(basic);
                  closeEditor();
                }}
              />
            </div>
          </section>

          {editorMode === "gui" ? (
            <section className="space-y-5">
              {draft.sections.map((section) => (
                <WikiSectionEditor
                  editingId={editingId}
                  key={section.sectionIdentifier}
                  language={language}
                  onAddBlock={addBlock}
                  onAddSection={addSection}
                  onCancel={closeEditor}
                  onDeleteContent={deleteContent}
                  onEdit={setEditingId}
                  onSaveBlock={(blockIdentifier, changes) => {
                    updateBlock(blockIdentifier, changes);
                    closeEditor();
                  }}
                  onSaveSection={(sectionIdentifier, changes) => {
                    updateSection(sectionIdentifier, changes);
                    closeEditor();
                  }}
                  section={section}
                />
              ))}
              <button
                className="w-full rounded-[1.5rem] border border-dashed border-stroke-subtle p-5 text-sm font-semibold uppercase tracking-[0.18em] text-text-muted"
                onClick={() => addSection()}
                style={cardSurfaceStyle}
                type="button"
              >
                {t.addSection}
              </button>
            </section>
          ) : (
            <WikiCodeEditor
              code={code}
              errorMessage={codeParseError}
              warnings={codeWarnings}
              onChange={updateCode}
              onClear={clearChanges}
            />
          )}
        </div>

        <WikiEditSidebar
          canPersist={canPersist}
          editorMode={editorMode}
          isBusy={isBusy}
          isOpen={isSidebarOpen}
          onEditorModeChange={setEditorMode}
          onClear={clearChanges}
          onPreviewModeChange={setPreviewMode}
          onSave={saveDraft}
          onSubmit={requestPublication}
          onToggle={() => setIsSidebarOpen((isOpen) => !isOpen)}
          onUpdateSettings={updateSettings}
          previewMode={previewMode}
          resourceType={draft.resourceType}
          slug={draft.slug}
          themeColor={draft.themeColor}
        />
        <WikiImageLibrary
          images={imageLibrary.images}
          isInitialLoading={imageLibrary.isInitialLoading}
          isLoadingMore={imageLibrary.isLoadingMore}
          isOpen={imageLibrary.isOpen}
          isUploading={imageLibrary.isUploading}
          loadError={imageLibrary.loadError}
          onClose={() => setImageLibrary((state) => ({ ...state, isOpen: false }))}
          onLoadMore={() => {
            if (imageLibrary.pageInfo) {
              void loadImageLibraryPage(imageLibrary.pageInfo.current_page + 1);
            }
          }}
          onUpload={uploadImage}
          pageInfo={imageLibrary.pageInfo}
          resourceType={draft.resourceType}
          uploadError={imageLibrary.uploadError}
          wikiIdentifier={draft.wikiIdentifier}
        />
      </div>
    </main>
  );
}

export function WikiEditPage({
  language,
  themeColor,
  wikiState,
  saveAdapter = saveWikiDraft,
}: WikiEditPageProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki;

  if (wikiState.status === "error") {
    return <WikiStatePanel message={wikiState.message} title={t.loadErrorTitle} tone="danger" />;
  }

  if (wikiState.status === "empty") {
    return (
      <WikiStatePanel
        message={t.emptyDraftMessage}
        title={t.emptyDraftTitle}
      />
    );
  }

  return (
    <WikiEditContent
      data={{
        ...wikiState.data,
        themeColor: themeColor ?? wikiState.data.themeColor,
      }}
      language={language}
      saveAdapter={saveAdapter}
    />
  );
}
