"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import {
  createWikiImageHideRequest,
  defaultWikiImagePerPage,
  type WikiDetail,
  type WikiUploadedImage,
} from "@kpool/wiki";
import { fetchWikiImages, requestWikiImageHide } from "@/gateways/wiki/wikiImageBrowserApi";
import { useI18n } from "../../i18n/I18nProvider";
import { getFocusableElements } from "./WikiImageLibrary/focus";
import { cardSurfaceStyle } from "./styles";

type WikiImageHideRequestDialogProps = {
  heroImage: WikiDetail["heroImage"];
  translationSetIdentifier: string;
  onClose: () => void;
};

type SubmitStatus = "idle" | "submitting" | "success" | "error";
type RequestStep = "selectImage" | "requestForm";

const findInitialSelectedImage = (
  images: WikiUploadedImage[],
  imageIdentifier: string,
): WikiUploadedImage | null =>
  images.find((image) => image.imageIdentifier === imageIdentifier) ?? null;

export function WikiImageHideRequestDialog({
  heroImage,
  onClose,
  translationSetIdentifier,
}: WikiImageHideRequestDialogProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.imageHideRequest;
  const [images, setImages] = useState<WikiUploadedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<WikiUploadedImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [canLoadMore, setCanLoadMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [reason, setReason] = useState("");
  const [requestStep, setRequestStep] = useState<RequestStep>("selectImage");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    fetchWikiImages({
      fallbackErrorMessage: t.listLoadFailed,
      page: 1,
      perPage: defaultWikiImagePerPage,
      translationSetIdentifier,
    })
      .then((response) => {
        setImages(response.images);
        setCurrentPage(response.current_page);
        setCanLoadMore(response.current_page < response.last_page);
        setSelectedImage(findInitialSelectedImage(response.images, heroImage.imageIdentifier ?? ""));
      })
      .catch(() => {
        setImages([]);
        setCanLoadMore(false);
        setSelectedImage(null);
        setLoadError(t.listLoadFailed);
      })
      .finally(() => setIsLoading(false));
  }, [heroImage.imageIdentifier, t.listLoadFailed, translationSetIdentifier]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const canSubmit =
    selectedImage !== null &&
    requesterName.trim() !== "" &&
    requesterEmail.trim() !== "" &&
    reason.trim() !== "" &&
    submitStatus !== "submitting";

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusableElements = getFocusableElements(dialogRef.current);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (!firstElement || !lastElement) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const handleLoadMore = () => {
    if (!canLoadMore || isLoadingMore) {
      return;
    }

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    setLoadError(null);

    fetchWikiImages({
      fallbackErrorMessage: t.listLoadFailed,
      page: nextPage,
      perPage: defaultWikiImagePerPage,
      translationSetIdentifier,
    })
      .then((response) => {
        setImages((currentImages) => [...currentImages, ...response.images]);
        setCurrentPage(response.current_page);
        setCanLoadMore(response.current_page < response.last_page);
      })
      .catch(() => setLoadError(t.listLoadFailed))
      .finally(() => setIsLoadingMore(false));
  };

  const handleSelectImage = (image: WikiUploadedImage) => {
    setSelectedImage(image);
    setRequestStep("requestForm");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit || !selectedImage) {
      return;
    }

    setSubmitStatus("submitting");
    setSubmitError(null);

    requestWikiImageHide({
      fallbackErrorMessage: t.submitFailed,
      imageIdentifier: selectedImage.imageIdentifier,
      requestBody: createWikiImageHideRequest({
        reason,
        requesterEmail,
        requesterName,
      }),
    })
      .then(() => setSubmitStatus("success"))
      .catch((error: unknown) => {
        setSubmitStatus("error");
        setSubmitError(error instanceof Error ? error.message : t.submitFailed);
      });
  };

  return (
    <section
      aria-labelledby="wiki-image-hide-request-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-stretch bg-black/55 p-4 sm:p-6"
      data-testid="wiki-image-hide-request-dialog"
      onKeyDown={handleKeyDown}
      role="dialog"
    >
      <div
        className="mx-auto flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[1.5rem] border border-stroke-subtle bg-surface-raised text-text-strong shadow-soft"
        ref={dialogRef}
        style={cardSurfaceStyle}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stroke-subtle p-5">
          <div>
            <h2 className="text-2xl font-semibold" id="wiki-image-hide-request-title">
              {t.title}
            </h2>
          </div>
          <button
            className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            {t.close}
          </button>
        </div>

        <form className="min-h-0 flex-1 overflow-y-auto p-5" onSubmit={handleSubmit}>
          {requestStep === "selectImage" ? (
            <div>
              <p className="text-sm font-semibold text-text-muted">{t.selectImageTitle}</p>
              {loadError ? (
                <div className="mt-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  {loadError}
                </div>
              ) : null}
              {isLoading ? (
                <div className="mt-3 grid min-h-48 place-items-center rounded-2xl border border-dashed border-stroke-subtle text-sm font-semibold text-text-muted">
                  {t.loading}
                </div>
              ) : images.length > 0 ? (
                <>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {images.map((image) => {
                      const isSelected = selectedImage?.imageIdentifier === image.imageIdentifier;

                      return (
                        <button
                          aria-pressed={isSelected}
                          className={`overflow-hidden rounded-2xl border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                            isSelected
                              ? "border-brand-primary bg-brand-highlight/30"
                              : "border-stroke-subtle bg-surface-base hover:bg-brand-highlight/20"
                          }`}
                          key={image.imageIdentifier}
                          onClick={() => handleSelectImage(image)}
                          type="button"
                        >
                          <span className="relative block aspect-[4/3] bg-black/10">
                            <Image
                              alt={image.altText || image.sourceName || image.imageIdentifier}
                              className="object-cover"
                              fill
                              sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 90vw"
                              src={image.url}
                              unoptimized
                            />
                          </span>
                          <span className="grid gap-1 p-4 text-sm">
                            <span className="truncate font-semibold">
                              {t.imageAltText(image.altText || t.noAltText)}
                            </span>
                            {isSelected ? (
                              <span className="text-xs font-semibold text-brand-primary">
                                {t.selectedImage}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {canLoadMore ? (
                    <div className="mt-5 flex justify-center">
                      <button
                        className="rounded-full border border-stroke-subtle px-5 py-3 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isLoadingMore}
                        onClick={handleLoadMore}
                        type="button"
                      >
                        {isLoadingMore ? t.loadingMore : t.loadMore}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-3 grid min-h-48 place-items-center rounded-2xl border border-dashed border-stroke-subtle p-6 text-center text-sm text-text-muted">
                  {t.emptyMessage}
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-xl">
              {selectedImage ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm">
                    {t.selectedImageName(selectedImage.altText || selectedImage.imageIdentifier)}
                  </p>
                  <button
                    className="self-start rounded-full border border-stroke-subtle px-4 py-2 text-xs font-semibold transition hover:bg-brand-highlight/30"
                    onClick={() => setRequestStep("selectImage")}
                    type="button"
                  >
                    {t.changeSelectedImage}
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-text-muted">{t.selectRequired}</p>
              )}

              <label className="mt-4 grid gap-2 text-sm font-semibold">
                {t.requesterNameLabel}
                <input
                  className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2 font-normal"
                  onChange={(event) => setRequesterName(event.currentTarget.value)}
                  value={requesterName}
                />
              </label>
              <label className="mt-4 grid gap-2 text-sm font-semibold">
                {t.requesterEmailLabel}
                <input
                  className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2 font-normal"
                  onChange={(event) => setRequesterEmail(event.currentTarget.value)}
                  type="email"
                  value={requesterEmail}
                />
              </label>
              <label className="mt-4 grid gap-2 text-sm font-semibold">
                {t.reasonLabel}
                <textarea
                  className="min-h-32 rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2 font-normal"
                  onChange={(event) => setReason(event.currentTarget.value)}
                  value={reason}
                />
              </label>
              <p className="mt-2 text-xs text-text-muted">{t.requiredHint}</p>

              {submitStatus === "success" ? (
                <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                  {t.submitSucceeded}
                </div>
              ) : null}
              {submitError ? (
                <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
                  {submitError}
                </div>
              ) : null}

              <button
                className="mt-5 w-full rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSubmit}
                type="submit"
              >
                {submitStatus === "submitting" ? t.submitting : t.submit}
              </button>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
