"use client";

import type { IdentitySummary } from "@/gateways/identity/identityApi";
import { ChevronRightIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type CSSProperties, useCallback, useMemo, useState } from "react";

import { useAuthStore } from "@/gateways/auth/authStore";
import { ImageCropper, readFileAsDataUrl } from "../../components/ImageCropper";
import { WikiMasterSearchSelect } from "../../components/Wiki/WikiMasterSearchSelect";
import { useI18n } from "../../i18n/I18nProvider";
import { localeLabels, type Locale } from "../../i18n/locales";
import {
  canAutoCreateWikiDraftWikiResourceType,
  canPublishWikiDraftWikis,
  canReviewWikiDraftImages,
  canReviewWikiImageDeletionRequests,
  canReviewWikiDraftWikis,
  createWikiPrincipal,
  draftWikiAutoCreateResourceTypes,
  getCurrentWikiPrincipal,
  type WikiPrincipalState,
} from "@/gateways/wiki/wikiPrincipal";
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
  type WikiDraftWiki,
  type WikiDraftWorkflowAction,
} from "@/gateways/wiki/draftWiki";
import { buildWikiThemeCssVariables } from "../wiki/[slug]/wikiThemePalette";
import {
  approveWikiDraftImage,
  approveWikiImageDeletionRequest,
  fetchWikiDraftImages,
  fetchWikiImageDeletionRequests,
  rejectWikiDraftImage,
  rejectWikiImageDeletionRequest,
} from "@/gateways/wiki/wikiImageBrowserApi";
import {
  buildWikiEditPath,
  buildWikiPath,
  isAcceptedWikiImageFile,
  isSafeWikiSourceUrl,
  isWikiImageFileSizeAllowed,
  toSafeWikiImageUrl,
  normalizeWikiSlugForResourceType,
  type WikiDraftImage,
  type WikiImageDeletionRequestListItem,
  type WikiMasterSearchItem,
  type WikiResourceType,
  wikiImageAcceptAttribute,
  wikiResourceTypes,
} from "@kpool/wiki";
import {
  initialDraftImageListState,
  type DraftImageListState,
  useMyPageDraftImageReview,
} from "./useMyPageDraftImageReview";
import {
  initialImageDeletionRequestListState,
  type ImageDeletionRequestListState,
  useMyPageImageDeletionRequestReview,
} from "./useMyPageImageDeletionRequestReview";
import {
  initialDraftWikiListState,
  type DraftWikiListState,
  type MyPageDraftWikiActionTab,
  type MyPageWikiListItem,
  useMyPageDraftWikis,
} from "./useMyPageDraftWikis";
import { updateAuthenticatedIdentity } from "@/gateways/identity/updateIdentityBrowserApi";
import type {
  MyPageDraftImageAdapter,
  MyPageDraftWikiAdapter,
  MyPagePrincipalAdapter,
} from "@/gateways/mypage/myPageAdapters";
import { useMyPageWikiPrincipal } from "./useMyPageWikiPrincipal";

type MyPageSettingsTab = "profileSettings" | "languageSettings";
type MyPageSection = "wiki" | "settings";
type MyPageWikiTab = MyPageDraftWikiActionTab | "draftImages" | "imageDeletionRequests";
type CreateDraftWikiMode = "manual" | "auto";

type MyPageClientProps = {
  initialIdentity: IdentitySummary | null;
  initialDraftImages?: DraftImageListState;
  initialImageDeletionRequests?: ImageDeletionRequestListState;
  initialDraftWikis?: Record<MyPageDraftWikiActionTab, DraftWikiListState>;
  initialPrincipalState?: WikiPrincipalState;
  draftImageAdapter?: MyPageDraftImageAdapter;
  draftWikiAdapter?: MyPageDraftWikiAdapter;
  principalAdapter?: MyPagePrincipalAdapter;
  returnTo?: string | null;
};

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


type MyPageIdentitySettingsState = {
  error: string | null;
  imagePreview: string | null;
  imageReadError: string | null;
  imageCropState: { file: File; sourceDataUrl: string } | null;
  identityName: string;
  isSaving: boolean;
  language: Locale;
  profileImageMarkedForDeletion: boolean;
  profileImageBase64: string | null;
  syncError: string | null;
  success: string | null;
};

const createIdentitySettingsState = (identity: IdentitySummary | null, fallbackLanguage: Locale): MyPageIdentitySettingsState => ({
  error: null,
  imagePreview: identity?.profileImage ?? null,
  imageReadError: null,
  imageCropState: null,
  identityName: identity?.identityName ?? "",
  isSaving: false,
  language: isSupportedLocale(identity?.language) ? identity.language : fallbackLanguage,
  profileImageMarkedForDeletion: false,
  profileImageBase64: null,
  syncError: null,
  success: null,
});

const isSupportedLocale = (value: unknown): value is Locale =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(localeLabels, value);

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

const initialDraftWikiLists: Record<MyPageDraftWikiActionTab, DraftWikiListState> = {
  approvedWikis: initialDraftWikiListState,
  editingWikis: initialDraftWikiListState,
  submittedWikis: initialDraftWikiListState,
  unapprovedWikis: initialDraftWikiListState,
  untranslatedWikis: initialDraftWikiListState,
};

const selectedSectionClass = "bg-brand-highlight/70 text-text-strong";

const isActionPending = (state: WikiPrincipalState): boolean =>
  state.status === "loading";

const createWikiTab = (id: MyPageWikiTab, label: string): { id: MyPageWikiTab; label: string } => ({
  id,
  label,
});

const createSettingsTab = (
  id: MyPageSettingsTab,
  label: string,
): { id: MyPageSettingsTab; label: string } => ({
  id,
  label,
});

