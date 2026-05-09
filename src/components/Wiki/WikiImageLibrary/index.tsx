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
  wikiIdentifier: string;
  onClose: () => void;
  onLoadMore: () => void;
  onUpload: (file: File, base64Image: string) => Promise<void>;
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
  wikiIdentifier,
  onClose,
  onLoadMore,
  onUpload,
}: WikiImageLibraryProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.imageLibrary;
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const canLoadMore = pageInfo ? pageInfo.current_page < pageInfo.last_page : false;
  const isBusy = isInitialLoading || isLoadingMore || isUploading;
  const errorMessage = localError ?? uploadError;

  if (!isOpen) {
    return null;
  }

  const uploadFile = async (file: File) => {
    setLocalError(null);

    if (!isAcceptedWikiImageFile(file)) {
      setLocalError(t.invalidFormat);
      return;
    }

    try {
      const base64Image = await readFileAsDataUrl(file);
      await onUpload(file, base64Image);
    } catch (error) {
      setLocalError(
        error instanceof Error && error.message !== "file-read-failed"
          ? error.message
          : t.readFailed,
      );
    }
  };

  const uploadFirstFile = (fileList: FileList | null) => {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    void uploadFile(file);
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
        <div className="flex items-start justify-between gap-4 border-b border-stroke-subtle p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {t.eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">{t.title}</h2>
            <p className="mt-2 text-sm text-text-muted">
              {pageInfo ? t.total(pageInfo.total) : t.summary}
            </p>
          </div>
          <button
            className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30"
            onClick={onClose}
            type="button"
          >
            {t.close}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
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
                <p className="mt-1 text-sm text-text-muted">
                  {t.emptyMessage}
                </p>
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

          <div className="mt-6 border-t border-stroke-subtle pt-5">
            <h3 className="text-lg font-semibold">{t.uploadTitle}</h3>
            <button
              className={`mt-3 grid w-full place-items-center rounded-2xl border border-dashed p-8 text-center transition ${
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
                uploadFirstFile(event.dataTransfer.files);
              }}
              type="button"
            >
              <UploadIcon className="h-6 w-6 text-text-muted" />
              <span className="mt-3 font-semibold">
                {isUploading ? t.uploading : t.chooseOrDrop}
              </span>
              <span className="mt-1 text-sm text-text-muted">{t.acceptedFormats}</span>
            </button>
            <input
              ref={inputRef}
              accept={wikiImageAcceptAttribute}
              className="sr-only"
              data-resource-type={resourceType}
              data-wiki-identifier={wikiIdentifier}
              data-testid="wiki-image-upload-input"
              onChange={(event) => {
                uploadFirstFile(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
              type="file"
            />
            {errorMessage ? (
              <p className="mt-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export const createDefaultWikiImageUploadBody = createWikiImageUploadRequest;
export const wikiImageLibraryPerPage = defaultWikiImagePerPage;
