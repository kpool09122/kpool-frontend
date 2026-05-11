"use client";

import type { IdentitySummary } from "../identityApi";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useRef, useState } from "react";

import { useI18n } from "../i18n/I18nProvider";
import {
  createWikiPrincipal,
  getAccountIdentifierFromIdentity,
  getCurrentWikiPrincipal,
  type WikiPrincipalState,
} from "../wiki/wikiPrincipal";
import {
  defaultWikiImagePerPage,
  fetchWikiDraftImages,
  type WikiDraftImage,
  type WikiDraftImageListResponse,
} from "../wiki/wikiImages";

type MyPageWikiTab = "draftImages";

export type DraftImageListState = {
  images: WikiDraftImage[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  pageInfo: Pick<WikiDraftImageListResponse, "current_page" | "last_page" | "total"> | null;
};

export type MyPagePrincipalAdapter = {
  createPrincipal: typeof createWikiPrincipal;
  getCurrentPrincipal: typeof getCurrentWikiPrincipal;
};

export type MyPageDraftImageAdapter = {
  listDraftImages: typeof fetchWikiDraftImages;
};

type MyPageClientProps = {
  initialIdentity: IdentitySummary | null;
  initialDraftImages?: DraftImageListState;
  initialPrincipalState?: WikiPrincipalState;
  draftImageAdapter?: MyPageDraftImageAdapter;
  principalAdapter?: MyPagePrincipalAdapter;
};

const defaultPrincipalAdapter: MyPagePrincipalAdapter = {
  createPrincipal: createWikiPrincipal,
  getCurrentPrincipal: getCurrentWikiPrincipal,
};

const defaultDraftImageAdapter: MyPageDraftImageAdapter = {
  listDraftImages: fetchWikiDraftImages,
};

const initialDraftImageListState: DraftImageListState = {
  images: [],
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
};

const selectedSectionClass = "bg-brand-highlight/70 text-text-strong";

const isActionPending = (state: WikiPrincipalState): boolean =>
  state.status === "loading";

export function MyPageClient({
  draftImageAdapter = defaultDraftImageAdapter,
  initialDraftImages = initialDraftImageListState,
  initialIdentity,
  initialPrincipalState = { status: "idle" },
  principalAdapter = defaultPrincipalAdapter,
}: MyPageClientProps) {
  const { dictionary } = useI18n();
  const t = dictionary.mypage;
  const [selectedWikiTab, setSelectedWikiTab] = useState<MyPageWikiTab>("draftImages");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [principalState, setPrincipalState] =
    useState<WikiPrincipalState>(initialPrincipalState);
  const [draftImages, setDraftImages] = useState<DraftImageListState>(initialDraftImages);
  const hasQueuedInitialPrincipalLoad = useRef(false);
  const accountIdentifier = getAccountIdentifierFromIdentity(initialIdentity);

  const loadDraftImagesPage = async (page: number) => {
    setDraftImages((state) => ({
      ...state,
      isInitialLoading: page === 1,
      isLoadingMore: page > 1,
      loadError: null,
    }));

    try {
      const imagePage = await draftImageAdapter.listDraftImages({
        fallbackErrorMessage: t.draftImageListLoadFailed,
        page,
        perPage: defaultWikiImagePerPage,
        status: "under_review",
      });

      setDraftImages((state) => ({
        ...state,
        images: page === 1 ? imagePage.images : [...state.images, ...imagePage.images],
        isInitialLoading: false,
        isLoadingMore: false,
        pageInfo: {
          current_page: imagePage.current_page,
          last_page: imagePage.last_page,
          total: imagePage.total,
        },
      }));
    } catch (error) {
      setDraftImages((state) => ({
        ...state,
        isInitialLoading: false,
        isLoadingMore: false,
        loadError:
          error instanceof Error ? error.message : t.draftImageListLoadFailed,
      }));
    }
  };

  const loadCurrentPrincipal = async () => {
    setPrincipalState({ status: "loading" });
    const nextState = await principalAdapter.getCurrentPrincipal();

    setPrincipalState(nextState);

    if (nextState.status === "available") {
      await loadDraftImagesPage(1);
    }
  };

  const activateWikiPrincipal = async () => {
    if (!initialIdentity) {
      setPrincipalState({
        status: "error",
        message: t.identityUnavailableMessage,
      });
      return;
    }

    if (!accountIdentifier) {
      setPrincipalState({
        status: "error",
        message: t.accountUnavailableMessage,
      });
      return;
    }

    setPrincipalState({ status: "loading" });
    const nextState = await principalAdapter.createPrincipal({
      identityIdentifier: initialIdentity.identityIdentifier,
      accountIdentifier,
    });

    setPrincipalState(nextState);

    if (nextState.status === "available") {
      await loadDraftImagesPage(1);
    }
  };

  if (principalState.status === "idle" && !hasQueuedInitialPrincipalLoad.current) {
    hasQueuedInitialPrincipalLoad.current = true;
    queueMicrotask(() => {
      void loadCurrentPrincipal();
    });
  }

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
            accountIdentifier={accountIdentifier}
            draftImages={draftImages}
            isAuthenticated={initialIdentity !== null}
            isPending={isActionPending(principalState)}
            selectedWikiTab={selectedWikiTab}
            state={principalState}
            t={t}
            onActivate={() => void activateWikiPrincipal()}
            onLoadDraftImagesPage={(page) => void loadDraftImagesPage(page)}
            onRetry={() => void loadCurrentPrincipal()}
            onSelectWikiTab={setSelectedWikiTab}
          />
        </section>
      </div>
    </main>
  );
}