export function MyPageClient({
  draftImageAdapter = defaultDraftImageAdapter,
  draftWikiAdapter = defaultDraftWikiAdapter,
  initialDraftImages = initialDraftImageListState,
  initialImageDeletionRequests = initialImageDeletionRequestListState,
  initialDraftWikis = initialDraftWikiLists,
  initialIdentity,
  initialPrincipalState = { status: "idle" },
  principalAdapter = defaultPrincipalAdapter,
  returnTo = null,
}: MyPageClientProps) {
  const router = useRouter();
  const authIdentity = useAuthStore((state) => state.identity);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const setIdentity = useAuthStore((state) => state.setIdentity);
  const currentIdentity = authIdentity ?? initialIdentity;
  const { dictionary, locale } = useI18n();
  const t = dictionary.mypage;
  const [settingsState, setSettingsState] = useState<MyPageIdentitySettingsState>(() =>
    createIdentitySettingsState(currentIdentity, locale),
  );
  const [selectedSection, setSelectedSection] = useState<MyPageSection>("wiki");
  const [selectedWikiTab, setSelectedWikiTab] = useState<MyPageWikiTab>("editingWikis");
  const [selectedSettingsTab, setSelectedSettingsTab] = useState<MyPageSettingsTab>("profileSettings");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    refreshIdentity: () => refreshIdentity({ preserveOnNull: true }),
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

  const updateSettingsField = (field: "identityName" | "language", value: string) => {
    setSettingsState((state) => ({
      ...state,
      [field]: field === "language" && isSupportedLocale(value) ? value : value,
      error: null,
      imageReadError: null,
      success: null,
      syncError: null,
    }));
  };

  const updateProfileImage = (file: File | null) => {
    if (!file) {
      setSettingsState((state) => ({
        ...state,
        imageReadError: null,
        imageCropState: null,
        imagePreview: currentIdentity?.profileImage ?? null,
        profileImageMarkedForDeletion: false,
        profileImageBase64: null,
        success: null,
      }));
      return;
    }

    if (!isAcceptedWikiImageFile(file)) {
      setSettingsState((state) => ({
        ...state,
        imageCropState: null,
        imageReadError: t.profileImageInvalidFormat,
        success: null,
      }));
      return;
    }

    if (!isWikiImageFileSizeAllowed(file)) {
      setSettingsState((state) => ({
        ...state,
        imageCropState: null,
        imageReadError: t.profileImageTooLarge,
        success: null,
      }));
      return;
    }

    setSettingsState((state) => ({
      ...state,
      imageCropState: null,
      imageReadError: null,
      success: null,
    }));

    void readFileAsDataUrl(file).then((dataUrl) => {
      setSettingsState((state) => ({
        ...state,
        imageCropState: { file, sourceDataUrl: dataUrl },
        imageReadError: null,
        success: null,
      }));
    }).catch(() => {
      setSettingsState((state) => ({
        ...state,
        imageCropState: null,
        imageReadError: t.profileImageReadFailed,
        success: null,
      }));
    });
  };

  const confirmProfileImageCrop = (croppedDataUrl: string) => {
    setSettingsState((state) => ({
      ...state,
      imageCropState: null,
      imageReadError: null,
      imagePreview: croppedDataUrl,
      profileImageMarkedForDeletion: false,
      profileImageBase64: croppedDataUrl,
      success: null,
    }));
  };

  const cancelProfileImageCrop = () => {
    setSettingsState((state) => ({
      ...state,
      imageCropState: null,
      imageReadError: null,
      success: null,
    }));
  };

  const reportProfileImageCropError = (message: string) => {
    setSettingsState((state) => ({
      ...state,
      imageReadError: message,
      success: null,
    }));
  };

  const deleteProfileImage = () => {
    setSettingsState((state) => ({
      ...state,
      imageCropState: null,
      imagePreview: null,
      imageReadError: null,
      profileImageBase64: null,
      profileImageMarkedForDeletion: true,
      success: null,
    }));
  };

  const saveIdentitySettings = () => {
    const identityName = settingsState.identityName.trim();
    const shouldDeleteProfileImage = settingsState.profileImageMarkedForDeletion;

    if (!currentIdentity) {
      setSettingsState((state) => ({ ...state, error: t.identityUnavailableMessage, success: null }));
      return;
    }

    if (!identityName) {
      setSettingsState((state) => ({ ...state, error: t.profileIdentityNameRequired, success: null }));
      return;
    }

    if (settingsState.imageCropState) {
      setSettingsState((state) => ({
        ...state,
        imageReadError: t.profileImageCropRequired,
        success: null,
      }));
      return;
    }

    setSettingsState((state) => ({
      ...state,
      error: null,
      imageReadError: null,
      isSaving: true,
      success: null,
      syncError: null,
    }));

    void updateAuthenticatedIdentity({
      fallbackErrorMessage: t.identitySettingsSaveFailed,
      requestBody: {
        identityName,
        language: settingsState.language,
        ...(settingsState.profileImageBase64
          ? { base64EncodedImage: settingsState.profileImageBase64 }
          : settingsState.profileImageMarkedForDeletion
            ? { base64EncodedImage: null }
            : {}),
      },
    }).then((updatedIdentity) => {
      const effectiveIdentity = shouldDeleteProfileImage
        ? { ...updatedIdentity, profileImage: null }
        : updatedIdentity;

      setIdentity(effectiveIdentity);
      setSettingsState(createIdentitySettingsState(effectiveIdentity, settingsState.language));
      setSettingsState((state) => ({ ...state, success: t.identitySettingsSaved }));
    }).catch((error: unknown) => {
      setSettingsState((state) => ({
        ...state,
        error: error instanceof Error ? error.message : t.identitySettingsSaveFailed,
        isSaving: false,
        success: null,
      }));
    });
  };

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
    <main
      className={`min-h-[calc(100vh-73px)] bg-surface-base px-6 py-8 text-text-strong transition-[padding] duration-300 sm:px-10 lg:pr-16 ${
        isSidebarOpen ? "lg:pl-80" : "lg:pl-20"
      }`}
    >
      <aside
        aria-label={t.sidebarLabel}
        className={`fixed bottom-0 left-0 top-20 z-30 w-72 max-w-[calc(100vw-2rem)] transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          aria-label={isSidebarOpen ? t.collapseSidebar : t.expandSidebar}
          aria-expanded={isSidebarOpen}
          className="absolute -right-11 top-6 z-10 grid h-20 w-11 place-items-center rounded-r-2xl border-y border-r border-stroke-subtle bg-surface-raised text-text-strong shadow-soft transition hover:bg-brand-highlight/20"
          onClick={() => setIsSidebarOpen((current) => !current)}
        >
          <span className={`transition-transform ${isSidebarOpen ? "rotate-180" : ""}`}>
            <ChevronRightIcon />
          </span>
        </button>
        <div className="relative h-full overflow-y-auto border border-l-0 border-stroke-subtle bg-surface-raised p-4 shadow-soft">
          <div className={isSidebarOpen ? "block" : "pointer-events-none invisible"}>
            <nav className="grid gap-2">
              <button
                type="button"
                className={`rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                  selectedSection === "wiki"
                    ? selectedSectionClass
                    : "text-text-muted hover:bg-brand-highlight/30 hover:text-text-strong"
                }`}
                aria-current={selectedSection === "wiki" ? "page" : undefined}
                onClick={() => setSelectedSection("wiki")}
              >
                {t.wikiMenu}
              </button>
              <button
                type="button"
                className={`rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                  selectedSection === "settings"
                    ? selectedSectionClass
                    : "text-text-muted hover:bg-brand-highlight/30 hover:text-text-strong"
                }`}
                aria-current={selectedSection === "settings" ? "page" : undefined}
                onClick={() => setSelectedSection("settings")}
              >
                {t.settingsMenu}
              </button>
            </nav>
          </div>
        </div>
      </aside>

      <div className="mx-auto max-w-5xl">
        <section className="min-w-0 space-y-6">
          <header className="space-y-3">
            <h1 className="text-3xl font-bold">
              {selectedSection === "wiki" ? t.wikiHeaderTitle : t.settingsHeaderTitle}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-text-muted">
              {selectedSection === "wiki" ? t.wikiHeaderDescription : t.settingsHeaderDescription}
            </p>
          </header>

          {selectedSection === "wiki" ? (
            <>
              <WikiPrincipalPanel
                draftImages={draftImages}
                imageDeletionRequests={imageDeletionRequests}
                draftWikis={draftWikis}
                locale={locale}
                reviewError={reviewError}
                imageDeletionRequestReviewError={imageDeletionRequestReviewError}
                draftWikiReviewError={draftWikiReviewError}
                reviewingImageIdentifier={reviewingImageIdentifier}
                reviewingImageDeletionRequestIdentifier={reviewingImageDeletionRequestIdentifier}
                deletingWikiIdentifier={deletingWikiIdentifier}
                reviewingWikiIdentifier={reviewingWikiIdentifier}
                isAuthenticated={currentIdentity !== null}
                isPending={isActionPending(principalState)}
                selectedWikiTab={selectedWikiTab}
                state={principalState}
                t={t}
                onActivate={() => void activateWikiPrincipal()}
                onLoadDraftImagesPage={(page) => void loadDraftImagesPage(page)}
                onLoadImageDeletionRequestsPage={(page) => void loadImageDeletionRequestsPage(page)}
                onLoadDraftWikisPage={(tab, page) => void loadDraftWikisPage(tab, page)}
                onRetry={() => void loadCurrentPrincipal()}
                onReviewDraftImage={(imageIdentifier, action) =>
                  void reviewDraftImage(imageIdentifier, action)
                }
                onReviewImageDeletionRequest={(imageIdentifier, action, rejectReason) =>
                  void reviewImageDeletionRequest(imageIdentifier, action, rejectReason)
                }
                onDeleteDraftWiki={(wiki) => {
                  if (window.confirm(t.deleteDraftWikiConfirm)) {
                    void deleteDraftWikiFromMyPage(wiki);
                  }
                }}
                onReviewDraftWiki={(wiki, action) => {
                  if (action === "reject") {
                    openRejectDialog(wiki);
                    return;
                  }

                  void reviewDraftWiki(wiki, action);
                }}
                onSelectWikiTab={setSelectedWikiTab}
                onWithdrawDraftWiki={(wiki) => void withdrawDraftWikiFromMyPage(wiki)}
                onOpenCreateDraftWiki={openCreateDialog}
              />
              <CreateDraftWikiDialog
                error={createDialog.error}
                isCreating={createDialog.isCreating}
                isOpen={createDialog.isOpen}
                locale={locale}
                t={t}
                autoCreatableResourceTypes={autoCreatableResourceTypes}
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
          ) : (
            <SettingsSection
              currentIdentity={currentIdentity}
              selectedSettingsTab={selectedSettingsTab}
              settingsState={settingsState}
              t={t}
            onProfileImageChange={updateProfileImage}
            onProfileImageCropCancel={cancelProfileImageCrop}
            onProfileImageCropConfirm={confirmProfileImageCrop}
            onProfileImageCropError={reportProfileImageCropError}
            onProfileImageDelete={deleteProfileImage}
            onSaveIdentitySettings={saveIdentitySettings}
              onSelectSettingsTab={setSelectedSettingsTab}
              onUpdateSettingsField={updateSettingsField}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function WikiPrincipalPanel({
  draftImages,
  imageDeletionRequests,
  draftWikis,
  locale,
  reviewError,
  imageDeletionRequestReviewError,
  draftWikiReviewError,
  reviewingImageIdentifier,
  reviewingImageDeletionRequestIdentifier,
  deletingWikiIdentifier,
  reviewingWikiIdentifier,
  isAuthenticated,
  isPending,
  selectedWikiTab,
  state,
  t,
  onActivate,
  onLoadDraftImagesPage,
  onLoadImageDeletionRequestsPage,
  onLoadDraftWikisPage,
  onRetry,
  onReviewDraftImage,
  onReviewImageDeletionRequest,
  onDeleteDraftWiki,
  onReviewDraftWiki,
  onSelectWikiTab,
  onWithdrawDraftWiki,
  onOpenCreateDraftWiki,
}: {
  draftImages: DraftImageListState;
  imageDeletionRequests: ImageDeletionRequestListState;
  draftWikis: Record<MyPageDraftWikiActionTab, DraftWikiListState>;
  locale: Locale;
  reviewError: string | null;
  imageDeletionRequestReviewError: string | null;
  draftWikiReviewError: string | null;
  reviewingImageIdentifier: string | null;
  reviewingImageDeletionRequestIdentifier: string | null;
  deletingWikiIdentifier: string | null;
  reviewingWikiIdentifier: string | null;
  isAuthenticated: boolean;
  isPending: boolean;
  selectedWikiTab: MyPageWikiTab;
  state: WikiPrincipalState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onActivate: () => void;
  onLoadDraftImagesPage: (page: number) => void;
  onLoadImageDeletionRequestsPage: (page: number) => void;
  onLoadDraftWikisPage: (tab: MyPageDraftWikiActionTab, page: number) => void;
  onRetry: () => void;
  onReviewDraftImage: (imageIdentifier: string, action: "approve" | "reject") => void;
  onReviewImageDeletionRequest: (imageIdentifier: string, action: "approve" | "reject", rejectReason?: string) => void;
  onDeleteDraftWiki: (wiki: MyPageWikiListItem) => void;
  onReviewDraftWiki: (wiki: MyPageWikiListItem, action: WikiDraftWorkflowAction, reason?: string) => void;
  onSelectWikiTab: (tab: MyPageWikiTab) => void;
  onWithdrawDraftWiki: (wiki: MyPageWikiListItem) => void;
  onOpenCreateDraftWiki: () => void;
}) {
  const canActivate = isAuthenticated && !isPending;

  if (state.status === "loading") {
    return (
      <div className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
        <h2 className="text-xl font-semibold">{t.wikiLoadingTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">
          {t.wikiLoadingMessage}
        </p>
      </div>
    );
  }

  if (state.status === "available") {
    const canReviewDraftImages = canReviewWikiDraftImages(state.principal);
    const canReviewImageDeletionRequests = canReviewWikiImageDeletionRequests(state.principal);
    const canReviewDraftWikis = canReviewWikiDraftWikis(state.principal);
    const canPublishDraftWikis = canPublishWikiDraftWikis(state.principal);

    const tabs: Array<{ id: MyPageWikiTab; label: string }> = [
      createWikiTab("editingWikis", t.editingWikisTab),
      createWikiTab("submittedWikis", t.submittedWikisTab),
      ...(canReviewDraftWikis ? [createWikiTab("unapprovedWikis", t.unapprovedWikisTab)] : []),
      ...(canPublishDraftWikis ? [createWikiTab("approvedWikis", t.approvedWikisTab)] : []),
      ...(canPublishDraftWikis ? [createWikiTab("untranslatedWikis", t.untranslatedWikisTab)] : []),
      ...(canReviewDraftImages ? [createWikiTab("draftImages", t.draftImagesTab)] : []),
      ...(canReviewImageDeletionRequests ? [createWikiTab("imageDeletionRequests", t.imageDeletionRequestsTab)] : []),
    ];
    const activeWikiTab = tabs.some((tab) => tab.id === selectedWikiTab)
      ? selectedWikiTab
      : tabs[0].id;

    return (
      <section className="space-y-5">
        <div className="flex justify-end">
          <button
            className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
            onClick={onOpenCreateDraftWiki}
            type="button"
          >
            {t.createWiki}
          </button>
        </div>
        <div className="overflow-x-auto border-b border-stroke-subtle">
          <div aria-label={t.wikiTabsLabel} className="-mb-px flex gap-1" role="tablist">
            {tabs.map((tab) => (
              <button
                aria-selected={activeWikiTab === tab.id}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  activeWikiTab === tab.id
                    ? "border-brand-primary text-text-strong"
                    : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"
                }`}
                key={tab.id}
                onClick={() => {
                  onSelectWikiTab(tab.id);
                  if (tab.id === "draftImages") {
                    onLoadDraftImagesPage(1);
                  } else if (tab.id === "imageDeletionRequests") {
                    onLoadImageDeletionRequestsPage(1);
                  } else {
                    onLoadDraftWikisPage(tab.id, 1);
                  }
                }}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {activeWikiTab === "draftImages" ? (
          <DraftImageListPanel
            locale={locale}
            reviewError={reviewError}
            reviewingImageIdentifier={reviewingImageIdentifier}
            state={draftImages}
            t={t}
            onLoadMore={() => {
              if (draftImages.pageInfo) {
                onLoadDraftImagesPage(draftImages.pageInfo.current_page + 1);
              }
            }}
            onReload={() => onLoadDraftImagesPage(1)}
            onReviewDraftImage={onReviewDraftImage}
          />
        ) : null}
        {activeWikiTab === "imageDeletionRequests" ? (
          <ImageDeletionRequestListPanel
            locale={locale}
            reviewError={imageDeletionRequestReviewError}
            reviewingImageIdentifier={reviewingImageDeletionRequestIdentifier}
            state={imageDeletionRequests}
            t={t}
            onLoadMore={() => {
              if (imageDeletionRequests.pageInfo) {
                onLoadImageDeletionRequestsPage(imageDeletionRequests.pageInfo.current_page + 1);
              }
            }}
            onReload={() => onLoadImageDeletionRequestsPage(1)}
            onReviewImageDeletionRequest={onReviewImageDeletionRequest}
          />
        ) : null}
        {activeWikiTab !== "draftImages" && activeWikiTab !== "imageDeletionRequests" ? (
          <DraftWikiListPanel
            locale={locale}
            reviewError={draftWikiReviewError}
            deletingWikiIdentifier={deletingWikiIdentifier}
            reviewingWikiIdentifier={reviewingWikiIdentifier}
            state={draftWikis[activeWikiTab]}
            t={t}
            tab={activeWikiTab}
            onLoadMore={() => {
              const pageInfo = draftWikis[activeWikiTab].pageInfo;

              if (pageInfo) {
                onLoadDraftWikisPage(activeWikiTab, pageInfo.current_page + 1);
              }
            }}
            onReload={() => onLoadDraftWikisPage(activeWikiTab, 1)}
            onDeleteDraftWiki={onDeleteDraftWiki}
            onReviewDraftWiki={onReviewDraftWiki}
            onWithdrawDraftWiki={onWithdrawDraftWiki}
          />
        ) : null}
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
        <h2 className="text-xl font-semibold">{t.wikiErrorTitle}</h2>
        <p role="alert" className="mt-3 text-sm leading-7 text-text-muted">
          {state.message}
        </p>
        <button
          type="button"
          className="mt-5 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
          onClick={onRetry}
        >
          {t.retryPrincipal}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
      <h2 className="text-xl font-semibold">{t.wikiMissingTitle}</h2>
      <p className="mt-3 text-sm leading-7 text-text-muted">
        {t.wikiMissingMessage}
      </p>
      {!canActivate ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-text-muted">
          {isAuthenticated ? t.accountUnavailableMessage : t.identityUnavailableMessage}
        </p>
      ) : null}
      <button
        type="button"
        className="mt-5 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canActivate}
        onClick={onActivate}
      >
        {t.activateWiki}
      </button>
    </div>
  );
}

