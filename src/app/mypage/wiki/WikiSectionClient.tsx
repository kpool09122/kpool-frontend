"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type {
  MyPageDraftImageAdapter,
  MyPageDraftWikiAdapter,
  MyPagePrincipalAdapter,
} from "@/gateways/mypage/myPageAdapters";
import {
  autoCreateWiki,
  createAutoCreateWikiRequestBodyFromInitialFields,
  approveWikiDraft,
  createWiki,
  createWikiRequestBodyFromInitialFields,
  deleteWikiDraft,
  fetchManagedWikiDraftWikis,
  fetchMyWikiDraftWikis,
  fetchVersionInconsistentWikis,
  publishWikiDraft,
  rejectWikiDraft,
  translateWikiDraft,
  withdrawWikiDraft,
} from "@/gateways/wiki/draftWiki";
import {
  approveWikiDraftImage,
  approveWikiImageDeletionRequest,
  fetchWikiDraftImages,
  fetchWikiImageDeletionRequests,
  rejectWikiDraftImage,
  rejectWikiImageDeletionRequest,
} from "@/gateways/wiki/wikiImageBrowserApi";
import {
  canAutoCreateWikiDraftWikiResourceType,
  canPublishWikiDraftWikis,
  canReviewWikiDraftImages,
  canReviewWikiDraftWikis,
  canReviewWikiImageDeletionRequests,
  createWikiPrincipal,
  draftWikiAutoCreateResourceTypes,
  getCurrentWikiPrincipal,
  type WikiPrincipalState,
} from "@/gateways/wiki/wikiPrincipal";
import { buildWikiEditPath, normalizeWikiSlugForResourceType, type WikiResourceType } from "@kpool/wiki";
import type { Locale } from "../../../i18n/locales";
import {
  initialDraftImageListState,
  type DraftImageListState,
  useMyPageDraftImageReview,
} from "../useMyPageDraftImageReview";
import {
  initialImageDeletionRequestListState,
  type ImageDeletionRequestListState,
  useMyPageImageDeletionRequestReview,
} from "../useMyPageImageDeletionRequestReview";
import {
  type MyPageWikiListItem,
  useMyPageDraftWikis,
} from "../useMyPageDraftWikis";
import { useMyPageWikiPrincipal } from "../useMyPageWikiPrincipal";
import { type MyPageWikiTab, myPageWikiTabRoutes } from "../myPageTypes";
import { useMypage } from "../MypageProvider";
import {
  CreateDraftWikiDialog,
  RejectDraftWikiDialog,
} from "./WikiContentClient";
import { WikiLayoutClient } from "./WikiLayoutClient";
import { WikiSectionProvider } from "./WikiSectionProvider";

type CreateDraftWikiMode = "manual" | "auto";

type CreateDraftWikiDialogState = {
  error: string | null;
  isCreating: boolean;
  isOpen: boolean;
};

type RejectDraftWikiDialogState = {
  isOpen: boolean;
  reason: string;
  wiki: MyPageWikiListItem | null;
};

const defaultPrincipalAdapter: MyPagePrincipalAdapter = {
  createPrincipal: createWikiPrincipal,
  getCurrentPrincipal: getCurrentWikiPrincipal,
};

const defaultDraftImageAdapter: MyPageDraftImageAdapter = {
  approveDraftImage: approveWikiDraftImage,
  approveImageDeletionRequest: approveWikiImageDeletionRequest,
  listDraftImages: fetchWikiDraftImages,
  listImageDeletionRequests: fetchWikiImageDeletionRequests,
  rejectDraftImage: rejectWikiDraftImage,
  rejectImageDeletionRequest: rejectWikiImageDeletionRequest,
};

const defaultDraftWikiAdapter: MyPageDraftWikiAdapter = {
  approveDraftWiki: approveWikiDraft,
  deleteDraftWiki: deleteWikiDraft,
  listManagedDraftWikis: fetchManagedWikiDraftWikis,
  listMyDraftWikis: fetchMyWikiDraftWikis,
  listUntranslatedWikis: fetchVersionInconsistentWikis,
  publishDraftWiki: publishWikiDraft,
  rejectDraftWiki: rejectWikiDraft,
  translateDraftWiki: translateWikiDraft,
  withdrawDraftWiki: withdrawWikiDraft,
};

const isActionPending = (state: WikiPrincipalState): boolean =>
  state.status === "loading";

