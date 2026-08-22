"use client";

import { useState } from "react";

import {
  getAccountCategoryFromIdentity,
  getAccountIdentifierFromIdentity,
} from "@/gateways/account/accountIdentity";
import { type WikiMasterSearchItem } from "@/gateways/wiki/wikiMasterSearchBrowserApi";
import { createOfficialCertificationRequestBody } from "@/gateways/wiki/officialCertification";
import { getOfficialCertificationRequestResourceTypesForAccountCategory } from "@/gateways/wiki/wikiPrincipal";
import { WikiMasterSearchSelect } from "../../../../../components/Wiki";
import { useAdmin } from "../../../AdminProvider";
import { useWikiSection } from "../../WikiSectionProvider";

type RequestState = {
  error: string | null;
  isSubmitting: boolean;
  selectedWikis: WikiMasterSearchItem[];
  success: string | null;
};

export function OfficialCertificationRequestClient() {
  const { currentIdentity, locale, t } = useAdmin();
  const { officialCertificationAdapter } = useWikiSection();
  const ownerAccountId = getAccountIdentifierFromIdentity(currentIdentity);
  const requestResourceTypes = getOfficialCertificationRequestResourceTypesForAccountCategory(
    getAccountCategoryFromIdentity(currentIdentity),
  );
  const [state, setState] = useState<RequestState>({
    error: null,
    isSubmitting: false,
    selectedWikis: [],
    success: null,
  });
  const resourceType = requestResourceTypes[0];
  const selectedWiki = state.selectedWikis[0] ?? null;
  const canSubmit = Boolean(ownerAccountId) && Boolean(resourceType) && Boolean(selectedWiki);

  const submitRequest = () => {
    if (!ownerAccountId || !resourceType || !selectedWiki || !canSubmit) {
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
        ownerAccountId,
        resourceType,
        wikiId: selectedWiki.wikiIdentifier,
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
            <WikiMasterSearchSelect
              disabled={state.isSubmitting}
              language={locale}
              label={t.officialCertificationWikiSearchLabel}
              mode="single"
              onChange={(selectedWikis) => {
                setState((current) => ({ ...current, selectedWikis }));
              }}
              placeholder={t.officialCertificationWikiSearchPlaceholder}
              resourceType={resourceType}
              selectedItems={state.selectedWikis}
            />
          ) : null}
          {state.error ? <p role="alert" className="text-sm font-semibold text-danger">{state.error}</p> : null}
          {state.success ? <p role="status" className="text-sm font-semibold text-success">{state.success}</p> : null}
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
