"use client";

import type { ReactNode } from "react";

export function WikiListPanel({
  allLoadedLabel,
  canLoadMore,
  children,
  emptyMessage,
  emptyTitle,
  isEmpty,
  isInitialLoading,
  isLoadingMore,
  loadError,
  loadingLabel,
  loadingMoreLabel,
  loadMoreLabel,
  reloadLabel,
  reviewError,
  totalLabel,
  onLoadMore,
  onReload,
}: {
  allLoadedLabel: string;
  canLoadMore: boolean;
  children: ReactNode;
  emptyMessage: string;
  emptyTitle: string;
  isEmpty: boolean;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  loadingLabel: string;
  loadingMoreLabel: string;
  loadMoreLabel: string;
  reloadLabel: string;
  reviewError?: string | null;
  totalLabel?: string | null;
  onLoadMore: () => void;
  onReload: () => void;
}) {
  if (loadError) {
    return (
      <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <p role="alert" className="font-semibold">{loadError}</p>
        <button
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold transition hover:bg-red-100"
          onClick={onReload}
          type="button"
        >
          {reloadLabel}
        </button>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="mt-5 grid min-h-40 place-items-center rounded-lg border border-dashed border-stroke-subtle text-sm font-semibold text-text-muted">
        {loadingLabel}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-stroke-subtle p-6 text-center">
        <p className="font-semibold">{emptyTitle}</p>
        <p className="mt-2 text-sm text-text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {totalLabel ? (
        <p className="text-sm font-semibold text-text-muted">
          {totalLabel}
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
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
      <div className="flex justify-center">
        {canLoadMore ? (
          <button
            className="rounded-lg border border-stroke-subtle px-5 py-2.5 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isInitialLoading || isLoadingMore}
            onClick={onLoadMore}
            type="button"
          >
            {isLoadingMore ? loadingMoreLabel : loadMoreLabel}
          </button>
        ) : (
          <p className="text-sm font-semibold text-text-muted">{allLoadedLabel}</p>
        )}
      </div>
    </div>
  );
}
