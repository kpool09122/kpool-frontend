"use client";

import type { IdentitySummary } from "../identityApi";
import { useState } from "react";

import { useI18n } from "../i18n/I18nProvider";
import {
  createWikiPrincipal,
  getAccountIdentifierFromIdentity,
  getCurrentWikiPrincipal,
  type WikiPrincipalState,
} from "../wiki/wikiPrincipal";

type MyPageSection = "overview" | "wiki";

export type MyPagePrincipalAdapter = {
  createPrincipal: typeof createWikiPrincipal;
  getCurrentPrincipal: typeof getCurrentWikiPrincipal;
};

type MyPageClientProps = {
  initialIdentity: IdentitySummary | null;
  principalAdapter?: MyPagePrincipalAdapter;
};

const defaultPrincipalAdapter: MyPagePrincipalAdapter = {
  createPrincipal: createWikiPrincipal,
  getCurrentPrincipal: getCurrentWikiPrincipal,
};

const selectedSectionClass =
  "border-brand-primary bg-brand-highlight text-text-strong shadow-soft";
const idleSectionClass =
  "border-stroke-subtle bg-surface-raised text-text-muted hover:border-brand-primary/40 hover:text-text-strong";

const isActionPending = (state: WikiPrincipalState): boolean =>
  state.status === "loading";

export function MyPageClient({
  initialIdentity,
  principalAdapter = defaultPrincipalAdapter,
}: MyPageClientProps) {
  const { dictionary } = useI18n();
  const t = dictionary.mypage;
  const [selectedSection, setSelectedSection] = useState<MyPageSection>("overview");
  const [principalState, setPrincipalState] = useState<WikiPrincipalState>({
    status: "idle",
  });
  const accountIdentifier = getAccountIdentifierFromIdentity(initialIdentity);

  const loadCurrentPrincipal = async () => {
    setPrincipalState({ status: "loading" });
    setPrincipalState(await principalAdapter.getCurrentPrincipal());
  };

  const selectWiki = () => {
    setSelectedSection("wiki");

    if (principalState.status === "idle") {
      void loadCurrentPrincipal();
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
    setPrincipalState(
      await principalAdapter.createPrincipal({
        identityIdentifier: initialIdentity.identityIdentifier,
        accountIdentifier,
      }),
    );
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-surface-base px-6 py-8 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside
          aria-label={t.sidebarLabel}
          className="rounded-lg border border-stroke-subtle bg-surface-raised p-3 shadow-soft"
        >
          <nav className="grid gap-2">
            <button
              type="button"
              className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${
                selectedSection === "overview" ? selectedSectionClass : idleSectionClass
              }`}
              aria-current={selectedSection === "overview" ? "page" : undefined}
              onClick={() => setSelectedSection("overview")}
            >
              {t.overviewMenu}
            </button>
            <button
              type="button"
              className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${
                selectedSection === "wiki" ? selectedSectionClass : idleSectionClass
              }`}
              aria-current={selectedSection === "wiki" ? "page" : undefined}
              onClick={selectWiki}
            >
              {t.wikiMenu}
            </button>
          </nav>
        </aside>

        <section className="min-w-0 space-y-6">
          <header className="space-y-3">
            <p className="text-sm font-semibold uppercase text-brand-primary">
              {t.eyebrow}
            </p>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="max-w-3xl text-sm leading-7 text-text-muted">
              {t.description}
            </p>
          </header>

          {selectedSection === "overview" ? (
            <div className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
              <h2 className="text-xl font-semibold">{t.overviewTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-text-muted">
                {t.overviewDescription}
              </p>
            </div>
          ) : (
            <WikiPrincipalPanel
              accountIdentifier={accountIdentifier}
              isAuthenticated={initialIdentity !== null}
              isPending={isActionPending(principalState)}
              state={principalState}
              t={t}
              onActivate={() => void activateWikiPrincipal()}
              onRetry={() => void loadCurrentPrincipal()}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function WikiPrincipalPanel({
  accountIdentifier,
  isAuthenticated,
  isPending,
  state,
  t,
  onActivate,
  onRetry,
}: {
  accountIdentifier: string | null;
  isAuthenticated: boolean;
  isPending: boolean;
  state: WikiPrincipalState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onActivate: () => void;
  onRetry: () => void;
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
      <div className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
        <h2 className="text-xl font-semibold">{t.wikiAvailableTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">
          {t.wikiAvailableMessage}
        </p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-surface-base p-4">
            <dt className="font-semibold text-text-muted">{t.principalIdLabel}</dt>
            <dd className="mt-1 break-all text-text-strong">
              {state.principal.principalIdentifier}
            </dd>
          </div>
          <div className="rounded-lg bg-surface-base p-4">
            <dt className="font-semibold text-text-muted">{t.principalStatusLabel}</dt>
            <dd className="mt-1 text-text-strong">
              {state.principal.isEnabled ? t.principalEnabled : t.principalDisabled}
            </dd>
          </div>
        </dl>
      </div>
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
