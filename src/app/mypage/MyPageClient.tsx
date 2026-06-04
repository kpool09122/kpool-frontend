"use client";

import type { IdentitySummary } from "@/gateways/identity/identityApi";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type CSSProperties, useCallback, useMemo, useState } from "react";

import { useAuthStore } from "@/gateways/auth/authStore";
import { useI18n } from "../../i18n/I18nProvider";
import { localeLabels, type Locale } from "../../i18n/locales";
import {
  canPublishWikiDraftWikis,
  canReviewWikiDraftImages,
  canReviewWikiDraftWikis,
  createWikiPrincipal,
  getCurrentWikiPrincipal,
  type WikiPrincipalState,
} from "@/gateways/wiki/wikiPrincipal";
import {
  approveWikiDraft,
  createWiki,
  createWikiRequestBodyFromInitialFields,
  deleteWikiDraft,
  fetchVersionInconsistentWikis,
  fetchWikiDraftWikis,
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
  fetchWikiDraftImages,
  rejectWikiDraftImage,
} from "@/gateways/wiki/wikiImageBrowserApi";
import {
  buildWikiEditPath,
  buildWikiPath,
  isSafeWikiSourceUrl,
  normalizeWikiSlugForResourceType,
  type WikiDraftImage,
  type WikiResourceType,
  wikiResourceTypes,
} from "@kpool/wiki";
import {
  initialDraftImageListState,
  type DraftImageListState,
  useMyPageDraftImageReview,
} from "./useMyPageDraftImageReview";
import {
  initialDraftWikiListState,
  type DraftWikiListState,
  type MyPageDraftWikiActionTab,
  type MyPageWikiListItem,
  useMyPageDraftWikis,
} from "./useMyPageDraftWikis";
import type {
  MyPageDraftImageAdapter,
  MyPageDraftWikiAdapter,
  MyPagePrincipalAdapter,
} from "@/gateways/mypage/myPageAdapters";
import { useMyPageWikiPrincipal } from "./useMyPageWikiPrincipal";

type MyPageWikiTab = MyPageDraftWikiActionTab | "draftImages";

type MyPageClientProps = {
  initialIdentity: IdentitySummary | null;
  initialDraftImages?: DraftImageListState;
  initialDraftWikis?: Record<MyPageDraftWikiActionTab, DraftWikiListState>;
  initialPrincipalState?: WikiPrincipalState;
  draftImageAdapter?: MyPageDraftImageAdapter;
  draftWikiAdapter?: MyPageDraftWikiAdapter;
  principalAdapter?: MyPagePrincipalAdapter;
};

type CreateDraftWikiDialogState = {
  error: string | null;
  isCreating: boolean;
  isOpen: boolean;
};

const defaultPrincipalAdapter: MyPagePrincipalAdapter = {
  createPrincipal: createWikiPrincipal,
  getCurrentPrincipal: getCurrentWikiPrincipal,
};

const defaultDraftImageAdapter: MyPageDraftImageAdapter = {
  approveDraftImage: approveWikiDraftImage,
  listDraftImages: fetchWikiDraftImages,
  rejectDraftImage: rejectWikiDraftImage,
};

