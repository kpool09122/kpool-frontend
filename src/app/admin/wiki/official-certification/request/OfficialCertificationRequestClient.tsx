"use client";

import { LocalizedForm } from "@/components/LocalizedForm";
import { useI18n } from "@/i18n/I18nProvider";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";

import { buildWikiPath } from "@kpool/wiki";
import {
  getAccountCategoryFromIdentity,
  getAccountIdentifierFromIdentity,
} from "@/gateways/account/accountIdentity";
import {
  createOfficialCertificationRequestBody,
  createSyncOwnedWikiCertificationsRequestBody,
  type OfficialCertificationListItem,
  type RelatedWikisResourceType,
} from "@/gateways/wiki/officialCertification";
import {
  fetchTranslationSetMasterSearch,
  type TranslationSetMasterSearchDisplayItem,
} from "@/gateways/wiki/translationSetMasterSearchBrowserApi";
import { canManageOfficialCertifications, getOfficialCertificationPermissions, type OfficialCertificationPermissions } from "@/gateways/wiki/wikiPrincipal";
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
  "rounded-lg border border-status-danger bg-status-danger/10 p-3 text-sm font-semibold text-status-danger";
const statusSuccessClassName =
  "rounded-lg border border-status-success bg-status-success/10 p-3 text-sm font-semibold text-status-success";
const cardClassName = "rounded-xl border border-stroke-subtle bg-surface-base p-4";

type WikiLike = OfficialCertificationListItem["wikis"][number];
type AdditionalCandidateRow = {
  displayWiki: WikiLike;
  translationSetIdentifier: string;
  wikis: WikiLike[];
};

const getWikiName = (wiki: WikiLike | undefined): string => wiki?.name ?? "Wiki";
const getPrimaryCertification = (certifications: OfficialCertificationListItem[]): OfficialCertificationListItem | null =>
  certifications.find((certification) => certification.status === "approved") ?? certifications[0] ?? null;
const isAdditionalCandidate = (wiki: WikiLike): boolean => wiki.resourceType === "group" || wiki.resourceType === "song";
const getRelatedWikisResourceType = (resourceType: string | undefined): RelatedWikisResourceType | null =>
  resourceType === "agency" || resourceType === "talent" ? resourceType : null;
const languageDisplayOrder = ["en", "ja", "ko"];
const sortWikisByLanguage = (wikis: WikiLike[]): WikiLike[] =>
  [...wikis].sort((left, right) => {
    const leftIndex = languageDisplayOrder.indexOf(left.language);
    const rightIndex = languageDisplayOrder.indexOf(right.language);
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? languageDisplayOrder.length : leftIndex)
        - (rightIndex === -1 ? languageDisplayOrder.length : rightIndex);
    }
    return left.language.localeCompare(right.language);
  });