function SettingsSection({
  currentIdentity,
  selectedSettingsTab,
  settingsState,
  t,
  onProfileImageChange,
  onProfileImageCropCancel,
  onProfileImageCropConfirm,
  onProfileImageCropError,
  onProfileImageDelete,
  onSaveIdentitySettings,
  onSelectSettingsTab,
  onUpdateSettingsField,
}: {
  currentIdentity: IdentitySummary | null;
  selectedSettingsTab: MyPageSettingsTab;
  settingsState: MyPageIdentitySettingsState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onProfileImageChange: (file: File | null) => void;
  onProfileImageCropCancel: () => void;
  onProfileImageCropConfirm: (croppedDataUrl: string) => void;
  onProfileImageCropError: (message: string) => void;
  onProfileImageDelete: () => void;
  onSaveIdentitySettings: () => void;
  onSelectSettingsTab: (tab: MyPageSettingsTab) => void;
  onUpdateSettingsField: (field: "identityName" | "language", value: string) => void;
}) {
  const tabs = [
    createSettingsTab("profileSettings", t.profileSettingsTab),
    createSettingsTab("languageSettings", t.languageSettingsTab),
  ];

  return (
    <section className="space-y-5">
      <div className="overflow-x-auto border-b border-stroke-subtle">
        <div aria-label={t.settingsTabsLabel} className="-mb-px flex gap-1" role="tablist">
          {tabs.map((tab) => (
            <button
              aria-selected={selectedSettingsTab === tab.id}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                selectedSettingsTab === tab.id
                  ? "border-brand-primary text-text-strong"
                  : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"
              }`}
              key={tab.id}
              onClick={() => onSelectSettingsTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <IdentitySettingsPanel
        activeTab={selectedSettingsTab}
        currentIdentity={currentIdentity}
        settingsState={settingsState}
        t={t}
        onProfileImageChange={onProfileImageChange}
        onProfileImageCropCancel={onProfileImageCropCancel}
        onProfileImageCropConfirm={onProfileImageCropConfirm}
        onProfileImageCropError={onProfileImageCropError}
        onProfileImageDelete={onProfileImageDelete}
        onSave={onSaveIdentitySettings}
        onUpdateField={onUpdateSettingsField}
      />
    </section>
  );
}

function IdentitySettingsPanel({
  activeTab,
  currentIdentity,
  settingsState,
  t,
  onProfileImageChange,
  onProfileImageCropCancel,
  onProfileImageCropConfirm,
  onProfileImageCropError,
  onProfileImageDelete,
  onSave,
  onUpdateField,
}: {
  activeTab: MyPageSettingsTab;
  currentIdentity: IdentitySummary | null;
  settingsState: MyPageIdentitySettingsState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onProfileImageChange: (file: File | null) => void;
  onProfileImageCropCancel: () => void;
  onProfileImageCropConfirm: (croppedDataUrl: string) => void;
  onProfileImageCropError: (message: string) => void;
  onProfileImageDelete: () => void;
  onSave: () => void;
  onUpdateField: (field: "identityName" | "language", value: string) => void;
}) {
  const isProfileTab = activeTab === "profileSettings";
  const profileImageSrc = settingsState.imagePreview;

  return (
    <section className="mt-5 rounded-lg border border-stroke-subtle bg-surface-raised p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {isProfileTab ? t.profileSettingsTitle : t.languageSettingsTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            {isProfileTab ? t.profileSettingsDescription : t.languageSettingsDescription}
          </p>
        </div>
        <button
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={settingsState.isSaving || !currentIdentity}
          onClick={onSave}
          type="button"
        >
          {settingsState.isSaving ? t.identitySettingsSaving : t.identitySettingsSave}
        </button>
      </div>
      <div className="mt-5 grid gap-5">
        {isProfileTab ? (
          <>
            <label className="grid gap-2 text-sm font-semibold">
              {t.profileIdentityNameLabel}
              <input
                className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
                disabled={settingsState.isSaving || !currentIdentity}
                onChange={(event) => onUpdateField("identityName", event.currentTarget.value)}
                value={settingsState.identityName}
              />
            </label>
            <div className="grid gap-3 text-sm font-semibold">
              <span>{t.profileImageLabel}</span>
              <div className="flex flex-wrap items-center gap-4">
                <label
                  className="group relative grid size-28 cursor-pointer place-items-center overflow-hidden rounded-full border border-stroke-subtle bg-surface-base transition hover:ring-4 hover:ring-brand-highlight/30 focus-within:ring-4 focus-within:ring-brand-highlight/40"
                  title={t.profileImageSelect}
                >
                  {profileImageSrc ? (
                    <Image
                      alt={t.profileImagePreviewAlt}
                      className="size-full object-cover transition group-hover:brightness-90"
                      height={112}
                      src={profileImageSrc}
                      unoptimized
                      width={112}
                    />
                  ) : (
                    <span className="grid size-full place-items-center border border-dashed border-stroke-subtle text-xs text-text-muted">
                      {t.profileImageEmpty}
                    </span>
                  )}
                  <span className="sr-only">{t.profileImageSelect}</span>
                  <input
                    aria-label={t.profileImageSelect}
                    accept={wikiImageAcceptAttribute}
                    className="sr-only"
                    disabled={settingsState.isSaving || !currentIdentity}
                    onChange={(event) => {
                      onProfileImageChange(event.currentTarget.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                    type="file"
                  />
                </label>
                {profileImageSrc ? (
                  <button
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={settingsState.isSaving || !currentIdentity}
                    onClick={onProfileImageDelete}
                    type="button"
                  >
                    {t.profileImageDelete}
                  </button>
                ) : null}
              </div>
              {settingsState.imageCropState ? (
                <ImageCropper
                  aspect={1}
                  disabled={settingsState.isSaving || !currentIdentity}
                  sourceDataUrl={settingsState.imageCropState.sourceDataUrl}
                  t={t.profileImageCropper}
                  onCancel={onProfileImageCropCancel}
                  onConfirm={onProfileImageCropConfirm}
                  onError={onProfileImageCropError}
                />
              ) : null}
            </div>
          </>
        ) : (
          <label className="grid gap-2 text-sm font-semibold">
            {t.languageLabel}
            <select
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              disabled={settingsState.isSaving || !currentIdentity}
              onChange={(event) => onUpdateField("language", event.currentTarget.value)}
              value={settingsState.language}
            >
              {Object.entries(localeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {settingsState.imageReadError ? (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
            {settingsState.imageReadError}
          </p>
        ) : null}
        {settingsState.error ? (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
            {settingsState.error}
          </p>
        ) : null}
        {settingsState.syncError ? (
          <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm font-semibold text-yellow-800" role="alert">
            {settingsState.syncError}
          </p>
        ) : null}
        {settingsState.success ? (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">
            {settingsState.success}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function CreateDraftWikiDialog({
  autoCreatableResourceTypes,
  error,
  isCreating,
  isOpen,
  locale,
  t,
  onClose,
  onSubmit,
}: {
  autoCreatableResourceTypes: WikiResourceType[];
  error: string | null;
  isCreating: boolean;
  isOpen: boolean;
  locale: Locale;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onClose: () => void;
  onSubmit: (input: {
    agencyIdentifier: string | null;
    groupIdentifiers: string[];
    language: Locale;
    mode: CreateDraftWikiMode;
    name: string;
    resourceType: WikiResourceType;
    slug: string;
    talentIdentifiers: string[];
  }) => void;
}) {
  const [mode, setMode] = useState<CreateDraftWikiMode>("manual");
  const [resourceType, setResourceType] = useState<WikiResourceType>("group");
  const [language, setLanguage] = useState<Locale>(locale);
  const [selectedAgency, setSelectedAgency] = useState<WikiMasterSearchItem[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<WikiMasterSearchItem[]>([]);
  const [selectedTalents, setSelectedTalents] = useState<WikiMasterSearchItem[]>([]);
  const canAutoCreate = autoCreatableResourceTypes.length > 0;
  const effectiveMode = mode === "auto" && canAutoCreate ? "auto" : "manual";
  const selectableResourceTypes =
    effectiveMode === "auto" ? autoCreatableResourceTypes : wikiResourceTypes;
  const selectedResourceType = selectableResourceTypes.includes(resourceType)
    ? resourceType
    : selectableResourceTypes[0] ?? "group";

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-label={t.createWikiDialogTitle}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6"
      role="dialog"
    >
      <form
        className="w-full max-w-md rounded-lg border border-stroke-subtle bg-surface-raised p-5 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const language = formData.get("language");
          const name = String(formData.get("name") ?? "").trim();
          const slug = String(formData.get("slug") ?? "").trim();

          if (
            !Object.keys(localeLabels).some((candidate) => candidate === language) ||
            !wikiResourceTypes.some((candidate) => candidate === selectedResourceType)
          ) {
            return;
          }

          onSubmit({
            agencyIdentifier: effectiveMode === "auto" ? selectedAgency[0]?.wikiIdentifier ?? null : null,
            groupIdentifiers: effectiveMode === "auto" ? selectedGroups.map((item) => item.wikiIdentifier) : [],
            language: language as Locale,
            mode: effectiveMode,
            name,
            resourceType: selectedResourceType,
            slug,
            talentIdentifiers: effectiveMode === "auto" ? selectedTalents.map((item) => item.wikiIdentifier) : [],
          });
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{t.createWikiDialogTitle}</h2>
          {canAutoCreate ? (
            <button
              className="rounded-lg border border-stroke-subtle px-3 py-1.5 text-sm font-semibold text-text-muted transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCreating}
              onClick={() => {
                if (effectiveMode === "auto") {
                  setMode("manual");
                  return;
                }

                setMode("auto");
                if (!autoCreatableResourceTypes.includes(resourceType)) {
                  setResourceType(autoCreatableResourceTypes[0] ?? "group");
                }
              }}
              type="button"
            >
              {effectiveMode === "auto" ? t.createWikiManualMode : t.createWikiAutoMode}
            </button>
          ) : null}
        </div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            {t.resourceTypeLabel}
            <select
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              disabled={isCreating}
              name="resourceType"
              onChange={(event) => {
                setResourceType(event.currentTarget.value as WikiResourceType);
                setSelectedAgency([]);
                setSelectedGroups([]);
                setSelectedTalents([]);
              }}
              required
              value={selectedResourceType}
            >
              {selectableResourceTypes.map((resourceType) => (
                <option key={resourceType} value={resourceType}>
                  {getDraftWikiResourceLabel(t, resourceType)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t.languageLabel}
            <select
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              disabled={isCreating}
              name="language"
              onChange={(event) => setLanguage(event.currentTarget.value as Locale)}
              required
              value={language}
            >
              {Object.entries(localeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t.wikiNameLabel}
            <input
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              disabled={isCreating}
              name="name"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t.slugLabel}
            <input
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              disabled={isCreating}
              name="slug"
              pattern="[a-z0-9][a-z0-9-]*"
              required
            />
          </label>
          {effectiveMode === "auto" ? (
            <AutoCreateRelatedWikiFields
              disabled={isCreating}
              language={language}
              resourceType={selectedResourceType}
              selectedAgency={selectedAgency}
              selectedGroups={selectedGroups}
              selectedTalents={selectedTalents}
              setSelectedAgency={setSelectedAgency}
              setSelectedGroups={setSelectedGroups}
              setSelectedTalents={setSelectedTalents}
              t={t}
            />
          ) : null}
          {error ? (
            <p
              className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating}
            onClick={onClose}
            type="button"
          >
            {t.cancelCreateWiki}
          </button>
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? t.creatingWiki : effectiveMode === "auto" ? t.autoCreateWiki : t.createWiki}
          </button>
        </div>
      </form>
    </div>
  );
}


type RejectDraftWikiDialogProps = { isOpen: boolean; isSubmitting: boolean; t: ReturnType<typeof useI18n>["dictionary"]["mypage"]; onClose: () => void; onSubmit: (reason: string) => void };

function RejectDraftWikiDialog(props: RejectDraftWikiDialogProps) {
  const { isOpen, isSubmitting, onClose, onSubmit, t } = props;
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();

  if (!isOpen) {
    return null;
  }

  return (
    <section
      aria-label={t.rejectDraftWikiDialogTitle}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
    >
      <form
        className="mx-auto w-full max-w-[30rem] rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();

          if (!trimmedReason) {
            return;
          }

          onSubmit(trimmedReason);
          setReason("");
        }}
      >
        <header className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{t.rejectDraftWikiDialogTitle}</h2>
        </header>
        <label className="mt-5 grid gap-2 text-sm font-semibold">
          {t.rejectDraftWikiReasonLabel}
          <textarea
            className="min-h-32 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
            disabled={isSubmitting}
            onChange={(event) => setReason(event.currentTarget.value)}
            required
            value={reason}
          />
        </label>
        {!trimmedReason ? (
          <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
            {t.rejectDraftWikiReasonRequired}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => {
              setReason("");
              onClose();
            }}
            type="button"
          >
            {t.cancelDraftWikiRejectReason}
          </button>
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !trimmedReason}
            type="submit"
          >
            {isSubmitting ? t.draftWikiReviewing : t.submitDraftWikiRejectReason}
          </button>
        </div>
      </form>
    </section>
  );
}

type DraftWikiRejectReasonDialogProps = { reason: string | null; t: ReturnType<typeof useI18n>["dictionary"]["mypage"]; onClose: () => void };

function DraftWikiRejectReasonDialog(props: DraftWikiRejectReasonDialogProps) {
  const { reason, t, onClose } = props;
  if (!reason) {
    return null;
  }

  return (
    <section
      aria-label={t.draftWikiRejectReasonDialogTitle}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
    >
      <div className="mx-auto w-full max-w-[30rem] rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
        <header className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{t.draftWikiRejectReasonDialogTitle}</h2>
          <button
            className="inline-flex rounded-md border border-stroke-subtle px-3 py-1.5 text-sm font-semibold text-text-muted transition hover:bg-brand-highlight/30"
            onClick={onClose}
            type="button"
          >
            {t.closeDraftWikiRejectReason}
          </button>
        </header>
        <p className="mt-4 whitespace-pre-wrap rounded-lg bg-surface-base p-3 text-sm leading-6">
          {reason}
        </p>
      </div>
    </section>
  );
}

function AutoCreateRelatedWikiFields({
  disabled,
  language,
  resourceType,
  selectedAgency,
  selectedGroups,
  selectedTalents,
  setSelectedAgency,
  setSelectedGroups,
  setSelectedTalents,
  t,
}: {
  disabled: boolean;
  language: Locale;
  resourceType: WikiResourceType;
  selectedAgency: WikiMasterSearchItem[];
  selectedGroups: WikiMasterSearchItem[];
  selectedTalents: WikiMasterSearchItem[];
  setSelectedAgency: (items: WikiMasterSearchItem[]) => void;
  setSelectedGroups: (items: WikiMasterSearchItem[]) => void;
  setSelectedTalents: (items: WikiMasterSearchItem[]) => void;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
}) {
  const showsAgency = resourceType === "group" || resourceType === "talent" || resourceType === "song";
  const showsGroups = resourceType === "talent" || resourceType === "song";
  const showsTalents = resourceType === "song";

  if (!showsAgency && !showsGroups && !showsTalents) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {showsAgency ? (
        <WikiMasterSearchSelect
          disabled={disabled}
          language={language}
          label={t.relatedAgencyLabel}
          mode="single"
          onChange={setSelectedAgency}
          resourceType="agency"
          selectedItems={selectedAgency}
        />
      ) : null}
      {showsGroups ? (
        <WikiMasterSearchSelect
          disabled={disabled}
          language={language}
          label={t.relatedGroupLabel}
          mode="multiple"
          onChange={setSelectedGroups}
          resourceType="group"
          selectedItems={selectedGroups}
        />
      ) : null}
      {showsTalents ? (
        <WikiMasterSearchSelect
          disabled={disabled}
          language={language}
          label={t.relatedTalentLabel}
          mode="multiple"
          onChange={setSelectedTalents}
          resourceType="talent"
          selectedItems={selectedTalents}
        />
      ) : null}
    </div>
  );
}

function DraftWikiListPanel({
  locale,
  reviewError,
  deletingWikiIdentifier,
  reviewingWikiIdentifier,
  state,
  t,
  tab,
  onLoadMore,
  onReload,
  onDeleteDraftWiki,
  onReviewDraftWiki,
  onWithdrawDraftWiki,
}: {
  locale: Locale;
  reviewError: string | null;
  deletingWikiIdentifier: string | null;
  reviewingWikiIdentifier: string | null;
  state: DraftWikiListState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  tab: MyPageDraftWikiActionTab;
  onLoadMore: () => void;
  onReload: () => void;
  onDeleteDraftWiki: (wiki: MyPageWikiListItem) => void;
  onReviewDraftWiki: (wiki: MyPageWikiListItem, action: WikiDraftWorkflowAction, reason?: string) => void;
  onWithdrawDraftWiki: (wiki: MyPageWikiListItem) => void;
}) {
  const canLoadMore = state.pageInfo
    ? state.pageInfo.current_page < state.pageInfo.last_page
    : false;
  const isBusy = state.isInitialLoading || state.isLoadingMore;
  const messages = getDraftWikiListMessages(t, tab);

  if (state.loadError) {
    return (
      <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <p role="alert" className="font-semibold">{state.loadError}</p>
        <button
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold transition hover:bg-red-100"
          onClick={onReload}
          type="button"
        >
          {t.reloadDraftWikis}
        </button>
      </div>
    );
  }

  if (state.isInitialLoading) {
    return (
      <div className="mt-5 grid min-h-40 place-items-center rounded-lg border border-dashed border-stroke-subtle text-sm font-semibold text-text-muted">
        {messages.loading}
      </div>
    );
  }

  if (state.wikis.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-stroke-subtle p-6 text-center">
        <p className="font-semibold">{messages.emptyTitle}</p>
        <p className="mt-2 text-sm text-text-muted">{messages.emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {state.pageInfo ? (
        <p className="text-sm font-semibold text-text-muted">
          {messages.total(state.pageInfo.total)}
        </p>
      ) : null}
      {reviewError && (
        tab === "editingWikis" ||
        tab === "submittedWikis" ||
        tab === "unapprovedWikis" ||
        tab === "approvedWikis" ||
        tab === "untranslatedWikis"
      ) ? (
        <p
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          {reviewError}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {state.wikis.map((wiki) => (
          <DraftWikiCard
            isDeleting={deletingWikiIdentifier === wiki.wikiIdentifier}
            isReviewing={reviewingWikiIdentifier === wiki.wikiIdentifier}
            key={wiki.wikiIdentifier}
            locale={locale}
            showDeleteAction={isDeletableDraftWiki(wiki, tab)}
            showPublishAction={tab === "approvedWikis"}
            showReviewActions={tab === "unapprovedWikis"}
            showTranslateAction={tab === "untranslatedWikis"}
            showWithdrawAction={tab === "submittedWikis"}
            t={t}
            tab={tab}
            wiki={wiki}
            onDeleteDraftWiki={onDeleteDraftWiki}
            onReviewDraftWiki={onReviewDraftWiki}
            onWithdrawDraftWiki={onWithdrawDraftWiki}
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
            {state.isLoadingMore ? t.draftWikiListLoadingMore : t.loadMoreDraftWikis}
          </button>
        ) : (
          <p className="text-sm font-semibold text-text-muted">{t.allDraftWikisLoaded}</p>
        )}
      </div>
    </div>
  );
}

function DraftWikiCard({
  isDeleting,
  isReviewing,
  locale,
  showDeleteAction,
  showReviewActions,
  showPublishAction,
  showTranslateAction,
  showWithdrawAction,
  t,
  tab,
  wiki,
  onDeleteDraftWiki,
  onReviewDraftWiki,
  onWithdrawDraftWiki,
}: {
  isDeleting: boolean;
  isReviewing: boolean;
  locale: Locale;
  showDeleteAction: boolean;
  showPublishAction: boolean;
  showReviewActions: boolean;
  showTranslateAction: boolean;
  showWithdrawAction: boolean;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  tab: MyPageDraftWikiActionTab;
  wiki: MyPageWikiListItem;
  onDeleteDraftWiki: (wiki: MyPageWikiListItem) => void;
  onReviewDraftWiki: (wiki: MyPageWikiListItem, action: WikiDraftWorkflowAction, reason?: string) => void;
  onWithdrawDraftWiki: (wiki: MyPageWikiListItem) => void;
}) {
  const hasImage = wiki.isHidden !== true && Boolean(wiki.imageUrl);
  const href = getDraftWikiHref(wiki, tab);
  const isDraftWiki = isDraftWikiListItem(wiki);
  const diffHref = getDraftWikiDiffHref(wiki);
  const canOpenDiff = isDraftWiki && wiki.publishedWikiIdentifier !== null;
  const rejectionReason = getDraftWikiRejectionReason(wiki);
  const [isRejectionReasonOpen, setIsRejectionReasonOpen] = useState(false);
  const cardClassName =
    "wiki-theme-scope min-w-0 rounded-lg border border-stroke-subtle bg-surface-base bg-cover bg-center p-4 shadow-soft";
  const cardStyle = buildDraftWikiCardStyle(wiki);

  return (
    <article
      className={cardClassName}
      style={cardStyle}
    >
    <div className="relative z-10">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold">
            <a
              className="text-brand-primary underline underline-offset-4"
              href={href}
              style={{ color: hasImage ? "#fffaf4" : undefined }}
            >
              {wiki.name}
            </a>
          </h3>
          <p
            className="mt-1 text-xs font-semibold uppercase text-text-muted"
            style={{ color: hasImage ? "rgba(255, 250, 244, 0.78)" : undefined }}
          >
            {wiki.language}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rejectionReason ? (
            <button
              aria-label={t.showDraftWikiRejectReason}
              className="grid size-8 place-items-center text-yellow-500 transition hover:text-yellow-600"
              onClick={() => setIsRejectionReasonOpen(true)}
              type="button"
            >
              <ExclamationTriangleIcon aria-hidden="true" className="size-6" />
            </button>
          ) : null}
          <span
            className="rounded-full border border-stroke-subtle px-2.5 py-1 text-xs font-semibold text-text-muted"
            style={{
              backgroundColor: hasImage
                ? "rgba(255, 255, 255, 0.86)"
                : wiki.themeColor
                  ? "var(--wiki-accent-background, rgba(255, 214, 194, 0.6))"
                  : undefined,
              color: hasImage
                ? "#15243b"
                : wiki.themeColor
                  ? "var(--wiki-accent-text)"
                  : undefined,
            }}
          >
            {getDraftWikiResourceLabel(t, wiki.resourceType)}
          </span>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        {isDraftWiki ? (
          <DraftWikiMeta
            isOnImage={hasImage}
            label={t.draftWikiStatusLabel}
            value={getDraftWikiStatusLabel(t, wiki.status)}
          />
        ) : (
          <DraftWikiMeta
            isOnImage={hasImage}
            label={t.untranslatedWikiVersionLabel}
            value={String(wiki.version)}
          />
        )}
        <DraftWikiMeta
          isOnImage={hasImage}
          label={isDraftWiki ? t.draftWikiEditedAtLabel : t.untranslatedWikiUpdatedAtLabel}
          value={formatDraftDate(isDraftWiki ? wiki.editedAt : wiki.updatedAt, locale)}
        />
      </dl>
      {showReviewActions ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onReviewDraftWiki(wiki, "approve")}
            type="button"
          >
            {isReviewing ? t.draftWikiReviewing : t.approveDraftWiki}
          </button>
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onReviewDraftWiki(wiki, "reject")}
            style={{
              backgroundColor: hasImage ? "rgba(255, 255, 255, 0.88)" : undefined,
              color: hasImage ? "#15243b" : undefined,
            }}
            type="button"
          >
            {isReviewing ? t.draftWikiReviewing : t.rejectDraftWiki}
          </button>
          {canOpenDiff ? (
            <a
              className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30"
              href={diffHref}
              style={{
                backgroundColor: hasImage ? "rgba(255, 255, 255, 0.88)" : undefined,
                color: hasImage ? "#15243b" : undefined,
              }}
            >
              {t.compareDraftWikiDiff}
            </a>
          ) : (
            <button
              className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold opacity-60 disabled:cursor-not-allowed"
              disabled
              style={{
                backgroundColor: hasImage ? "rgba(255, 255, 255, 0.88)" : undefined,
                color: hasImage ? "#15243b" : undefined,
              }}
              type="button"
            >
              {t.compareDraftWikiDiff}
            </button>
          )}
        </div>
      ) : null}
      {showDeleteAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting || isReviewing}
            onClick={() => onDeleteDraftWiki(wiki)}
            type="button"
          >
            {isDeleting ? t.draftWikiDeleting : t.deleteDraftWiki}
          </button>
        </div>
      ) : null}
      {showWithdrawAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onWithdrawDraftWiki(wiki)}
            style={{
              backgroundColor: hasImage ? "rgba(255, 255, 255, 0.88)" : undefined,
              color: hasImage ? "#15243b" : undefined,
            }}
            type="button"
          >
            {isReviewing ? t.draftWikiWithdrawing : t.withdrawDraftWiki}
          </button>
        </div>
      ) : null}
      {showPublishAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onReviewDraftWiki(wiki, "publish")}
            type="button"
          >
            {isReviewing ? t.draftWikiPublishing : t.publishDraftWiki}
          </button>
        </div>
      ) : null}
      {showTranslateAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onReviewDraftWiki(wiki, "translate")}
            type="button"
          >
            {isReviewing ? t.draftWikiTranslating : t.translateDraftWiki}
          </button>
        </div>
      ) : null}
    </div>
      <DraftWikiRejectReasonDialog
        reason={isRejectionReasonOpen ? rejectionReason : null}
        t={t}
        onClose={() => setIsRejectionReasonOpen(false)}
      />
    </article>
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
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
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
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
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
          <DraftImageSourceNameMeta
            label={t.draftImageSourceNameLabel}
            sourceName={image.sourceName}
            sourceUrl={image.sourceUrl}
          />
          <DraftImageMeta label={t.draftImageAltTextLabel} value={image.altText || t.draftImageNoAltText} />
          <DraftImageMeta
            label={t.draftImageUploadedAtLabel}
            value={formatDraftDate(image.uploadedAt, locale)}
          />
          <DraftImageMeta
            label={t.imageDeletionRequestRequesterNameLabel}
            value={image.name}
          />
          <DraftImageMeta
            label={t.imageDeletionRequestRequesterEmailLabel}
            value={image.email}
          />
          <DraftImageMeta
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
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-labelledby="image-deletion-review-dialog-title"
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

function DraftImageListPanel({
  locale,
  reviewError,
  reviewingImageIdentifier,
  state,
  t,
  onLoadMore,
  onReload,
  onReviewDraftImage,
}: {
  locale: Locale;
  reviewError: string | null;
  reviewingImageIdentifier: string | null;
  state: DraftImageListState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onLoadMore: () => void;
  onReload: () => void;
  onReviewDraftImage: (imageIdentifier: string, action: "approve" | "reject") => void;
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
          {t.reloadDraftImages}
        </button>
      </div>
    );
  }

  if (state.isInitialLoading) {
    return (
      <div className="mt-5 grid min-h-40 place-items-center rounded-lg border border-dashed border-stroke-subtle text-sm font-semibold text-text-muted">
        {t.draftImageListLoading}
      </div>
    );
  }

  if (state.images.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-stroke-subtle p-6 text-center">
        <p className="font-semibold">{t.draftImageListEmptyTitle}</p>
        <p className="mt-2 text-sm text-text-muted">{t.draftImageListEmptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {state.pageInfo ? (
        <p className="text-sm font-semibold text-text-muted">
          {t.draftImageListTotal(state.pageInfo.total)}
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
        {state.images.map((image) => {
          const wiki = getDraftImageWikiDisplay(image, locale);
          const isReviewing = reviewingImageIdentifier === image.imageIdentifier;

          return (
            <article
              className="overflow-hidden rounded-lg border border-stroke-subtle bg-surface-base"
              key={image.imageIdentifier}
            >
              <div className="relative aspect-[4/3] bg-black/10">
                <Image
                  alt={image.altText || image.sourceName || image.imageIdentifier}
                  className="object-cover"
                  fill
                  sizes="(min-width: 768px) 40vw, 90vw"
                  src={image.url}
                  unoptimized
                />
              </div>
              <div className="grid gap-4 p-4 text-sm">
                <dl className="grid gap-3">
                  <DraftImageSourceNameMeta
                    label={t.draftImageSourceNameLabel}
                    sourceName={image.sourceName}
                    sourceUrl={image.sourceUrl}
                  />
                  <DraftImageMeta label={t.draftImageAltTextLabel} value={image.altText || t.draftImageNoAltText} />
                  <DraftImageWikiMeta
                    href={wiki.href}
                    label={t.draftImageRelatedWikiLabel}
                    name={wiki.name}
                  />
                  <DraftImageMeta
                    label={t.draftImageUploadedAtLabel}
                    value={formatDraftDate(image.uploadedAt, locale)}
                  />
                </dl>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isReviewing}
                    onClick={() => onReviewDraftImage(image.imageIdentifier, "approve")}
                    type="button"
                  >
                    {isReviewing ? t.draftImageReviewing : t.approveDraftImage}
                  </button>
                  <button
                    className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isReviewing}
                    onClick={() => onReviewDraftImage(image.imageIdentifier, "reject")}
                    type="button"
                  >
                    {isReviewing ? t.draftImageReviewing : t.rejectDraftImage}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex justify-center">
        {canLoadMore ? (
          <button
            className="rounded-lg border border-stroke-subtle px-5 py-2.5 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onLoadMore}
            type="button"
          >
            {state.isLoadingMore ? t.draftImageListLoadingMore : t.loadMoreDraftImages}
          </button>
        ) : (
          <p className="text-sm font-semibold text-text-muted">{t.allDraftImagesLoaded}</p>
        )}
      </div>
    </div>
  );
}

function DraftWikiMeta({
  isOnImage = false,
  label,
  value,
}: {
  isOnImage?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt
        className="font-semibold text-text-muted"
        style={{ color: isOnImage ? "rgba(255, 250, 244, 0.72)" : undefined }}
      >
        {label}
      </dt>
      <dd
        className="mt-1 break-words text-text-strong"
        style={{ color: isOnImage ? "rgba(255, 250, 244, 0.94)" : undefined }}
      >
        {value}
      </dd>
    </div>
  );
}

const getDraftWikiRejectionReason = (wiki: MyPageWikiListItem): string | null => {
  const reason = "rejectionReason" in wiki ? wiki.rejectionReason : null;

  return typeof reason === "string" && reason.trim() ? reason : null;
};

const getDraftWikiListMessages = (
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"],
  tab: MyPageDraftWikiActionTab,
) => {
  if (tab === "editingWikis") {
    return {
      emptyMessage: t.editingWikiListEmptyMessage,
      emptyTitle: t.editingWikiListEmptyTitle,
      loading: t.editingWikiListLoading,
      total: t.editingWikiListTotal,
    };
  }

  if (tab === "submittedWikis") {
    return {
      emptyMessage: t.submittedWikiListEmptyMessage,
      emptyTitle: t.submittedWikiListEmptyTitle,
      loading: t.submittedWikiListLoading,
      total: t.submittedWikiListTotal,
    };
  }

  if (tab === "approvedWikis") {
    return {
      emptyMessage: t.approvedWikiListEmptyMessage,
      emptyTitle: t.approvedWikiListEmptyTitle,
      loading: t.approvedWikiListLoading,
      total: t.approvedWikiListTotal,
    };
  }

  if (tab === "untranslatedWikis") {
    return {
      emptyMessage: t.untranslatedWikiListEmptyMessage,
      emptyTitle: t.untranslatedWikiListEmptyTitle,
      loading: t.untranslatedWikiListLoading,
      total: t.untranslatedWikiListTotal,
    };
  }

  return {
    emptyMessage: t.unapprovedWikiListEmptyMessage,
    emptyTitle: t.unapprovedWikiListEmptyTitle,
    loading: t.unapprovedWikiListLoading,
    total: t.unapprovedWikiListTotal,
  };
};

const isDraftWikiListItem = (wiki: MyPageWikiListItem): wiki is WikiDraftWiki =>
  ["approved", "pending", "rejected", "under_review"].includes(
    typeof (wiki as { status?: unknown }).status === "string"
      ? (wiki as { status: string }).status
      : "",
  );

const isDeletableDraftWiki = (
  wiki: MyPageWikiListItem,
  tab: MyPageDraftWikiActionTab,
): wiki is WikiDraftWiki =>
  tab === "editingWikis" &&
  isDraftWikiListItem(wiki) &&
  (wiki.status === "pending" || wiki.status === "rejected");

const getDraftWikiHref = (wiki: MyPageWikiListItem, tab: MyPageDraftWikiActionTab): string =>
  tab === "untranslatedWikis"
    ? `/wiki/${encodeURIComponent(wiki.language)}/${encodeURIComponent(wiki.slug)}`
    : `/wiki/${encodeURIComponent(wiki.language)}/${encodeURIComponent(wiki.slug)}/edit`;

const getDraftWikiDiffHref = (wiki: MyPageWikiListItem): string =>
  `/wiki/diff/${encodeURIComponent(wiki.wikiIdentifier)}?resourceType=${encodeURIComponent(wiki.resourceType)}`;

const buildDraftWikiCardStyle = (wiki: MyPageWikiListItem): CSSProperties | undefined => {
  if (wiki.isHidden !== true && wiki.imageUrl) {
    return {
      backgroundColor: "#15243b",
      backgroundImage: `linear-gradient(180deg, rgba(21, 36, 59, 0.78) 0%, rgba(21, 36, 59, 0.68) 48%, rgba(21, 36, 59, 0.9) 100%), url("${wiki.imageUrl.replaceAll("\"", "%22")}")`,
      borderColor: "rgba(255, 255, 255, 0.22)",
    };
  }

  const themeVariables = buildWikiThemeCssVariables(wiki.themeColor);

  if (!themeVariables) {
    return undefined;
  }

  return {
    ...themeVariables,
    backgroundColor: "var(--wiki-card-background, var(--surface-raised))",
    backgroundImage: "var(--wiki-page-background)",
    borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
  };
};