const defaultDraftWikiAdapter: MyPageDraftWikiAdapter = {
  approveDraftWiki: approveWikiDraft,
  deleteDraftWiki: deleteWikiDraft,
  listDraftWikis: fetchWikiDraftWikis,
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

export function MyPageClient({
  draftImageAdapter = defaultDraftImageAdapter,
  draftWikiAdapter = defaultDraftWikiAdapter,
  initialDraftImages = initialDraftImageListState,
  initialDraftWikis = initialDraftWikiLists,
  initialIdentity,
  initialPrincipalState = { status: "idle" },
  principalAdapter = defaultPrincipalAdapter,
}: MyPageClientProps) {
  const router = useRouter();
  const authIdentity = useAuthStore((state) => state.identity);
  const refreshIdentity = useAuthStore((state) => state.refreshIdentity);
  const currentIdentity = authIdentity ?? initialIdentity;
  const { dictionary, locale } = useI18n();
  const t = dictionary.mypage;
  const [selectedWikiTab, setSelectedWikiTab] = useState<MyPageWikiTab>("editingWikis");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [createDialog, setCreateDialog] = useState<CreateDraftWikiDialogState>({
    error: null,
    isCreating: false,
    isOpen: false,
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
    onPrincipalReady: loadFirstDraftWikiPage,
    refreshIdentity: () => refreshIdentity({ preserveOnNull: true }),
  });
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
  const submitCreateDialog = (input: {
    name: string;
    resourceType: WikiResourceType;
    slug: string;
  }) => {
    const slug = normalizeWikiSlugForResourceType(input.slug, input.resourceType);

    setCreateDialog((state) => ({
      ...state,
      error: null,
      isCreating: true,
    }));

    void createWiki({
      fallbackErrorMessage: t.createWikiFailed,
      requestBody: createWikiRequestBodyFromInitialFields({
        language: locale,
        name: input.name,
        resourceType: input.resourceType,
        slug,
      }),
    }).then(() => {
      router.push(buildWikiEditPath(locale, slug));
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
                className={`rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${selectedSectionClass}`}
                aria-current="page"
              >
                {t.wikiMenu}
              </button>
            </nav>
          </div>
        </div>
      </aside>

      <div className="mx-auto max-w-5xl">
        <section className="min-w-0 space-y-6">
          <header className="space-y-3">
            <h1 className="text-3xl font-bold">{t.wikiHeaderTitle}</h1>
            <p className="max-w-3xl text-sm leading-7 text-text-muted">
              {t.wikiHeaderDescription}
            </p>
          </header>

          <WikiPrincipalPanel
            draftImages={draftImages}
            draftWikis={draftWikis}
            locale={locale}
            reviewError={reviewError}
            draftWikiReviewError={draftWikiReviewError}
            reviewingImageIdentifier={reviewingImageIdentifier}
            deletingWikiIdentifier={deletingWikiIdentifier}
            reviewingWikiIdentifier={reviewingWikiIdentifier}
            isAuthenticated={currentIdentity !== null}
            isPending={isActionPending(principalState)}
            selectedWikiTab={selectedWikiTab}
            state={principalState}
            t={t}
            onActivate={() => void activateWikiPrincipal()}
            onLoadDraftImagesPage={(page) => void loadDraftImagesPage(page)}
            onLoadDraftWikisPage={(tab, page) => void loadDraftWikisPage(tab, page)}
            onRetry={() => void loadCurrentPrincipal()}
            onReviewDraftImage={(imageIdentifier, action) =>
              void reviewDraftImage(imageIdentifier, action)
            }
            onDeleteDraftWiki={(wiki) => {
              if (window.confirm(t.deleteDraftWikiConfirm)) {
                void deleteDraftWikiFromMyPage(wiki);
              }
            }}
            onReviewDraftWiki={(wiki, action) => void reviewDraftWiki(wiki, action)}
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
            onClose={closeCreateDialog}
            onSubmit={submitCreateDialog}
          />
        </section>
      </div>
    </main>
  );
}

function WikiPrincipalPanel({
  draftImages,
  draftWikis,
  locale,
  reviewError,
  draftWikiReviewError,
  reviewingImageIdentifier,
  deletingWikiIdentifier,
  reviewingWikiIdentifier,
  isAuthenticated,
  isPending,
  selectedWikiTab,
  state,
  t,
  onActivate,
  onLoadDraftImagesPage,
  onLoadDraftWikisPage,
  onRetry,
  onReviewDraftImage,
  onDeleteDraftWiki,
  onReviewDraftWiki,
  onSelectWikiTab,
  onWithdrawDraftWiki,
  onOpenCreateDraftWiki,
}: {
  draftImages: DraftImageListState;
  draftWikis: Record<MyPageDraftWikiActionTab, DraftWikiListState>;
  locale: Locale;
  reviewError: string | null;
  draftWikiReviewError: string | null;
  reviewingImageIdentifier: string | null;
  deletingWikiIdentifier: string | null;
  reviewingWikiIdentifier: string | null;
  isAuthenticated: boolean;
  isPending: boolean;
  selectedWikiTab: MyPageWikiTab;
  state: WikiPrincipalState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onActivate: () => void;
  onLoadDraftImagesPage: (page: number) => void;
  onLoadDraftWikisPage: (tab: MyPageDraftWikiActionTab, page: number) => void;
  onRetry: () => void;
  onReviewDraftImage: (imageIdentifier: string, action: "approve" | "reject") => void;
  onDeleteDraftWiki: (wiki: MyPageWikiListItem) => void;
  onReviewDraftWiki: (wiki: MyPageWikiListItem, action: WikiDraftWorkflowAction) => void;
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
    const canReviewDraftWikis = canReviewWikiDraftWikis(state.principal);
    const canPublishDraftWikis = canPublishWikiDraftWikis(state.principal);

    const tabs: Array<{ id: MyPageWikiTab; label: string }> = [
      createWikiTab("editingWikis", t.editingWikisTab),
      createWikiTab("submittedWikis", t.submittedWikisTab),
      ...(canReviewDraftWikis ? [createWikiTab("unapprovedWikis", t.unapprovedWikisTab)] : []),
      ...(canPublishDraftWikis ? [createWikiTab("approvedWikis", t.approvedWikisTab)] : []),
      ...(canPublishDraftWikis ? [createWikiTab("untranslatedWikis", t.untranslatedWikisTab)] : []),
      ...(canReviewDraftImages ? [createWikiTab("draftImages", t.draftImagesTab)] : []),
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
        {activeWikiTab !== "draftImages" ? (
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

function CreateDraftWikiDialog({
  error,
  isCreating,
  isOpen,
  locale,
  t,
  onClose,
  onSubmit,
}: {
  error: string | null;
  isCreating: boolean;
  isOpen: boolean;
  locale: Locale;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    resourceType: WikiResourceType;
    slug: string;
  }) => void;
}) {
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
          const resourceType = formData.get("resourceType");
          const name = String(formData.get("name") ?? "").trim();
          const slug = String(formData.get("slug") ?? "").trim();

          if (!wikiResourceTypes.some((candidate) => candidate === resourceType)) {
            return;
          }

          onSubmit({
            name,
            resourceType: resourceType as WikiResourceType,
            slug,
          });
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{t.createWikiDialogTitle}</h2>
          <button
            aria-label={t.cancelCreateWiki}
            className="rounded-lg border border-stroke-subtle px-3 py-1.5 text-sm font-semibold text-text-muted transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating}
            onClick={onClose}
            type="button"
          >
            {t.cancelCreateWiki}
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            {t.resourceTypeLabel}
            <select
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              defaultValue="group"
              disabled={isCreating}
              name="resourceType"
              required
            >
              {wikiResourceTypes.map((resourceType) => (
                <option key={resourceType} value={resourceType}>
                  {getDraftWikiResourceLabel(t, resourceType)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 text-sm font-semibold">
            <span>{t.languageLabel}</span>
            <span className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-text-muted">
              {localeLabels[locale]}
            </span>
          </div>
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
            {isCreating ? t.creatingWiki : t.createWiki}
          </button>
        </div>
      </form>
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
  onReviewDraftWiki: (wiki: MyPageWikiListItem, action: WikiDraftWorkflowAction) => void;
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
  onReviewDraftWiki: (wiki: MyPageWikiListItem, action: WikiDraftWorkflowAction) => void;
  onWithdrawDraftWiki: (wiki: MyPageWikiListItem) => void;
}) {
  const hasImage = Boolean(wiki.imageUrl);
  const href = getDraftWikiHref(wiki, tab);
  const isDraftWiki = isDraftWikiListItem(wiki);
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
        <span
          className="shrink-0 rounded-full border border-stroke-subtle px-2.5 py-1 text-xs font-semibold text-text-muted"
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

const buildDraftWikiCardStyle = (wiki: MyPageWikiListItem): CSSProperties | undefined => {
  if (wiki.imageUrl) {
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
