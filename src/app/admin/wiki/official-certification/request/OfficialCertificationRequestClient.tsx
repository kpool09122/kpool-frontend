"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type KeyboardEvent, useMemo, useState } from "react";

import { buildWikiPath } from "@kpool/wiki";
import {
  getAccountCategoryFromIdentity,
  getAccountIdentifierFromIdentity,
} from "@/gateways/account/accountIdentity";
import {
  createOfficialCertificationRequestBody,
  createSyncOwnedWikiCertificationsRequestBody,
  type OfficialCertificationListItem,
} from "@/gateways/wiki/officialCertification";
import {
  fetchTranslationSetMasterSearch,
  type TranslationSetMasterSearchDisplayItem,
} from "@/gateways/wiki/translationSetMasterSearchBrowserApi";
import { getOfficialCertificationRequestResourceTypesForAccountCategory } from "@/gateways/wiki/wikiPrincipal";
import { adminQueryKeys } from "../../../queryKeys";
import { useAdmin } from "../../../AdminProvider";
import { useWikiSection } from "../../WikiSectionProvider";

type RequestState = {
  error: string | null;
  selectedTranslationSet: TranslationSetMasterSearchDisplayItem | null;
  success: string | null;
};

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; items: TranslationSetMasterSearchDisplayItem[] }
  | { status: "error"; message: string };

const chipClassName =
  "inline-flex max-w-full items-center gap-1.5 rounded-full border border-stroke-subtle bg-surface-raised px-2.5 py-1 text-xs font-semibold text-text-strong";
const statusErrorClassName =
  "rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800";
const statusSuccessClassName =
  "rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800";
const cardClassName = "rounded-xl border border-stroke-subtle bg-surface-base p-4";

type WikiLike = OfficialCertificationListItem["wikis"][number];

const getWikiName = (wiki: WikiLike | undefined): string => wiki?.name ?? "Wiki";
const getWikiMeta = (wiki: WikiLike | undefined): string => [wiki?.resourceType, wiki?.slug].filter(Boolean).join(" / ");
const getPrimaryCertification = (certifications: OfficialCertificationListItem[]): OfficialCertificationListItem | null =>
  certifications.find((certification) => certification.status === "approved") ?? certifications[0] ?? null;
const isAdditionalCandidate = (wiki: WikiLike): boolean => wiki.resourceType === "group" || wiki.resourceType === "song";

function OfficialCertificationWikiTitle({
  locale,
  wikis,
}: {
  locale: string;
  wikis: WikiLike[];
}) {
  const displayWiki = wikis.find((wiki) => wiki.language === locale) ?? wikis[0];
  const displayName = getWikiName(displayWiki);
  const linkableWikis = wikis.filter((wiki) => wiki.slug && wiki.language);

  if (linkableWikis.length === 0) {
    return <h3 className="mt-2 text-lg font-semibold text-text-strong">{displayName}</h3>;
  }

  return (
    <h3 className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lg font-semibold text-text-strong">
      <span className="break-words">{displayName}</span>
      <span className="flex flex-wrap gap-1 text-base font-semibold text-text-muted">
        <span aria-hidden="true">(</span>
        {linkableWikis.map((wiki, index) => (
          <span className="flex gap-1" key={wiki.wikiIdentifier}>
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            <Link
              className="text-brand-primary transition hover:brightness-110"
              href={buildWikiPath(wiki.language, wiki.slug)}
              rel="noopener noreferrer"
              target="_blank"
            >
              {wiki.language}
            </Link>
          </span>
        ))}
        <span aria-hidden="true">)</span>
      </span>
    </h3>
  );
}

