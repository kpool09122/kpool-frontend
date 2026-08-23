"use client";

import { type KeyboardEvent, useMemo, useState } from "react";

import {
  getAccountCategoryFromIdentity,
  getAccountIdentifierFromIdentity,
} from "@/gateways/account/accountIdentity";
import { createOfficialCertificationRequestBody } from "@/gateways/wiki/officialCertification";
import {
  fetchTranslationSetMasterSearch,
  type TranslationSetMasterSearchDisplayItem,
} from "@/gateways/wiki/translationSetMasterSearchBrowserApi";
import { getOfficialCertificationRequestResourceTypesForAccountCategory } from "@/gateways/wiki/wikiPrincipal";
import { useAdmin } from "../../../AdminProvider";
import { useWikiSection } from "../../WikiSectionProvider";

type RequestState = {
  error: string | null;
  isSubmitting: boolean;
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

export function OfficialCertificationRequestClient() {
  const { currentIdentity, locale, t } = useAdmin();
  const { officialCertificationAdapter } = useWikiSection();
  const ownerAccountId = getAccountIdentifierFromIdentity(currentIdentity);
  const requestResourceTypes = getOfficialCertificationRequestResourceTypesForAccountCategory(
    getAccountCategoryFromIdentity(currentIdentity),
  );
  const [keyword, setKeyword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const [state, setState] = useState<RequestState>({
    error: null,
    isSubmitting: false,
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

  const searchTranslationSets = () => {
    const trimmedKeyword = keyword.trim();

    if (!resourceType) {
      return;
    }

    if (!trimmedKeyword) {
      setIsOpen(true);
      setSearchState({ status: "error", message: "検索キーワードを入力してください" });
      return;
    }

    setIsOpen(true);
    setSearchState({ status: "loading" });

    void fetchTranslationSetMasterSearch({
      fallbackErrorMessage: "Wiki候補の検索に失敗しました",
      keyword: trimmedKeyword,
      locale,
      resourceType,
    }).then((response) => {
      setSearchState({ status: "success", items: response.translationSetMasters });
    }).catch((error: unknown) => {
      console.error("Failed to search translation set masters", error);
      setSearchState({
        status: "error",
        message: error instanceof Error ? error.message : "Wiki候補の検索に失敗しました",
      });
    });
  };

  const selectTranslationSet = (item: TranslationSetMasterSearchDisplayItem) => {
    setState((current) => ({ ...current, selectedTranslationSet: item }));
    setKeyword(item.displayWiki.name);
    setIsOpen(false);
  };

  const submitRequest = () => {
    if (!ownerAccountId || !resourceType || !state.selectedTranslationSet || !canSubmit) {
      setState((current) => ({
        ...current,
        error: t.officialCertificationRequestUnavailable,
        success: null,
      }));
      return;
    }

    setState((current) => ({ ...current, error: null, isSubmitting: true, success: null }));

    void officialCertificationAdapter.requestOfficialCertification({
      fallbackErrorMessage: t.officialCertificationRequestFailed,
      requestBody: createOfficialCertificationRequestBody({
        resourceType,
        translationSetIdentifier: state.selectedTranslationSet.translationSetIdentifier,
      }),
    }).then((summary) => {
      setState((current) => ({
        ...current,
        error: null,
        isSubmitting: false,
        success: t.officialCertificationRequestSucceeded(summary.status),
      }));
    }).catch((error: unknown) => {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : t.officialCertificationRequestFailed,
        isSubmitting: false,
        success: null,
      }));
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
      ) : (
        <form
          className="mt-6 grid gap-4"
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
                    disabled={state.isSubmitting || searchState.status === "loading"}
                    onChange={(event) => {
                      const nextValue = event.currentTarget.value;
                      setKeyword(nextValue);
                      if (nextValue.trim() === "") {
                        setState((current) => ({ ...current, selectedTranslationSet: null }));
                      }
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
                    disabled={state.isSubmitting || searchState.status === "loading"}
                    onClick={searchTranslationSets}
                    type="button"
                  >
                    {searchState.status === "loading" ? "検索中" : "検索"}
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
                      disabled={state.isSubmitting}
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
                  Wiki候補を検索しています
                </p>
              ) : null}
              {isOpen && searchState.status === "error" ? (
                <p className="min-w-0 rounded-xl border border-status-danger/40 bg-surface-base px-3 py-3 text-sm font-semibold text-status-danger" role="alert">
                  {searchState.message}
                </p>
              ) : null}
              {isOpen && searchState.status === "success" && searchState.items.length === 0 ? (
                <p className="min-w-0 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-3 text-sm text-text-muted">
                  候補が見つかりません
                </p>
              ) : null}
              {isOpen && searchState.status === "success" && searchState.items.length > 0 ? (
                <ul className="min-w-0 max-h-56 overflow-auto rounded-xl border border-stroke-subtle bg-surface-raised p-2 shadow-soft">
                  {searchState.items.map((item) => (
                    <li key={item.translationSetIdentifier}>
                      <button
                        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-text-strong transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={state.isSubmitting || selectedIds.has(item.translationSetIdentifier)}
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
          {state.error ? <p role="alert" className={statusErrorClassName}>{state.error}</p> : null}
          {state.success ? <p role="status" className={statusSuccessClassName}>{state.success}</p> : null}
          <button
            className="w-fit rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSubmit || state.isSubmitting}
            type="submit"
          >
            {state.isSubmitting ? t.officialCertificationSubmitting : t.officialCertificationSubmit}
          </button>
        </form>
      )}
    </section>
  );
}
