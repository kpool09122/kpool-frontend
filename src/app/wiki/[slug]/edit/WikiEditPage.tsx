"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { type WikiDraftDetail } from "@kpool/wiki";

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
  EditIcon,
  getString,
  mainBackgroundStyle,
  type WikiImageUsageRequestInput,
} from "../../../../components/Wiki";
import { useI18n } from "../../../../i18n/I18nProvider";
import { getWikiResourceLabel, type WikiResourceType } from "@kpool/wiki";
import { buildWikiThemeCssVariables } from "../wikiThemePalette";
import { type loadDraftWikiState } from "@/gateways/wiki/draftWiki";
import {
  createWikiImageUploadRequest,
  createWikiImageAssociationInput,
  defaultWikiImagePerPage,
  type WikiImageListResponse,
  type WikiUploadedImage,
} from "@kpool/wiki";
import { fetchWikiImages, uploadWikiImageRequest } from "@/gateways/wiki/wikiImageBrowserApi";
import { saveWikiDraft, submitWikiDraft } from "@/gateways/wiki/edit/saveWikiDraft";
import { useWikiEditDraft } from "./useWikiEditDraft";

type WikiEditPageProps = {
  language: string;
  slug: string;
  themeColor?: string;
  wikiState: Awaited<ReturnType<typeof loadDraftWikiState>>;
  saveAdapter?: (draft: WikiDraftDetail) => unknown;
  submitAdapter?: (draft: WikiDraftDetail) => unknown;
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

function WikiEditContent({
  data,
  language,
  saveAdapter,
  submitAdapter,
}: {
  data: WikiDraftDetail;
  language: string;
  saveAdapter: (draft: WikiDraftDetail) => unknown;
  submitAdapter: (draft: WikiDraftDetail) => unknown;
}) {
  const router = useRouter();
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
  const [isSubmitRefreshPending, setIsSubmitRefreshPending] = useState(false);
  const [isSubmittedReviewLocked, setIsSubmittedReviewLocked] = useState(false);

  useEffect(() => {
    setIsSubmitRefreshPending(false);
    if (data.status === "under_review") {
      setIsSubmittedReviewLocked(true);
    }
  }, [data]);

  const {
    canPersist,
    code,
    codeParseError,
    codeWarnings,
    draft,
    editingId,
    saveState,
    clearDraft,
    cancelEditing,
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
  } = useWikiEditDraft(data, {
    onSubmitSuccess: (result) => {
      if (result.status === "under_review") {
        setIsSubmittedReviewLocked(true);
      }
      setIsSubmitRefreshPending(true);
      router.refresh();
    },
    saveAdapter,
    submitAdapter,
  });
  const resourceLabel = getWikiResourceLabel(draft.resourceType as WikiResourceType);
  const sourceWiki = {
    language,
    resourceType: data.resourceType as WikiResourceType,
    slug: data.slug,
  };
  const themeStyles = buildWikiThemeCssVariables(draft.themeColor);
  const closeEditor = () => setEditingId(null);
  const isReviewLocked = draft.status === "under_review";
  const isEditLocked = isReviewLocked || isSubmitRefreshPending || isSubmittedReviewLocked;
  const editBasic = () => {
    if (isEditLocked) {
      return;
    }

    setIsBasicFlipped(true);
    setEditingId("basic");
  };
  const editTitle = () => {
    if (isEditLocked) {
      return;
    }

    setIsBasicFlipped(false);
    setEditingId("title");
  };
  const isBusy = saveState.status === "saving" || saveState.status === "submitting" || isSubmitRefreshPending;
  const clearChanges = () => {
    if (isEditLocked) {
      return;
    }

    if (!window.confirm(t.discardChanges)) {
      return;
    }

    setIsBasicFlipped(false);
    clearDraft();
  };
  const loadImageLibraryPage = (page: number) => {
    setImageLibrary((state) => ({
      ...state,
      isInitialLoading: page === 1,
      isLoadingMore: page > 1,
      isOpen: true,
      loadError: null,
    }));

    return fetchWikiImages({
      fallbackErrorMessage: t.imageLibrary.listLoadFailed,
      page,
      perPage: defaultWikiImagePerPage,
      translationSetIdentifier: draft.translationSetIdentifier,
    }).then((imagePage) => {
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
    }).catch((error: unknown) => {
      setImageLibrary((state) => ({
        ...state,
        isInitialLoading: false,
        isLoadingMore: false,
        loadError:
          error instanceof Error ? error.message : t.imageLibrary.listLoadFailed,
      }));
    });
  };
  const openImageLibrary = () => {
    if (isEditLocked) {
      return;
    }

    void loadImageLibraryPage(1);
  };
  const selectImageFromLibrary = (image: WikiUploadedImage) => {
    if (isEditLocked) {
      return;
    }

    updateHeroImage({
      imageIdentifier: image.imageIdentifier,
      alt: image.altText || image.sourceName || image.imageIdentifier,
      src: image.url,
    });
    setImageLibrary((state) => ({ ...state, isOpen: false }));
  };
  const imageAssociation = createWikiImageAssociationInput({
    resourceType: draft.resourceType,
    translationSetIdentifier: draft.translationSetIdentifier,
  });
  const uploadImage = (input: WikiImageUsageRequestInput) => {
    if (isEditLocked) {
      return Promise.reject(new Error("Draft wiki is under review."));
    }

    setImageLibrary((state) => ({
      ...state,
      isUploading: true,
      uploadError: null,
    }));

    return uploadWikiImageRequest({
      fallbackErrorMessage: t.imageLibrary.uploadFailed,
      requestBody: createWikiImageUploadRequest({
        altText: input.altText,
        base64EncodedImage: input.base64Image,
        displayOrder: imageLibrary.images.length + 1,
        fileName: input.file.name,
        imageAssociation,
        rightsConfirmationAgreed: input.rightsConfirmationAgreed,
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
      }),
    }).then(() => {
      setImageLibrary((state) => ({
        ...state,
        isUploading: false,
      }));
      return loadImageLibraryPage(1);
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : t.imageLibrary.uploadFailed;

      setImageLibrary((state) => ({
        ...state,
        isUploading: false,
        uploadError: message,
      }));
      return Promise.reject(new Error(message));
    });
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
          <div className="max-w-3xl">
            {editingId === "title" ? (
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const name = getString(formData, "title");

                  updateBasic({
                    ...draft.basic,
                    name,
                  });
                  closeEditor();
                }}
              >
                <label className="grid gap-2 text-sm font-semibold text-text-strong">
                  Title
                  <input
                    autoFocus
                    className="rounded-2xl border border-stroke-subtle bg-surface-raised px-4 py-3 text-3xl font-semibold text-text-strong outline-none focus:border-text-muted lg:text-4xl"
                    defaultValue={draft.basic.name}
                    name="title"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-full border border-stroke-subtle px-5 py-2 text-sm font-semibold text-text-strong"
                    style={cardSurfaceStyle}
                    type="submit"
                  >
                    Save
                  </button>
                  <button
                    className="rounded-full border border-stroke-subtle px-5 py-2 text-sm font-semibold text-text-muted"
                    onClick={closeEditor}
                    style={cardSurfaceStyle}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start gap-3">
                <h1 className="min-w-0 text-4xl font-semibold text-text-strong lg:text-5xl">
                  {draft.basic.name}
                </h1>
                <button
                  aria-label="Edit wiki title"
                  className="mt-1 rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:text-text-muted"
                  disabled={isEditLocked}
                  onClick={editTitle}
                  style={cardSurfaceStyle}
                  type="button"
                >
                  <EditIcon />
                </button>
              </div>
            )}
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
              disabled={isEditLocked}
              flipCardId={flipCardId}
              heroImage={draft.heroImage}
              isBasicEditing={editingId === "basic"}
              isFlipped={isBasicFlipped}
              onCancel={closeEditor}
              onEditBasic={editBasic}
              onFlipChange={setIsBasicFlipped}
              onOpenImageLibrary={openImageLibrary}
              onSaveBasic={(basic) => {
                updateBasic(basic);
                closeEditor();
              }}
              profileLabel={`${resourceLabel} ${t.profileSuffix}`}
            />
            <div className="hidden gap-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
              <WikiHeroPanel
                heroImage={draft.heroImage}
                onOpenImageLibrary={isEditLocked ? undefined : openImageLibrary}
              />
              <WikiBasicPanel
                basic={draft.basic}
                disabled={isEditLocked}
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
                  onCancel={cancelEditing}
                  onDeleteContent={deleteContent}
                  disabled={isEditLocked}
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
                  sourceWiki={sourceWiki}
                />
              ))}
              <button
                className="w-full rounded-[1.5rem] border border-dashed border-stroke-subtle p-5 text-sm font-semibold uppercase tracking-[0.18em] text-text-muted disabled:cursor-not-allowed"
                disabled={isEditLocked}
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
              disabled={isEditLocked}
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
          isReviewLocked={isEditLocked}
          onEditorModeChange={(mode) => {
            if (!isEditLocked) {
              setEditorMode(mode);
            }
          }}
          onClear={clearChanges}
          onPreviewModeChange={setPreviewMode}
          onSave={() => {
            if (!isEditLocked) {
              saveDraft();
            }
          }}
          onSubmit={() => {
            if (!isEditLocked) {
              void requestPublication();
            }
          }}
          onToggle={() => setIsSidebarOpen((isOpen) => !isOpen)}
          onUpdateSettings={(settings) => {
            if (!isEditLocked) {
              updateSettings(settings);
            }
          }}
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
          onSelectImage={selectImageFromLibrary}
          onUpload={uploadImage}
          pageInfo={imageLibrary.pageInfo}
          resourceType={draft.resourceType}
          uploadError={imageLibrary.uploadError}
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
  submitAdapter = submitWikiDraft,
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
      submitAdapter={submitAdapter}
    />
  );
}
