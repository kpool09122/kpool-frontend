"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, ReloadIcon, UploadIcon } from "@radix-ui/react-icons";

import {
  createWikiImageUploadRequest,
  defaultWikiImagePerPage,
  isAcceptedWikiImageFile,
  type WikiImageListResponse,
  type WikiUploadedImage,
  wikiImageAcceptAttribute,
} from "../../../app/wiki/wikiImages";
import { useI18n } from "../../../app/i18n/I18nProvider";
import { cardSurfaceStyle } from "../styles";

type WikiImageLibraryTab = "images" | "request";

export type WikiImageUsageRequestInput = {
  file: File;
  base64Image: string;
  sourceUrl: string;
  sourceName: string;
  altText: string;
};

type WikiImageRequestForm = {
  sourceUrl: string;
  sourceName: string;
  altText: string;
  rightsConfirmed: boolean;
};

type WikiImageLibraryProps = {
  images: WikiUploadedImage[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  isOpen: boolean;
  isUploading: boolean;
  loadError: string | null;
  pageInfo: Pick<WikiImageListResponse, "current_page" | "last_page" | "total"> | null;
  resourceType: string;
  uploadError: string | null;
  onClose: () => void;
  onLoadMore: () => void;
  onUpload: (input: WikiImageUsageRequestInput) => Promise<void>;
};

const emptyRequestForm: WikiImageRequestForm = {
  sourceUrl: "",
  sourceName: "",
  altText: "",
  rightsConfirmed: false,
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("file-read-failed"));
    });
    reader.addEventListener("error", () => reject(new Error("file-read-failed")));
    reader.readAsDataURL(file);
  });

const hasCompleteRequestForm = (
  selectedFile: File | null,
  form: WikiImageRequestForm,
): selectedFile is File =>
  Boolean(selectedFile) &&
  form.sourceUrl.trim().length > 0 &&
  form.sourceName.trim().length > 0 &&
  form.altText.trim().length > 0 &&
  form.rightsConfirmed;