const getDraftWikiResourceLabel = (
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"],
  resourceType: string,
): string => (t.draftWikiResourceLabels as Record<string, string>)[resourceType] ?? resourceType;

const getDraftWikiStatusLabel = (
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"],
  status: WikiDraftWiki["status"],
): string => (t.draftWikiStatusLabels as Record<string, string>)[status] ?? status;

const formatDraftDate = (value: string | null, locale: Locale): string => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        day: "numeric",
        hour: "numeric",
        hour12: false,
        minute: "2-digit",
        month: "numeric",
        second: "2-digit",
        timeZone: "Asia/Tokyo",
        year: "numeric",
      }).format(date);
};

function DraftImageMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-semibold text-text-muted">{label}</dt>
      <dd className="mt-1 break-all text-text-strong">{value}</dd>
    </div>
  );
}

function DraftImageSourceNameMeta({
  label,
  sourceName,
  sourceUrl,
}: {
  label: string;
  sourceName: string;
  sourceUrl: string;
}) {
  const safeSourceUrl = isSafeWikiSourceUrl(sourceUrl) ? sourceUrl : null;

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
          sourceName
        )}
      </dd>
    </div>
  );
}

function DraftImageWikiMeta({
  href,
  label,
  name,
}: {
  href: string;
  label: string;
  name: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-semibold text-text-muted">{label}</dt>
      <dd className="mt-1 break-all text-text-strong">
        <a className="text-brand-primary underline underline-offset-4" href={href}>
          {name}
        </a>
      </dd>
    </div>
  );
}

const getDraftImageWikiDisplay = (
  image: WikiDraftImage,
  locale: Locale,
): { href: string; name: string } => {
  const fallbackLanguages = [locale, "ja", "en", "ko"];
  const language =
    fallbackLanguages.find((candidate) => image.wiki.names[candidate]?.trim()) ?? locale;
  const wikiName = image.wiki.names[language]?.trim() || image.wiki.slug;

  return {
    href: buildWikiPath(language, image.wiki.slug),
    name: `${wikiName}（${language}）`,
  };
};
