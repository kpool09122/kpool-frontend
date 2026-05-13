import { type KeyboardEvent, type RefObject } from "react";

import { cardSurfaceStyle } from "../styles";
import { getFocusableElements } from "./focus";
import { WikiImageListPanel } from "./WikiImageListPanel";
import { WikiImageRequestForm } from "./WikiImageRequestForm";
import {
  type WikiImageLibraryDictionary,
  type WikiImageLibraryProps,
  type WikiImageLibraryTab,
  type WikiImageRequestFormController,
} from "./types";

export function WikiImageLibraryDialog({
  activeTab,
  canLoadMore,
  closeButtonRef,
  dialogRef,
  imageProps,
  isBusy,
  requestController,
  t,
  onClose,
  onTabChange,
}: {
  activeTab: WikiImageLibraryTab;
  canLoadMore: boolean;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  dialogRef: RefObject<HTMLDivElement | null>;
  imageProps: Omit<WikiImageLibraryProps, "isOpen" | "onClose" | "onUpload">;
  isBusy: boolean;
  requestController: WikiImageRequestFormController;
  t: WikiImageLibraryDictionary;
  onClose: () => void;
  onTabChange: (tab: WikiImageLibraryTab) => void;
}) {
  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

  return (
    <section
      aria-labelledby="wiki-image-library-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-stretch bg-black/55 p-4 sm:p-6"
      data-testid="wiki-image-library"
      onKeyDown={handleDialogKeyDown}
      role="dialog"
    >
      <div
        className="mx-auto flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[1.5rem] border border-stroke-subtle bg-surface-raised text-text-strong shadow-soft"
        ref={dialogRef}
        style={cardSurfaceStyle}
      >
        <div className="flex items-start justify-between gap-4 p-5">
          <h2 className="text-2xl font-semibold" id="wiki-image-library-title">
            {t.title}
          </h2>
          <button
            className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30"
            onClick={onClose}
            ref={closeButtonRef}
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
              onClick={() => onTabChange("images")}
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
              onClick={() => onTabChange("request")}
              role="tab"
              type="button"
            >
              {t.requestTab}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {activeTab === "images" ? (
            <WikiImageListPanel
              canLoadMore={canLoadMore}
              images={imageProps.images}
              isBusy={isBusy}
              isInitialLoading={imageProps.isInitialLoading}
              isLoadingMore={imageProps.isLoadingMore}
              loadError={imageProps.loadError}
              onLoadMore={imageProps.onLoadMore}
              onSelectImage={imageProps.onSelectImage}
              t={t}
            />
          ) : (
            <WikiImageRequestForm
              controller={requestController}
              isBusy={isBusy}
              isUploading={imageProps.isUploading}
              resourceType={imageProps.resourceType}
              t={t}
            />
          )}
        </div>
      </div>
    </section>
  );
}