export function WikiImageLibrary({
  images,
  isInitialLoading,
  isLoadingMore,
  isOpen,
  isUploading,
  loadError,
  pageInfo,
  resourceType,
  uploadError,
  onClose,
  onLoadMore,
  onUpload,
}: WikiImageLibraryProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.imageLibrary;
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<WikiImageLibraryTab>("images");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState<WikiImageRequestForm>(emptyRequestForm);
  const canLoadMore = pageInfo ? pageInfo.current_page < pageInfo.last_page : false;
  const isBusy = isInitialLoading || isLoadingMore || isUploading;
  const errorMessage = localError ?? uploadError;
  const canSubmitRequest = hasCompleteRequestForm(selectedFile, requestForm) && !isBusy;

  if (!isOpen) {
    return null;
  }

  const selectFile = (file: File) => {
    setLocalError(null);
    setSuccessMessage(null);

    if (!isAcceptedWikiImageFile(file)) {
      setSelectedFile(null);
      setLocalError(t.invalidFormat);
      return;
    }

    setSelectedFile(file);
  };

  const uploadSelectedFile = async () => {
    if (!hasCompleteRequestForm(selectedFile, requestForm)) {
      setLocalError(t.requiredFields);
      return;
    }

    setLocalError(null);

    try {
      const base64Image = await readFileAsDataUrl(selectedFile);
      await onUpload({
        file: selectedFile,
        base64Image,
        sourceUrl: requestForm.sourceUrl.trim(),
        sourceName: requestForm.sourceName.trim(),
        altText: requestForm.altText.trim(),
      });
      setSelectedFile(null);
      setRequestForm(emptyRequestForm);
      setSuccessMessage(t.requestSubmitted);
    } catch (error) {
      setLocalError(
        error instanceof Error && error.message !== "file-read-failed"
          ? error.message
          : t.readFailed,
      );
    }
  };

  const selectFirstFile = (fileList: FileList | null) => {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    selectFile(file);
  };
  const closeLibrary = () => {
    setActiveTab("images");
    setLocalError(null);
    setIsDragActive(false);
    setSelectedFile(null);
    setSuccessMessage(null);
    setRequestForm(emptyRequestForm);
    onClose();
  };

  return (
    <section
      aria-label={t.label}
      className="fixed inset-0 z-50 grid place-items-stretch bg-black/55 p-4 sm:p-6"
      data-testid="wiki-image-library"
    >
      <div
        className="mx-auto flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[1.5rem] border border-stroke-subtle bg-surface-raised text-text-strong shadow-soft"
        style={cardSurfaceStyle}
      >
        <div className="flex items-start justify-between gap-4 p-5">
          <h2 className="text-2xl font-semibold">{t.title}</h2>
          <button
            className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30"
            onClick={closeLibrary}
            type="button"
          >
            {t.close}
          </button>
        </div>

        <div className="overflow-x-auto border-b border-stroke-subtle px-5">
          <div aria-label={t.tabsLabel} className="-mb-px flex gap-1" role="tablist">
            <button
              aria-controls="wiki-image-library-images-panel"
              aria-selected={activeTab === "images"}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === "images"
                  ? "border-brand-primary text-text-strong"
                  : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"
              }`}
              id="wiki-image-library-images-tab"
              onClick={() => setActiveTab("images")}
              role="tab"
              type="button"
            >
              {t.imagesTab}
            </button>
            <button
              aria-controls="wiki-image-library-request-panel"
              aria-selected={activeTab === "request"}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === "request"
                  ? "border-brand-primary text-text-strong"
                  : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"
              }`}
              id="wiki-image-library-request-tab"
              onClick={() => {
                setActiveTab("request");
                setLocalError(null);
              }}
              role="tab"
              type="button"
            >
              {t.requestTab}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {activeTab === "images" ? (
            <div
              aria-labelledby="wiki-image-library-images-tab"
              id="wiki-image-library-images-panel"
              role="tabpanel"
            >
              {loadError ? (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  {loadError}
                </div>
              ) : null}

              {isInitialLoading ? (
                <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-stroke-subtle text-sm font-semibold text-text-muted">
                  {t.loading}
                </div>
              ) : images.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map((image) => (
                    <article
                      className="overflow-hidden rounded-2xl border border-stroke-subtle bg-surface-base"
                      key={image.imageIdentifier}
                    >
                      <div className="relative aspect-[4/3] bg-black/10">
                        <Image
                          alt={image.altText || image.sourceName || image.imageIdentifier}
                          className="object-cover"
                          fill
                          sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 90vw"
                          src={image.url}
                        />
                      </div>
                      <div className="grid gap-2 p-4 text-sm">
                        <p className="truncate font-semibold">{image.altText || t.noAltText}</p>
                        <p className="truncate text-text-muted">{image.sourceName || t.noSource}</p>
                        <code className="truncate rounded-lg bg-surface-raised px-2 py-1 text-xs text-text-muted">
                          {image.imageIdentifier}
                        </code>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-stroke-subtle p-6 text-center">
                  <div>
                    <ImageIcon className="mx-auto h-6 w-6 text-text-muted" />
                    <p className="mt-3 font-semibold">{t.emptyTitle}</p>
                    <p className="mt-1 text-sm text-text-muted">{t.emptyMessage}</p>
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-center">
                {canLoadMore ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-stroke-subtle px-5 py-3 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isBusy}
                    onClick={onLoadMore}
                    type="button"
                  >
                    <ReloadIcon />
                    {isLoadingMore ? t.loadingMore : t.loadMore}
                  </button>
                ) : pageInfo && images.length > 0 ? (
                  <p className="text-sm font-semibold text-text-muted">{t.allLoaded}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div
              aria-labelledby="wiki-image-library-request-tab"
              className="grid gap-5"
              id="wiki-image-library-request-panel"
              role="tabpanel"
            >
              <div className="text-sm text-text-strong">
                <p>{t.requestDescriptionApproved}</p>
                <p className="mt-1">{t.requestDescriptionSharedLanguages}</p>
              </div>
              <div>
                <button
                  className={`grid w-full place-items-center rounded-2xl border border-dashed p-8 text-center transition ${
                    isDragActive
                      ? "border-brand-primary bg-brand-highlight/30"
                      : "border-stroke-subtle bg-surface-base hover:bg-brand-highlight/20"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={isBusy}
                  onClick={() => inputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragActive(false);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragActive(false);
                    selectFirstFile(event.dataTransfer.files);
                  }}
                  type="button"
                >
                  <UploadIcon className="h-6 w-6 text-text-muted" />
                  <span className="mt-3 font-semibold">
                    {isUploading ? t.requesting : t.chooseOrDrop}
                  </span>
                  <span className="mt-1 text-sm text-text-muted">{t.acceptedFormats}</span>
                </button>
                <input
                  ref={inputRef}
                  accept={wikiImageAcceptAttribute}
                  className="sr-only"
                  data-resource-type={resourceType}
                  data-testid="wiki-image-upload-input"
                  onChange={(event) => {
                    selectFirstFile(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
                {selectedFile ? (
                  <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-stroke-subtle bg-surface-base p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 truncate text-sm font-semibold">
                      {t.selectedFile(selectedFile.name)}
                    </p>
                    <button
                      className="w-fit rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isBusy}
                    onClick={() => setSelectedFile(null)}
                      type="button"
                    >
                      {t.removeSelectedFile}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-text-strong sm:col-span-2">
                  {t.sourceUrlLabel}
                  <input
                    className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2 font-normal"
                    name="sourceUrl"
                    onChange={(event) => {
                      const sourceUrl = event.currentTarget.value;

                      setSuccessMessage(null);
                      setRequestForm((form) => ({ ...form, sourceUrl }));
                    }}
                    required
                    type="url"
                    value={requestForm.sourceUrl}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-text-strong">
                  {t.sourceNameLabel}
                  <input
                    className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2 font-normal"
                    name="sourceName"
                    onChange={(event) => {
                      const sourceName = event.currentTarget.value;

                      setSuccessMessage(null);
                      setRequestForm((form) => ({ ...form, sourceName }));
                    }}
                    required
                    type="text"
                    value={requestForm.sourceName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-text-strong">
                  {t.altTextLabel}
                  <input
                    className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2 font-normal"
                    name="altText"
                    onChange={(event) => {
                      const altText = event.currentTarget.value;

                      setSuccessMessage(null);
                      setRequestForm((form) => ({ ...form, altText }));
                    }}
                    required
                    type="text"
                    value={requestForm.altText}
                  />
                </label>
                <label className="flex gap-3 text-sm font-semibold text-text-strong sm:col-span-2">
                  <input
                    checked={requestForm.rightsConfirmed}
                    className="mt-1 h-4 w-4 rounded border-stroke-subtle"
                    onChange={(event) => {
                      const rightsConfirmed = event.currentTarget.checked;

                      setSuccessMessage(null);
                      setRequestForm((form) => ({ ...form, rightsConfirmed }));
                    }}
                    type="checkbox"
                  />
                  <span>{t.rightsConfirmedLabel}</span>
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-muted">{t.requiredHint}</p>
                <button
                  className="rounded-full border border-brand-primary bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canSubmitRequest}
                  onClick={() => {
                    void uploadSelectedFile();
                  }}
                  type="button"
                >
                  {isUploading ? t.requesting : t.submitRequest}
                </button>
              </div>
              {errorMessage ? (
                <p className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  {errorMessage}
                </p>
              ) : null}
              {successMessage ? (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <p className="font-semibold">{successMessage}</p>
                  <a
                    className="mt-2 inline-flex font-semibold underline decoration-emerald-700/40 underline-offset-4"
                    href="#"
                    onClick={(event) => event.preventDefault()}
                  >
                    {t.approvalGuideLink}
                  </a>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export const createDefaultWikiImageUploadBody = createWikiImageUploadRequest;
export const wikiImageLibraryPerPage = defaultWikiImagePerPage;