export function OfficialCertificationRequestClient() {
  const queryClient = useQueryClient();
  const { currentIdentity, locale, t } = useAdmin();
  const { officialCertificationAdapter } = useWikiSection();
  const ownerAccountId = getAccountIdentifierFromIdentity(currentIdentity);
  const identityIdentifier = (currentIdentity as { identityIdentifier?: string } | null)?.identityIdentifier ?? null;
  const accountCategory = getAccountCategoryFromIdentity(currentIdentity);
  const requestResourceTypes = getOfficialCertificationRequestResourceTypesForAccountCategory(accountCategory);
  const [keyword, setKeyword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const [selectedAdditionalIds, setSelectedAdditionalIds] = useState<Set<string>>(new Set());
  const [state, setState] = useState<RequestState>({
    error: null,
    selectedTranslationSet: null,
    success: null,
  });
  const resourceType = requestResourceTypes[0];
  const selectedTranslationSetId = state.selectedTranslationSet?.translationSetIdentifier ?? null;
  const canSubmit = Boolean(ownerAccountId) && Boolean(resourceType) && Boolean(selectedTranslationSetId);
  const selectedIds = useMemo(
    () => new Set(selectedTranslationSetId ? [selectedTranslationSetId] : []),
    [selectedTranslationSetId],
  );

  const approvedQueryKey = adminQueryKeys.officialCertifications.myList({ identityIdentifier, status: "approved" });
  const pendingQueryKey = adminQueryKeys.officialCertifications.myList({ identityIdentifier, status: "pending" });
  const ownedWikisQueryKey = adminQueryKeys.officialCertifications.ownedWikis(identityIdentifier);
  const approvedQuery = useQuery({
    enabled: requestResourceTypes.length > 0,
    queryFn: () => officialCertificationAdapter.listMyOfficialCertifications({
      fallbackErrorMessage: t.officialCertificationMyListLoadFailed,
      perPage: 100,
      status: "approved",
    }),
    queryKey: approvedQueryKey,
    retry: false,
  });
  const pendingQuery = useQuery({
    enabled: requestResourceTypes.length > 0,
    queryFn: () => officialCertificationAdapter.listMyOfficialCertifications({
      fallbackErrorMessage: t.officialCertificationMyListLoadFailed,
      perPage: 100,
      status: "pending",
    }),
    queryKey: pendingQueryKey,
    retry: false,
  });
  const ownedWikisQuery = useQuery({
    enabled: requestResourceTypes.length > 0,
    queryFn: () => officialCertificationAdapter.listMyOwnedWikis({
      fallbackErrorMessage: t.officialCertificationOwnedWikisLoadFailed,
      perPage: 100,
    }),
    queryKey: ownedWikisQueryKey,
    retry: false,
  });

  const approvedCertifications = useMemo(
    () => approvedQuery.data?.officialCertifications ?? [],
    [approvedQuery.data?.officialCertifications],
  );
  const pendingCertifications = useMemo(
    () => pendingQuery.data?.officialCertifications ?? [],
    [pendingQuery.data?.officialCertifications],
  );
  const primaryCertification = getPrimaryCertification(approvedCertifications);
  const alreadyCertifiedIds = useMemo(
    () => new Set(approvedCertifications.map((certification) => certification.translationSetIdentifier)),
    [approvedCertifications],
  );
  const candidateWikis = useMemo(() => {
    const allOwnedWikis = [
      ...(ownedWikisQuery.data?.primaryOwnedWikis ?? []),
      ...(ownedWikisQuery.data?.otherOwnedWikis ?? []),
    ];
    const byTranslationSet = new Map<string, WikiLike>();
    for (const wiki of allOwnedWikis) {
      if (isAdditionalCandidate(wiki) && !byTranslationSet.has(wiki.translationSetIdentifier)) {
        byTranslationSet.set(wiki.translationSetIdentifier, wiki);
      }
    }
    return Array.from(byTranslationSet.values());
  }, [ownedWikisQuery.data]);
  const hasPendingRequest = pendingCertifications.length > 0;
  const isInitialLoading = approvedQuery.isLoading || pendingQuery.isLoading || ownedWikisQuery.isLoading;
  const loadError = approvedQuery.error ?? pendingQuery.error ?? ownedWikisQuery.error;

  const requestMutation = useMutation({
    mutationFn: () => {
      if (!resourceType || !state.selectedTranslationSet) {
        return Promise.reject(new Error(t.officialCertificationRequestUnavailable));
      }

      return officialCertificationAdapter.requestOfficialCertification({
        fallbackErrorMessage: t.officialCertificationRequestFailed,
        requestBody: createOfficialCertificationRequestBody({
          resourceType,
          translationSetIdentifier: state.selectedTranslationSet.translationSetIdentifier,
        }),
      });
    },
    onMutate: () => setState((current) => ({ ...current, error: null, success: null })),
    onSuccess: (summary) => {
      setState((current) => ({
        ...current,
        error: null,
        success: t.officialCertificationRequestSucceeded(summary.status),
      }));
      void queryClient.invalidateQueries({ queryKey: pendingQueryKey });
    },
    onError: (error) => setState((current) => ({
      ...current,
      error: error instanceof Error ? error.message : t.officialCertificationRequestFailed,
      success: null,
    })),
  });
  const syncMutation = useMutation({
    mutationFn: () => officialCertificationAdapter.syncOwnedWikiCertifications({
      fallbackErrorMessage: t.officialCertificationOwnedWikisSyncFailed,
      requestBody: createSyncOwnedWikiCertificationsRequestBody([
        ...approvedCertifications.map((certification) => certification.translationSetIdentifier),
        ...selectedAdditionalIds,
      ]),
    }),
    onMutate: () => setState((current) => ({ ...current, error: null, success: null })),
    onSuccess: (response) => {
      setState((current) => ({
        ...current,
        error: null,
        success: t.officialCertificationOwnedWikisSyncSucceeded(response.approved.length + response.unchanged.length),
      }));
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: approvedQueryKey }),
        queryClient.invalidateQueries({ queryKey: ownedWikisQueryKey }),
      ]);
    },
    onError: (error) => setState((current) => ({
      ...current,
      error: error instanceof Error ? error.message : t.officialCertificationOwnedWikisSyncFailed,
      success: null,
    })),
  });

  const searchTranslationSets = () => {
    const trimmedKeyword = keyword.trim();

    if (!resourceType) return;
    if (!trimmedKeyword) {
      setIsOpen(true);
      setSearchState({ status: "error", message: t.officialCertificationSearchKeywordRequired });
      return;
    }

    setIsOpen(true);
    setSearchState({ status: "loading" });

    void fetchTranslationSetMasterSearch({
      fallbackErrorMessage: t.officialCertificationSearchFailed,
      keyword: trimmedKeyword,
      locale,
      resourceType,
    }).then((response) => {
      setSearchState({ status: "success", items: response.translationSetMasters });
    }).catch((error: unknown) => {
      console.error("Failed to search translation set masters", error);
      setSearchState({
        status: "error",
        message: error instanceof Error ? error.message : t.officialCertificationSearchFailed,
      });
    });
  };

  const selectTranslationSet = (item: TranslationSetMasterSearchDisplayItem) => {
    setState((current) => ({ ...current, selectedTranslationSet: item }));
    setKeyword(item.displayWiki.name);
    setIsOpen(false);
  };

  const submitRequest = () => {
    if (!canSubmit) {
      setState((current) => ({ ...current, error: t.officialCertificationRequestUnavailable, success: null }));
      return;
    }
    requestMutation.mutate();
  };
  const toggleAdditionalWiki = (translationSetIdentifier: string) => {
    setSelectedAdditionalIds((current) => {
      const next = new Set(current);
      if (next.has(translationSetIdentifier)) next.delete(translationSetIdentifier);
      else next.add(translationSetIdentifier);
      return next;
    });
  };

  return (
    <section className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-strong">{t.officialCertificationRequestTitle}</h2>
        <p className="text-sm leading-7 text-text-muted">{t.officialCertificationRequestDescription}</p>
      </div>
      {requestResourceTypes.length === 0 ? (
        <p role="alert" className="mt-5 rounded-lg border border-stroke-subtle bg-surface-base p-4 text-sm text-text-muted">
          {t.officialCertificationGeneralAccountMessage}
        </p>
      ) : isInitialLoading ? (
        <p className="mt-5 rounded-lg border border-stroke-subtle bg-surface-base p-4 text-sm text-text-muted">
          {t.officialCertificationManagementLoading}
        </p>
      ) : loadError ? (
        <p role="alert" className={`${statusErrorClassName} mt-5`}>
          {loadError instanceof Error ? loadError.message : t.officialCertificationMyListLoadFailed}
        </p>
      ) : (
        <div className="mt-6 grid gap-5">
          {primaryCertification ? (
            <div className={cardClassName}>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t.officialCertificationApprovedPrimaryTitle}</p>
              <OfficialCertificationWikiTitle locale={locale} wikis={primaryCertification.wikis} />
            </div>
          ) : hasPendingRequest ? (
            <div className={cardClassName}>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t.officialCertificationPendingTitle}</p>
              <h3 className="mt-2 text-lg font-semibold text-text-strong">{getWikiName(pendingCertifications[0]?.wikis[0])}</h3>
              <p className="mt-3 text-sm text-text-muted">{t.officialCertificationPendingDescription}</p>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitRequest();
              }}
            >
              {resourceType ? (
                <div className="grid min-w-0 self-start gap-2 text-sm font-semibold text-text-strong">
                  <label className="grid min-w-0 gap-2">
                    {t.officialCertificationWikiSearchLabel}
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-1.5">
                      <input
                        aria-label={`${t.officialCertificationWikiSearchLabel} keyword`}
                        className="h-9 min-w-0 rounded-lg border border-stroke-subtle bg-surface-raised px-2.5 text-sm"
                        disabled={requestMutation.isPending || searchState.status === "loading"}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setKeyword(nextValue);
                          if (nextValue.trim() === "") setState((current) => ({ ...current, selectedTranslationSet: null }));
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            searchTranslationSets();
                          }
                        }}
                        placeholder={t.officialCertificationWikiSearchPlaceholder}
                        value={keyword}
                      />
                      <button
                        className="h-9 w-14 shrink-0 whitespace-nowrap rounded-lg border border-stroke-subtle px-2 text-xs font-semibold text-text-strong disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={requestMutation.isPending || searchState.status === "loading"}
                        onClick={searchTranslationSets}
                        type="button"
                      >
                        {searchState.status === "loading" ? t.officialCertificationSearching : t.officialCertificationSearch}
                      </button>
                    </div>
                  </label>
                  {state.selectedTranslationSet ? (
                    <div className="flex min-w-0 max-w-full flex-wrap gap-1.5" aria-label={`${t.officialCertificationWikiSearchLabel} selected`}>
                      <span className={chipClassName}>
                        <span className="min-w-0 truncate">{state.selectedTranslationSet.displayWiki.name}</span>
                        <button
                          aria-label={`${state.selectedTranslationSet.displayWiki.name} を削除`}
                          className="shrink-0 text-text-muted hover:text-status-danger"
                          disabled={requestMutation.isPending}
                          onClick={() => setState((current) => ({ ...current, selectedTranslationSet: null }))}
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ) : null}
                  {isOpen && searchState.status === "loading" ? (
                    <p className="min-w-0 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-3 text-sm text-text-muted">
                      {t.officialCertificationSearchLoading}
                    </p>
                  ) : null}
                  {isOpen && searchState.status === "error" ? (
                    <p className="min-w-0 rounded-xl border border-status-danger/40 bg-surface-base px-3 py-3 text-sm font-semibold text-status-danger" role="alert">
                      {searchState.message}
                    </p>
                  ) : null}
                  {isOpen && searchState.status === "success" && searchState.items.length === 0 ? (
                    <p className="min-w-0 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-3 text-sm text-text-muted">
                      {t.officialCertificationSearchEmpty}
                    </p>
                  ) : null}
                  {isOpen && searchState.status === "success" && searchState.items.length > 0 ? (
                    <ul className="min-w-0 max-h-56 overflow-auto rounded-xl border border-stroke-subtle bg-surface-raised p-2 shadow-soft">
                      {searchState.items.map((item) => (
                        <li key={item.translationSetIdentifier}>
                          <button
                            className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={requestMutation.isPending || selectedIds.has(item.translationSetIdentifier)}
                            onClick={() => selectTranslationSet(item)}
                            type="button"
                          >
                            <span className="min-w-0 truncate">{item.displayWiki.name}</span>
                            <span className="shrink-0 text-xs text-text-muted">{item.displayWiki.slug}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              <button
                className="w-fit rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSubmit || requestMutation.isPending}
                type="submit"
              >
                {requestMutation.isPending ? t.officialCertificationSubmitting : t.officialCertificationSubmit}
              </button>
            </form>
          )}
          {primaryCertification ? (
            <div className={cardClassName}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-text-strong">{t.officialCertificationAdditionalTitle}</h3>
                  <p className="text-sm text-text-muted">{t.officialCertificationAdditionalDescription}</p>
                </div>
                <button
                  className="w-fit shrink-0 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={syncMutation.isPending || candidateWikis.length === 0}
                  onClick={() => syncMutation.mutate()}
                  type="button"
                >
                  {syncMutation.isPending ? t.officialCertificationOwnedWikisSyncing : t.officialCertificationOwnedWikisSync}
                </button>
              </div>
              {candidateWikis.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">{t.officialCertificationAdditionalEmpty}</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {candidateWikis.map((wiki) => {
                    const checked = alreadyCertifiedIds.has(wiki.translationSetIdentifier) || selectedAdditionalIds.has(wiki.translationSetIdentifier);
                    const disabled = alreadyCertifiedIds.has(wiki.translationSetIdentifier) || syncMutation.isPending;

                    return (
                      <label key={wiki.translationSetIdentifier} className="flex items-start gap-3 rounded-lg border border-stroke-subtle bg-surface-raised p-3 text-sm">
                        <input
                          checked={checked}
                          className="mt-1"
                          disabled={disabled}
                          onChange={() => toggleAdditionalWiki(wiki.translationSetIdentifier)}
                          type="checkbox"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-text-strong">{getWikiName(wiki)}</span>
                          <span className="block text-xs text-text-muted">{getWikiMeta(wiki)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
          {state.error ? <p role="alert" className={statusErrorClassName}>{state.error}</p> : null}
          {state.success ? <p role="status" className={statusSuccessClassName}>{state.success}</p> : null}
        </div>
      )}
    </section>
  );
}
