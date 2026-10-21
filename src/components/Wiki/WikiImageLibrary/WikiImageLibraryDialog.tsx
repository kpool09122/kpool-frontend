import { type KeyboardEvent, type Ref, type RefObject } from "react";

import { cardSurfaceStyle } from "../styles";
import { getFocusableElements } from "./focus";
import { WikiImageListPanel } from "./WikiImageListPanel";
import { WikiMaterialSearchPanel } from "./WikiMaterialSearchPanel";
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
  closeButtonRefCallback,
  dialogRef,
  imageProps,
  materialSearch,
  isBusy,
  requestController,
  t,
  onClose,
  onTabChange,
}: {
  activeTab: WikiImageLibraryTab;
  materialSearch?: WikiImageLibraryProps["materialSearch"];
  canLoadMore: boolean;
  closeButtonRefCallback: Ref<HTMLButtonElement>;
  dialogRef: RefObject<HTMLDivElement | null>;
  imageProps: Omit<WikiImageLibraryProps, "isOpen" | "onClose" | "onUpload">;
  isBusy: boolean;
  requestController: WikiImageRequestFormController;
  t: WikiImageLibraryDictionary;
  onClose: () => void;
  onTabChange: (tab: WikiImageLibraryTab) => void;
}) {
  const tabs: WikiImageLibraryTab[] = materialSearch ? ["images", "request", "search"] : ["images", "request"];
  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = tabs.indexOf(activeTab);
    const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onTabChange(tabs[index]);
    dialogRef.current?.querySelector<HTMLButtonElement>(`#wiki-image-library-${tabs[index]}-tab`)?.focus();
  };
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
            ref={closeButtonRefCallback}
            type="button"
          >
            {t.close}
          </button>
        </div>

        <div className="overflow-x-auto border-b border-stroke-subtle px-5">
          <div aria-label={t.tabsLabel} className="-mb-px flex gap-1" role="tablist" onKeyDown={handleTabKeyDown}>
            {tabs.map((tab) => <button
              key={tab}
              aria-controls={`wiki-image-library-${tab}-panel`}
              aria-selected={activeTab === tab}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === tab ? "border-brand-primary text-text-strong" : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"}`}
              id={`wiki-image-library-${tab}-tab`}
              onClick={() => onTabChange(tab)}
              role="tab"
              tabIndex={activeTab === tab ? 0 : -1}
              type="button"
            >{tab === "images" ? t.imagesTab : tab === "request" ? t.requestTab : t.materialSearch.tab}</button>)}
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
          ) : activeTab === "search" && materialSearch ? (
            <WikiMaterialSearchPanel controller={materialSearch} t={t} onUseSource={(siteName, pageUrl) => {
              requestController.setRequestForm((state) => ({ ...state, sourceName: siteName, sourceUrl: pageUrl, rightsConfirmed: false }));
              onTabChange("request");
            }} />
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
