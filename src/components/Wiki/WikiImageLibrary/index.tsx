"use client";

import { useCallback, useRef, useState } from "react";

import { useI18n } from "../../../i18n/I18nProvider";
import { WikiImageLibraryDialog } from "./WikiImageLibraryDialog";
import { useWikiImageRequestForm } from "./useWikiImageRequestForm";
import {
  type WikiImageLibraryProps,
  type WikiImageLibraryTab,
  type WikiImageUsageRequestInput,
} from "./types";

export type { WikiImageUsageRequestInput };

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
  onSelectImage,
  onUpload,
}: WikiImageLibraryProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.imageLibrary;
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<WikiImageLibraryTab>("images");
  const isBusy = isInitialLoading || isLoadingMore || isUploading;
  const canLoadMore = pageInfo ? pageInfo.current_page < pageInfo.last_page : false;
  const requestController = useWikiImageRequestForm({
    isBusy,
    onUpload,
    t,
    uploadError,
  });

  const restoreDialogFocus = useCallback(() => {
    restoreFocusRef.current?.focus();
    restoreFocusRef.current = null;
  }, []);

  const setCloseButtonRef = useCallback(
    (button: HTMLButtonElement | null) => {
      if (!button) {
        restoreDialogFocus();
        return;
      }

      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      button.focus();
    },
    [restoreDialogFocus],
  );

  if (!isOpen) {
    return null;
  }

  const closeLibrary = () => {
    setActiveTab("images");
    requestController.clearRequest();
    onClose();
  };

  const changeTab = (tab: WikiImageLibraryTab) => {
    setActiveTab(tab);

    if (tab === "request") {
      requestController.setSuccessMessage(null);
    }
  };

  return (
    <WikiImageLibraryDialog
      activeTab={activeTab}
      canLoadMore={canLoadMore}
      closeButtonRefCallback={setCloseButtonRef}
      dialogRef={dialogRef}
      imageProps={{
        images,
        isInitialLoading,
        isLoadingMore,
        isUploading,
        loadError,
        onLoadMore,
        onSelectImage,
        pageInfo,
        resourceType,
        uploadError,
      }}
      isBusy={isBusy}
      onClose={closeLibrary}
      onTabChange={changeTab}
      requestController={requestController}
      t={t}
    />
  );
}