function WikiPrincipalPanel({
  accountIdentifier,
  draftImages,
  isAuthenticated,
  isPending,
  selectedWikiTab,
  state,
  t,
  onActivate,
  onLoadDraftImagesPage,
  onRetry,
  onSelectWikiTab,
}: {
  accountIdentifier: string | null;
  draftImages: DraftImageListState;
  isAuthenticated: boolean;
  isPending: boolean;
  selectedWikiTab: MyPageWikiTab;
  state: WikiPrincipalState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onActivate: () => void;
  onLoadDraftImagesPage: (page: number) => void;
  onRetry: () => void;
  onSelectWikiTab: (tab: MyPageWikiTab) => void;
}) {
  const canActivate = isAuthenticated && accountIdentifier !== null && !isPending;

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
    return (
      <section className="space-y-5">
        <div className="overflow-x-auto border-b border-stroke-subtle">
          <div aria-label={t.wikiTabsLabel} className="-mb-px flex gap-1" role="tablist">
            <button
              aria-selected={selectedWikiTab === "draftImages"}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                selectedWikiTab === "draftImages"
                  ? "border-brand-primary text-text-strong"
                  : "border-transparent text-text-muted hover:border-stroke-subtle hover:text-text-strong"
              }`}
              onClick={() => {
                onSelectWikiTab("draftImages");
                onLoadDraftImagesPage(1);
              }}
              role="tab"
              type="button"
            >
              {t.draftImagesTab}
            </button>
          </div>
        </div>
        {selectedWikiTab === "draftImages" ? (
          <DraftImageListPanel
            state={draftImages}
            t={t}
            onLoadMore={() => {
              if (draftImages.pageInfo) {
                onLoadDraftImagesPage(draftImages.pageInfo.current_page + 1);
              }
            }}
            onReload={() => onLoadDraftImagesPage(1)}
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

function DraftImageListPanel({
  state,
  t,
  onLoadMore,
  onReload,
}: {
  state: DraftImageListState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onLoadMore: () => void;
  onReload: () => void;
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
      <div className="grid gap-4 md:grid-cols-2">
        {state.images.map((image) => (
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
            <div className="grid gap-3 p-4 text-sm">
              <div>
                <p className="font-semibold">{image.altText || t.draftImageNoAltText}</p>
                <p className="mt-1 break-all text-text-muted">{image.imageIdentifier}</p>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                <DraftImageMeta label={t.draftImageResourceTypeLabel} value={image.resourceType} />
                <DraftImageMeta label={t.draftImageUsageLabel} value={image.imageUsage} />
                <DraftImageMeta label={t.draftImageWikiIdentifierLabel} value={image.wikiIdentifier} />
                <DraftImageMeta label={t.draftImageStatusLabel} value={image.status} />
                <DraftImageMeta
                  label={t.draftImageUploadedAtLabel}
                  value={formatDraftImageDate(image.uploadedAt)}
                />
              </dl>
            </div>
          </article>
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
            {state.isLoadingMore ? t.draftImageListLoadingMore : t.loadMoreDraftImages}
          </button>
        ) : (
          <p className="text-sm font-semibold text-text-muted">{t.allDraftImagesLoaded}</p>
        )}
      </div>
    </div>
  );
}

function DraftImageMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-semibold text-text-muted">{label}</dt>
      <dd className="mt-1 break-all text-text-strong">{value}</dd>
    </div>
  );
}

const formatDraftImageDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