function OfficialCertificationWikiLanguageLinks({
  className,
  wikis,
}: {
  className: string;
  wikis: WikiLike[];
}) {
  const linkableWikis = sortWikisByLanguage(wikis.filter((wiki) => wiki.slug && wiki.language));

  if (linkableWikis.length === 0) {
    return null;
  }

  return (
    <span className={className}>
      <span aria-hidden="true">(</span>
      {linkableWikis.map((wiki, index) => (
        <span className="flex gap-1" key={wiki.wikiIdentifier}>
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          <Link
            className="text-brand-primary transition hover:brightness-110"
            href={buildWikiPath(wiki.language, wiki.slug)}
            onClick={(event) => event.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
          >
            {wiki.language}
          </Link>
        </span>
      ))}
      <span aria-hidden="true">)</span>
    </span>
  );
}

function OfficialCertificationWikiTitle({
  locale,
  wikis,
}: {
  locale: string;
  wikis: WikiLike[];
}) {
  const displayWiki = wikis.find((wiki) => wiki.language === locale) ?? wikis[0];
  const displayName = getWikiName(displayWiki);

  return (
    <h3 className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lg font-semibold text-text-strong">
      <span className="break-words">{displayName}</span>
      <OfficialCertificationWikiLanguageLinks
        className="flex flex-wrap gap-1 text-base font-semibold text-text-muted"
        wikis={wikis}
      />
    </h3>
  );
}

export function OfficialCertificationRequestClient() {
  const { currentIdentity } = useAdmin();
  const accountCategory = getAccountCategoryFromIdentity(currentIdentity);
  const { principalState } = useWikiSection();
  if (principalState.status !== "available" || !canManageOfficialCertifications(principalState.principal)) return null;

  return <OfficialCertificationManagementContent
    accountCategory={accountCategory}
    key={accountCategory}
    permissions={getOfficialCertificationPermissions(principalState.principal)}
  />;
}

function OfficialCertificationManagementContent({ accountCategory, permissions }: {
  accountCategory: string | null;
  permissions: OfficialCertificationPermissions;
}) {
  const { dictionary } = useI18n();
  const queryClient = useQueryClient();
  const { currentIdentity, locale, t } = useAdmin();
  const { officialCertificationAdapter } = useWikiSection();
  const ownerAccountId = getAccountIdentifierFromIdentity(currentIdentity);
  const identityIdentifier = (currentIdentity as { identityIdentifier?: string } | null)?.identityIdentifier ?? null;
  const { canRead, canSyncOwnedWikis, requestResourceTypes, relatedResourceTypes } = permissions;
  const canLoadOwnedWikis = canRead || canSyncOwnedWikis || relatedResourceTypes.length > 0;
  const [keyword, setKeyword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const searchVersion = useRef(0);
  const [additionalSelectionOverrides, setAdditionalSelectionOverrides] = useState<Map<string, boolean>>(new Map());
  const [state, setState] = useState<RequestState>({
    error: null,
    selectedTranslationSet: null,
    success: null,
  });
  const resourceType = (accountCategory === "agency" || accountCategory === "talent")
    && requestResourceTypes.includes(accountCategory) ? accountCategory : null;
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
    enabled: canRead,
    queryFn: () => officialCertificationAdapter.listMyOfficialCertifications({
      fallbackErrorMessage: t.officialCertificationMyListLoadFailed,
      perPage: 100,
      status: "approved",
    }),
    queryKey: approvedQueryKey,
    retry: false,
  });
  const pendingQuery = useQuery({
    enabled: canRead,
    queryFn: () => officialCertificationAdapter.listMyOfficialCertifications({
      fallbackErrorMessage: t.officialCertificationMyListLoadFailed,
      perPage: 100,
      status: "pending",
    }),
    queryKey: pendingQueryKey,
    retry: false,
  });
  const ownedWikisQuery = useQuery({
    enabled: canLoadOwnedWikis,
    queryFn: () => officialCertificationAdapter.listMyOwnedWikis({
      fallbackErrorMessage: t.officialCertificationOwnedWikisLoadFailed,
      perPage: 100,
    }),
    queryKey: ownedWikisQueryKey,
    retry: false,
  });

  const approvedCertifications = useMemo(
    () => canRead ? approvedQuery.data?.officialCertifications ?? [] : [],
    [canRead, approvedQuery.data?.officialCertifications],
  );
  const pendingCertifications = useMemo(
    () => canRead ? pendingQuery.data?.officialCertifications ?? [] : [],
    [canRead, pendingQuery.data?.officialCertifications],
  );
  const primaryCertification = getPrimaryCertification(approvedCertifications);
  const ownedWikis = canLoadOwnedWikis ? ownedWikisQuery.data : undefined;
  const primaryOwnedWikis = ownedWikis?.primaryOwnedWikis ?? [];
  const primaryTranslationSetIdentifier = primaryCertification?.translationSetIdentifier ?? primaryOwnedWikis[0]?.translationSetIdentifier ?? null;
  const primaryWikis = primaryCertification?.wikis ?? primaryOwnedWikis.filter((wiki) => wiki.translationSetIdentifier === primaryTranslationSetIdentifier);
  const hasPrimaryWiki = primaryCertification !== null || primaryWikis.length > 0;
  const primaryRelatedResourceType = getRelatedWikisResourceType(primaryCertification?.resourceType ?? primaryWikis[0]?.resourceType);
  const canListRelatedWikis = primaryRelatedResourceType !== null && relatedResourceTypes.includes(primaryRelatedResourceType);
  const relatedWikisQueryKey = adminQueryKeys.officialCertifications.relatedWikis({
    identityIdentifier,
    resourceType: primaryRelatedResourceType,
    translationSetIdentifier: primaryTranslationSetIdentifier,
  });
  const relatedWikisQuery = useQuery({
    enabled: canListRelatedWikis && Boolean(primaryTranslationSetIdentifier),
    queryFn: () => officialCertificationAdapter.listRelatedWikis({
      fallbackErrorMessage: t.officialCertificationOwnedWikisLoadFailed,
      resourceType: primaryRelatedResourceType!,
      translationSetIdentifier: primaryTranslationSetIdentifier!,
    }),
    queryKey: relatedWikisQueryKey,
    retry: false,
  });
  const ownedTranslationSetIds = useMemo(() => {
    const allOwnedWikis = [
      ...(ownedWikis?.primaryOwnedWikis ?? []),
      ...(ownedWikis?.otherOwnedWikis ?? []),
    ];
    return new Set(allOwnedWikis.map((wiki) => wiki.translationSetIdentifier));
  }, [ownedWikis]);
  const candidateWikis = useMemo<AdditionalCandidateRow[]>(() => {
    const byTranslationSet = new Map<string, WikiLike[]>();
    const wikis = [
      ...(canListRelatedWikis ? relatedWikisQuery.data?.wikis ?? [] : []),
      ...(ownedWikis?.otherOwnedWikis ?? []),
    ];
    for (const wiki of wikis) {
      if (!isAdditionalCandidate(wiki)) continue;
      const translations = byTranslationSet.get(wiki.translationSetIdentifier) ?? [];
      if (!translations.some((item) => item.wikiIdentifier === wiki.wikiIdentifier)) translations.push(wiki);
      byTranslationSet.set(wiki.translationSetIdentifier, translations);
    }

    return Array.from(byTranslationSet.entries()).map(([translationSetIdentifier, wikis]) => {
      const displayWiki = wikis.find((wiki) => wiki.language === locale) ?? wikis[0]!;
      return {
        displayWiki,
        translationSetIdentifier,
        wikis,
      };
    });
  }, [locale, canListRelatedWikis, relatedWikisQuery.data?.wikis, ownedWikis?.otherOwnedWikis]);
  const groupedCandidateWikis = useMemo(
    () => (["group", "song"] as const)
      .map((resourceType) => ({
        resourceType,
        rows: candidateWikis.filter((row) => row.displayWiki.resourceType === resourceType),
      }))
      .filter((group) => group.rows.length > 0),
    [candidateWikis],
  );
  const selectedAdditionalIds = useMemo(
    () => candidateWikis
      .filter((row) => additionalSelectionOverrides.get(row.translationSetIdentifier)
        ?? ownedTranslationSetIds.has(row.translationSetIdentifier))
      .map((row) => row.translationSetIdentifier),
    [additionalSelectionOverrides, candidateWikis, ownedTranslationSetIds],
  );
  const isInitialLoading = (canRead && (approvedQuery.isLoading || pendingQuery.isLoading)) || (canLoadOwnedWikis && ownedWikisQuery.isLoading) || (canListRelatedWikis && relatedWikisQuery.isLoading);
  const loadError = (canRead ? approvedQuery.error ?? pendingQuery.error : null) ?? (canLoadOwnedWikis ? ownedWikisQuery.error : null) ?? (canListRelatedWikis ? relatedWikisQuery.error : null);

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
    mutationFn: () => canSyncOwnedWikis ? officialCertificationAdapter.syncOwnedWikiCertifications({
      fallbackErrorMessage: t.officialCertificationOwnedWikisSyncFailed,
      requestBody: createSyncOwnedWikiCertificationsRequestBody(selectedAdditionalIds),
    }) : Promise.reject(new Error(t.officialCertificationRequestUnavailable)),
    onMutate: () => setState((current) => ({ ...current, error: null, success: null })),
    onSuccess: () => {
      setState((current) => ({
        ...current,
        error: null,
        success: t.officialCertificationOwnedWikisSyncSucceeded,
      }));
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: approvedQueryKey }),
        queryClient.invalidateQueries({ queryKey: ownedWikisQueryKey }),
        queryClient.invalidateQueries({ queryKey: relatedWikisQueryKey }),
      ]);
    },
    onError: (error) => setState((current) => ({
      ...current,
      error: error instanceof Error ? error.message : t.officialCertificationOwnedWikisSyncFailed,
      success: null,
    })),
  });
  const hasPendingRequest = pendingCertifications.length > 0 || (!canRead && requestMutation.isSuccess);

  const searchTranslationSets = () => {
    const version = ++searchVersion.current;
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
      if (searchVersion.current !== version) return;
      setSearchState({ status: "success", items: response.translationSetMasters });
    }).catch((error: unknown) => {
      if (searchVersion.current !== version) return;
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
    setAdditionalSelectionOverrides((current) => {
      const currentChecked = current.get(translationSetIdentifier) ?? ownedTranslationSetIds.has(translationSetIdentifier);
      const next = new Map(current);
      next.set(translationSetIdentifier, !currentChecked);
      return next;
    });
  };

  return (
    <section className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-strong">{t.officialCertificationRequestTitle}</h2>
        <p className="text-sm leading-7 text-text-muted">{t.officialCertificationRequestDescription}</p>
      </div>
      {isInitialLoading ? (
        <p className="mt-5 rounded-lg border border-stroke-subtle bg-surface-base p-4 text-sm text-text-muted">
          {t.officialCertificationManagementLoading}
        </p>
      ) : loadError ? (
        <p role="alert" className={`${statusErrorClassName} mt-5`}>
          {loadError instanceof Error ? loadError.message : t.officialCertificationMyListLoadFailed}
        </p>
      ) : (
        <div className="mt-6 grid gap-5">
          {hasPrimaryWiki ? (
            <div className={cardClassName}>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t.officialCertificationApprovedPrimaryTitle}</p>
              <OfficialCertificationWikiTitle locale={locale} wikis={primaryWikis} />
            </div>
          ) : hasPendingRequest ? (
            <div className={cardClassName}>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t.officialCertificationPendingTitle}</p>
              <h3 className="mt-2 text-lg font-semibold text-text-strong">{pendingCertifications[0]?.wikis[0]?.name ?? state.selectedTranslationSet?.displayWiki.name ?? "Wiki"}</h3>
              <p className="mt-3 text-sm text-text-muted">{t.officialCertificationPendingDescription}</p>
            </div>
          ) : resourceType ? (
            <LocalizedForm
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
                        aria-label={`${t.officialCertificationWikiSearchLabel}: ${dictionary.wiki.ui.keyword}`}
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
                    <div className="flex min-w-0 max-w-full flex-wrap gap-1.5" aria-label={`${t.officialCertificationWikiSearchLabel}: ${dictionary.wiki.ui.selected}`}>
                      <span className={chipClassName}>
                        <span className="min-w-0 truncate">{state.selectedTranslationSet.displayWiki.name}</span>
                        <button
                          aria-label={`${dictionary.wiki.ui.remove}: ${state.selectedTranslationSet.displayWiki.name}`}
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
                className="w-fit rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSubmit || requestMutation.isPending}
                type="submit"
              >
                {requestMutation.isPending ? t.officialCertificationSubmitting : t.officialCertificationSubmit}
              </button>
            </LocalizedForm>
          ) : <p className="text-sm text-text-muted">{t.officialCertificationEmpty}</p>}
          {hasPrimaryWiki && (canSyncOwnedWikis || canListRelatedWikis) ? (
            <div className={cardClassName}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-text-strong">{t.officialCertificationAdditionalTitle}</h3>
                  <p className="text-sm text-text-muted">{t.officialCertificationAdditionalDescription}</p>
                </div>
                {canSyncOwnedWikis ? <button
                  className="w-fit shrink-0 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={syncMutation.isPending || candidateWikis.length === 0}
                  onClick={() => syncMutation.mutate()}
                  type="button"
                >
                  {syncMutation.isPending ? t.officialCertificationOwnedWikisSyncing : t.officialCertificationOwnedWikisSync}
                </button> : null}
              </div>
              {candidateWikis.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">{t.officialCertificationAdditionalEmpty}</p>
              ) : (
                <div className="mt-4 grid gap-4">
                  {groupedCandidateWikis.map((group) => (
                    <div className="grid gap-2" key={group.resourceType}>
                      <h4 className="text-sm font-semibold text-text-muted">
                        {t.draftWikiResourceLabels[group.resourceType]}
                      </h4>
                      <div className="grid gap-3">
                        {group.rows.map((wiki) => {
                          const checked = additionalSelectionOverrides.get(wiki.translationSetIdentifier)
                            ?? ownedTranslationSetIds.has(wiki.translationSetIdentifier);
                          const disabled = !canSyncOwnedWikis || syncMutation.isPending;
                          const displayName = getWikiName(wiki.displayWiki);

                          return (
                            <div
                              className={`flex items-start gap-3 rounded-lg border border-stroke-subtle bg-surface-raised p-3 text-sm ${disabled ? "" : "cursor-pointer"}`}
                              key={wiki.translationSetIdentifier}
                              onClick={() => {
                                if (!disabled) toggleAdditionalWiki(wiki.translationSetIdentifier);
                              }}
                            >
                              <input
                                aria-label={displayName}
                                checked={checked}
                                className="mt-1"
                                disabled={disabled}
                                onChange={() => {
                                  if (!disabled) toggleAdditionalWiki(wiki.translationSetIdentifier);
                                }}
                                onClick={(event) => event.stopPropagation()}
                                type="checkbox"
                              />
                              <span className="min-w-0">
                                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-semibold text-text-strong">
                                  <span>{displayName}</span>
                                  <OfficialCertificationWikiLanguageLinks
                                    className="flex flex-wrap gap-1 text-xs font-semibold text-text-muted"
                                    wikis={wiki.wikis}
                                  />
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
