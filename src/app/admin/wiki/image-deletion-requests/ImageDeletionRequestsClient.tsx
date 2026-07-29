"use client";

import { useState } from "react";
import Image from "next/image";

import {
  isSafeWikiSourceUrl,
  toSafeWikiImageUrl,
  type WikiImageDeletionRequestListItem,
} from "@kpool/wiki";
import type { useI18n } from "../../../../i18n/I18nProvider";
import type { Locale } from "../../../../i18n/locales";
import { useAdmin } from "../../AdminProvider";
import type { ImageDeletionRequestListState } from "../../useAdminImageDeletionRequestReview";
import { formatDraftDate } from "../WikiContentClient";
import { useWikiSection } from "../WikiSectionProvider";
import { useImageDeletionRequests } from "./useImageDeletionRequests";

export function ImageDeletionRequestsClient() {
  const { currentIdentity, initialImageDeletionRequests, locale, t } = useAdmin();
  const { draftImageAdapter } = useWikiSection();
  const {
    imageDeletionRequests,
    loadImageDeletionRequestsPage,
    reviewError,
    reviewImageDeletionRequest,
    reviewingImageIdentifier: reviewingImageDeletionRequestIdentifier,
  } = useImageDeletionRequests({
    adapter: draftImageAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialImageDeletionRequests,
    messages: {
      imageDeletionRequestApproveFailed: t.imageDeletionRequestApproveFailed,
      imageDeletionRequestListLoadFailed: t.imageDeletionRequestListLoadFailed,
      imageDeletionRequestRejectFailed: t.imageDeletionRequestRejectFailed,
    },
  });

  return (
    <ImageDeletionRequestListPanel
      locale={locale}
      reviewError={reviewError}
      reviewingImageIdentifier={reviewingImageDeletionRequestIdentifier}
      state={imageDeletionRequests}
      t={t}
      onLoadMore={() => {
        if (imageDeletionRequests.pageInfo) {
          loadImageDeletionRequestsPage(imageDeletionRequests.pageInfo.current_page + 1);
        }
      }}
      onReload={() => loadImageDeletionRequestsPage(1)}
      onReviewImageDeletionRequest={reviewImageDeletionRequest}
    />
  );
}