type WikiSectionClientProps = {
  children: ReactNode;
  draftImageAdapter?: MyPageDraftImageAdapter;
  draftWikiAdapter?: MyPageDraftWikiAdapter;
  initialDraftImages?: DraftImageListState;
  initialImageDeletionRequests?: ImageDeletionRequestListState;
  principalAdapter?: MyPagePrincipalAdapter;
  returnTo?: string | null;
};

export function WikiSectionClient({
  children,
  draftImageAdapter = defaultDraftImageAdapter,
  draftWikiAdapter = defaultDraftWikiAdapter,
  initialDraftImages = initialDraftImageListState,
  initialImageDeletionRequests = initialImageDeletionRequestListState,
  principalAdapter = defaultPrincipalAdapter,
  returnTo = null,
}: WikiSectionClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    currentIdentity,
    initialDraftWikis,
    initialPrincipalState,
    locale,
    refreshIdentity,
    t,
  } = useMypage();
  const activeWikiTab = resolveActiveWikiTab(pathname);
  const loadedWikiTabRef = useRef<MyPageWikiTab | null>(
    activeWikiTab === "editingWikis" ? activeWikiTab : null,
  );
  const [createDialog, setCreateDialog] = useState<CreateDraftWikiDialogState>({
    error: null,
    isCreating: false,
    isOpen: false,
  });
  const [rejectDialog, setRejectDialog] = useState<RejectDraftWikiDialogState>({
    isOpen: false,
    reason: "",
    wiki: null,
  });
  const draftImageMessages = useMemo(() => ({
    draftImageApproveFailed: t.draftImageApproveFailed,
    draftImageListLoadFailed: t.draftImageListLoadFailed,
    draftImageRejectFailed: t.draftImageRejectFailed,
  }), [t.draftImageApproveFailed, t.draftImageListLoadFailed, t.draftImageRejectFailed]);
  const {
    draftImages,
    loadDraftImagesPage,
    reviewDraftImage,
    reviewError,
    reviewingImageIdentifier,
  } = useMyPageDraftImageReview({
    adapter: draftImageAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialDraftImages,
    messages: draftImageMessages,
  });
  const imageDeletionRequestMessages = useMemo(() => ({
    imageDeletionRequestApproveFailed: t.imageDeletionRequestApproveFailed,
    imageDeletionRequestListLoadFailed: t.imageDeletionRequestListLoadFailed,
    imageDeletionRequestRejectFailed: t.imageDeletionRequestRejectFailed,
  }), [
    t.imageDeletionRequestApproveFailed,
    t.imageDeletionRequestListLoadFailed,
    t.imageDeletionRequestRejectFailed,
  ]);
  const {
    imageDeletionRequests,
    loadImageDeletionRequestsPage,
    reviewError: imageDeletionRequestReviewError,
    reviewImageDeletionRequest,
    reviewingImageIdentifier: reviewingImageDeletionRequestIdentifier,
  } = useMyPageImageDeletionRequestReview({
    adapter: draftImageAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialImageDeletionRequests,
    messages: imageDeletionRequestMessages,
  });
  const draftWikiMessages = useMemo(() => ({
    draftWikiApproveFailed: t.draftWikiApproveFailed,
    draftWikiDeleteFailed: t.draftWikiDeleteFailed,
    draftWikiListLoadFailed: t.draftWikiListLoadFailed,
    draftWikiPublishFailed: t.draftWikiPublishFailed,
    draftWikiRejectFailed: t.draftWikiRejectFailed,
    draftWikiTranslateFailed: t.draftWikiTranslateFailed,
    draftWikiWithdrawFailed: t.draftWikiWithdrawFailed,
  }), [
    t.draftWikiApproveFailed,
    t.draftWikiDeleteFailed,
    t.draftWikiListLoadFailed,
    t.draftWikiPublishFailed,
    t.draftWikiRejectFailed,
    t.draftWikiTranslateFailed,
    t.draftWikiWithdrawFailed,
  ]);
  const {
    deleteDraftWiki: deleteDraftWikiFromMyPage,
    deletingWikiIdentifier,
    draftWikis,
    loadDraftWikisPage,
    reviewDraftWiki,
    reviewError: draftWikiReviewError,
    reviewingWikiIdentifier,
    withdrawDraftWiki: withdrawDraftWikiFromMyPage,
  } = useMyPageDraftWikis({
    adapter: draftWikiAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialDraftWikis,
    messages: draftWikiMessages,
  });
  const loadFirstDraftWikiPage = useCallback(
    () => loadDraftWikisPage("editingWikis", 1),
    [loadDraftWikisPage],
  );
  const handlePrincipalReady = useCallback(() => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }

    return loadFirstDraftWikiPage();
  }, [loadFirstDraftWikiPage, returnTo, router]);
  const principalMessages = useMemo(() => ({
    accountUnavailableMessage: t.accountUnavailableMessage,
    identityUnavailableMessage: t.identityUnavailableMessage,
  }), [t.accountUnavailableMessage, t.identityUnavailableMessage]);
  const {
    activateWikiPrincipal,
    loadCurrentPrincipal,
    principalState,
  } = useMyPageWikiPrincipal({
    adapter: principalAdapter,
    initialIdentity: currentIdentity,
    initialPrincipalState,
    messages: principalMessages,
    onPrincipalReady: handlePrincipalReady,
    refreshIdentity,
  });
  const autoCreatableResourceTypes = useMemo(
    () =>
      principalState.status === "available"
        ? draftWikiAutoCreateResourceTypes.filter((resourceType) =>
            canAutoCreateWikiDraftWikiResourceType(principalState.principal, resourceType),
          )
        : [],
    [principalState],
  );
  const openCreateDialog = () => {
    setCreateDialog({
      error: null,
      isCreating: false,
      isOpen: true,
    });
  };
  const closeCreateDialog = () => {
    setCreateDialog((state) => state.isCreating
      ? state
      : {
          ...state,
          error: null,
          isOpen: false,
        });
  };
  const openRejectDialog = (wiki: MyPageWikiListItem) => {
    setRejectDialog({
      isOpen: true,
      reason: "",
      wiki,
    });
  };
  const closeRejectDialog = () => {
    if (reviewingWikiIdentifier) {
      return;
    }

    setRejectDialog({
      isOpen: false,
      reason: "",
      wiki: null,
    });
  };
  const submitRejectDialog = (reason: string) => {
    const wiki = rejectDialog.wiki;

    if (!wiki) {
      return;
    }

    void reviewDraftWiki(wiki, "reject", reason);
    setRejectDialog({
      isOpen: false,
      reason: "",
      wiki: null,
    });
  };

  useEffect(() => {
    if (principalState.status !== "available") {
      return;
    }

    const canReviewDraftImages = canReviewWikiDraftImages(principalState.principal);
    const canReviewImageDeletionRequests = canReviewWikiImageDeletionRequests(principalState.principal);
    const canReviewDraftWikis = canReviewWikiDraftWikis(principalState.principal);
    const canPublishDraftWikis = canPublishWikiDraftWikis(principalState.principal);
    const isAllowed =
      activeWikiTab === "editingWikis" ||
      activeWikiTab === "submittedWikis" ||
      (activeWikiTab === "unapprovedWikis" && canReviewDraftWikis) ||
      ((activeWikiTab === "approvedWikis" || activeWikiTab === "untranslatedWikis") && canPublishDraftWikis) ||
      (activeWikiTab === "draftImages" && canReviewDraftImages) ||
      (activeWikiTab === "imageDeletionRequests" && canReviewImageDeletionRequests);

    if (!isAllowed) {
      router.replace(myPageWikiTabRoutes.editingWikis);
    }
  }, [activeWikiTab, principalState, router]);

  useEffect(() => {
    if (principalState.status !== "available") {
      return;
    }

    if (loadedWikiTabRef.current === activeWikiTab) {
      return;
    }

    loadedWikiTabRef.current = activeWikiTab;

    if (activeWikiTab === "draftImages") {
      loadDraftImagesPage(1);
      return;
    }

    if (activeWikiTab === "imageDeletionRequests") {
      loadImageDeletionRequestsPage(1);
      return;
    }

    loadDraftWikisPage(activeWikiTab, 1);
  }, [
    activeWikiTab,
    loadDraftImagesPage,
    loadDraftWikisPage,
    loadImageDeletionRequestsPage,
    principalState.status,
  ]);

  const submitCreateDialog = (input: {
    agencyIdentifier: string | null;
    groupIdentifiers: string[];
    language: Locale;
    mode: CreateDraftWikiMode;
    name: string;
    resourceType: WikiResourceType;
    slug: string;
    talentIdentifiers: string[];
  }) => {
    const slug = normalizeWikiSlugForResourceType(input.slug, input.resourceType);

    setCreateDialog((state) => ({
      ...state,
      error: null,
      isCreating: true,
    }));

    const request = input.mode === "auto"
      ? autoCreateWiki({
          fallbackErrorMessage: t.createWikiFailed,
          requestBody: createAutoCreateWikiRequestBodyFromInitialFields({
            agencyIdentifier: input.agencyIdentifier,
            groupIdentifiers: input.groupIdentifiers,
            language: input.language,
            name: input.name,
            resourceType: input.resourceType,
            slug,
            talentIdentifiers: input.talentIdentifiers,
          }),
        })
      : createWiki({
          fallbackErrorMessage: t.createWikiFailed,
          requestBody: createWikiRequestBodyFromInitialFields({
            language: input.language,
            name: input.name,
            resourceType: input.resourceType,
            slug,
          }),
        });

    void request.then(() => {
      router.push(buildWikiEditPath(input.language, slug));
    }).catch((error: unknown) => {
      setCreateDialog({
        error: error instanceof Error ? error.message : t.createWikiFailed,
        isCreating: false,
        isOpen: true,
      });
    });
  };

  return (
    <>
      <WikiLayoutClient
        isAuthenticated={currentIdentity !== null}
        isPending={isActionPending(principalState)}
        selectedWikiTab={activeWikiTab}
        state={principalState}
        t={t}
        onActivate={() => void activateWikiPrincipal()}
        onRetry={() => void loadCurrentPrincipal()}
        onOpenCreateDraftWiki={openCreateDialog}
      >
        {(resolvedWikiTab) => (
          <WikiSectionProvider
            value={{
              activeWikiTab: resolvedWikiTab,
              deletingWikiIdentifier,
              draftImages,
              draftWikiReviewError,
              draftWikis,
              imageDeletionRequestReviewError,
              imageDeletionRequests,
              reviewError,
              reviewingImageDeletionRequestIdentifier,
              reviewingImageIdentifier,
              reviewingWikiIdentifier,
              onDeleteDraftWiki: (wiki) => {
                if (window.confirm(t.deleteDraftWikiConfirm)) {
                  void deleteDraftWikiFromMyPage(wiki);
                }
              },
              onLoadDraftImagesPage: (page) => void loadDraftImagesPage(page),
              onLoadDraftWikisPage: (tab, page) => void loadDraftWikisPage(tab, page),
              onLoadImageDeletionRequestsPage: (page) => void loadImageDeletionRequestsPage(page),
              onReviewDraftImage: (imageIdentifier, action) =>
                void reviewDraftImage(imageIdentifier, action),
              onReviewDraftWiki: (wiki, action) => {
                if (action === "reject") {
                  openRejectDialog(wiki);
                  return;
                }

                void reviewDraftWiki(wiki, action);
              },
              onReviewImageDeletionRequest: (imageIdentifier, action, rejectReason) =>
                void reviewImageDeletionRequest(imageIdentifier, action, rejectReason),
              onWithdrawDraftWiki: (wiki) => void withdrawDraftWikiFromMyPage(wiki),
            }}
          >
            {children}
          </WikiSectionProvider>
        )}
      </WikiLayoutClient>
      <CreateDraftWikiDialog
        autoCreatableResourceTypes={autoCreatableResourceTypes}
        error={createDialog.error}
        isCreating={createDialog.isCreating}
        isOpen={createDialog.isOpen}
        locale={locale}
        t={t}
        onClose={closeCreateDialog}
        onSubmit={submitCreateDialog}
      />
      <RejectDraftWikiDialog
        isOpen={rejectDialog.isOpen}
        isSubmitting={Boolean(reviewingWikiIdentifier)}
        t={t}
        onClose={closeRejectDialog}
        onSubmit={submitRejectDialog}
      />
    </>
  );
}

const resolveActiveWikiTab = (pathname: string | null): MyPageWikiTab => {
  if (pathname?.endsWith("/submitted")) {
    return "submittedWikis";
  }

  if (pathname?.endsWith("/approved")) {
    return "approvedWikis";
  }

  if (pathname?.endsWith("/unapproved")) {
    return "unapprovedWikis";
  }

  if (pathname?.endsWith("/untranslated")) {
    return "untranslatedWikis";
  }

  if (pathname?.endsWith("/draft-images")) {
    return "draftImages";
  }

  if (pathname?.endsWith("/image-deletion-requests")) {
    return "imageDeletionRequests";
  }

  return "editingWikis";
};