function ImageDeletionRequestListPanel({
  locale,
  reviewError,
  reviewingImageIdentifier,
  state,
  t,
  onLoadMore,
  onReload,
  onReviewImageDeletionRequest,
}: {
  locale: Locale;
  reviewError: string | null;
  reviewingImageIdentifier: string | null;
  state: ImageDeletionRequestListState;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
  onLoadMore: () => void;
  onReload: () => void;
  onReviewImageDeletionRequest: (imageIdentifier: string, action: "approve" | "reject", rejectReason?: string) => void;
}) {
  const canLoadMore = state.pageInfo
    ? state.pageInfo.current_page < state.pageInfo.last_page
    : false;
  const isBusy = state.isInitialLoading || state.isLoadingMore;

  if (state.loadError) {
    return (
      <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <p role="alert" className="font-semibold">{state.loadError}</p>
        <button
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold transition hover:bg-red-100"
          onClick={onReload}
          type="button"
        >
          {t.reloadImageDeletionRequests}
        </button>
      </div>
    );
  }

  if (state.isInitialLoading) {
    return (
      <div className="mt-5 grid min-h-40 place-items-center rounded-lg border border-dashed border-stroke-subtle text-sm font-semibold text-text-muted">
        {t.imageDeletionRequestListLoading}
      </div>
    );
  }

  if (state.images.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-stroke-subtle p-6 text-center">
        <p className="font-semibold">{t.imageDeletionRequestListEmptyTitle}</p>
        <p className="mt-2 text-sm text-text-muted">{t.imageDeletionRequestListEmptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {state.pageInfo ? (
        <p className="text-sm font-semibold text-text-muted">
          {t.imageDeletionRequestListTotal(state.pageInfo.total)}
        </p>
      ) : null}
      {reviewError ? (
        <p
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          {reviewError}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {state.images.map((image) => (
          <ImageDeletionRequestCard
            image={image}
            isReviewing={reviewingImageIdentifier === image.imageIdentifier}
            key={image.imageIdentifier}
            locale={locale}
            t={t}
            onReviewImageDeletionRequest={onReviewImageDeletionRequest}
          />
        ))}
      </div>
      <div className="flex justify-center">
        {canLoadMore ? (
          <button
            className="rounded-lg border border-stroke-subtle px-5 py-2.5 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onLoadMore}
            type="button"
          >
            {state.isLoadingMore ? t.imageDeletionRequestListLoadingMore : t.loadMoreImageDeletionRequests}
          </button>
        ) : (
          <p className="text-sm font-semibold text-text-muted">{t.allImageDeletionRequestsLoaded}</p>
        )}
      </div>
    </div>
  );
}

function ImageDeletionRequestCard({
  image,
  isReviewing,
  locale,
  t,
  onReviewImageDeletionRequest,
}: {
  image: WikiImageDeletionRequestListItem;
  isReviewing: boolean;
  locale: Locale;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
  onReviewImageDeletionRequest: (imageIdentifier: string, action: "approve" | "reject", rejectReason?: string) => void;
}) {
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const trimmedRejectReason = rejectReason.trim();
  const safeImageUrl = toSafeWikiImageUrl(image.url);
  const closeDialog = () => {
    if (isReviewing) {
      return;
    }

    setIsRejectDialogOpen(false);
    setRejectReason("");
  };
  const submitDialog = () => {
    if (!trimmedRejectReason) {
      return;
    }

    onReviewImageDeletionRequest(image.imageIdentifier, "reject", trimmedRejectReason);
    setIsRejectDialogOpen(false);
    setRejectReason("");
  };

  return (
    <article className="overflow-hidden rounded-lg border border-stroke-subtle bg-surface-base">
      <div className="relative aspect-[4/3] bg-black/10">
        {safeImageUrl ? (
          <Image
            alt={image.altText || image.sourceName || image.imageIdentifier}
            className="object-cover"
            fill
            sizes="(min-width: 768px) 40vw, 90vw"
            src={safeImageUrl}
            unoptimized
          />
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-sm font-semibold text-text-muted">
            {t.imageDeletionRequestImageUnavailable}
          </div>
        )}
      </div>
      <div className="grid gap-4 p-4 text-sm">
        <dl className="grid gap-3">
          <ImageDeletionRequestMeta
            label={t.draftImageSourceNameLabel}
            sourceName={image.sourceName}
            sourceUrl={image.sourceUrl}
          />
          <ImageDeletionRequestMeta label={t.draftImageAltTextLabel} value={image.altText || t.draftImageNoAltText} />
          <ImageDeletionRequestMeta
            label={t.draftImageUploadedAtLabel}
            value={formatDraftDate(image.uploadedAt, locale)}
          />
          <ImageDeletionRequestMeta
            label={t.imageDeletionRequestRequesterNameLabel}
            value={image.name}
          />
          <ImageDeletionRequestMeta
            label={t.imageDeletionRequestRequesterEmailLabel}
            value={image.email}
          />
          <ImageDeletionRequestMeta
            label={t.imageDeletionRequestReasonLabel}
            value={image.reason}
          />
        </dl>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onReviewImageDeletionRequest(image.imageIdentifier, "approve")}
            type="button"
          >
            {isReviewing ? t.imageDeletionRequestReviewing : t.approveImageDeletionRequest}
          </button>
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => setIsRejectDialogOpen(true)}
            type="button"
          >
            {isReviewing ? t.imageDeletionRequestReviewing : t.rejectImageDeletionRequest}
          </button>
        </div>
      </div>
      {isRejectDialogOpen ? (
        <div
          aria-modal="true"
          aria-labelledby="image-deletion-review-dialog-title"
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-2xl border border-stroke-subtle bg-surface-raised p-5 shadow-soft">
            <h2 className="text-xl font-semibold" id="image-deletion-review-dialog-title">
              {t.rejectImageDeletionRequestDialogTitle}
            </h2>
            <label className="mt-4 grid gap-2 text-sm font-semibold">
              {t.imageDeletionRequestRejectReasonLabel}
              <textarea
                className="min-h-28 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
                disabled={isReviewing}
                onChange={(event) => setRejectReason(event.currentTarget.value)}
                value={rejectReason}
              />
            </label>
            {!trimmedRejectReason ? (
              <p className="mt-2 text-sm font-semibold text-text-muted">
                {t.imageDeletionRequestRejectReasonRequired}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isReviewing}
                onClick={closeDialog}
                type="button"
              >
                {t.cancelImageDeletionRequestReview}
              </button>
              <button
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isReviewing || !trimmedRejectReason}
                onClick={submitDialog}
                type="button"
              >
                {isReviewing ? t.imageDeletionRequestReviewing : t.submitImageDeletionRequestReview}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ImageDeletionRequestMeta({
  label,
  sourceName,
  sourceUrl,
  value,
}: {
  label: string;
  sourceName?: string;
  sourceUrl?: string;
  value?: string;
}) {
  const safeSourceUrl = sourceUrl && isSafeWikiSourceUrl(sourceUrl) ? sourceUrl : null;

  return (
    <div className="min-w-0">
      <dt className="font-semibold text-text-muted">{label}</dt>
      <dd className="mt-1 break-all text-text-strong">
        {safeSourceUrl ? (
          <a
            className="text-brand-primary underline underline-offset-4"
            href={safeSourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            {sourceName}
          </a>
        ) : (
          value ?? sourceName
        )}
      </dd>
    </div>
  );
}
