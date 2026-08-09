"use client";

import { AccountSettingsPanel, AccountStatusMessage } from "@/components/Account";
import {
  accountDocumentAccept,
  corporationDocumentCountries,
  individualDocumentCountries,
  type AccountDocumentOption,
  type CorporationDocumentCountry,
  type IndividualDocumentCountry,
} from "./accountDocumentRules";
import { useAccountSection } from "../AccountSectionContext";
import { useAccountDocuments } from "./useAccountDocuments";

const getDocumentTypeLabel = (
  labels: Record<string, string>,
  documentType: string,
) => labels[documentType] ?? documentType;

const getDocumentOptionGroups = (
  accountType: string | null | undefined,
  documentOptions: AccountDocumentOption[],
  labels: {
    corporationRegistrationGroupTitle: string;
    representativeIdentityGroupTitle: string;
    individualIdentityGroupTitle: string;
    selfieGroupTitle: string;
  },
) => {
  if (accountType === "corporation") {
    return [
      {
        title: labels.corporationRegistrationGroupTitle,
        options: documentOptions.filter((option) => option.group === "registration"),
      },
      {
        title: labels.representativeIdentityGroupTitle,
        options: documentOptions.filter((option) => option.group === "identity"),
      },
    ];
  }

  if (accountType === "individual") {
    return [
      {
        title: labels.individualIdentityGroupTitle,
        options: documentOptions.filter((option) => option.group === "identity"),
      },
      {
        title: labels.selfieGroupTitle,
        options: documentOptions.filter((option) => option.group === "selfie"),
      },
    ];
  }

  return [];
};

export function AccountDocumentsClient() {
  const { accountIdentifier, t } = useAccountSection();
  const state = useAccountDocuments({ accountIdentifier, t });

  if (state.isLoading) {
    return <p className="text-sm text-text-muted">{t.accountDocuments.loading}</p>;
  }

  const accountType = state.account?.type;
  const documentOptionGroups = getDocumentOptionGroups(accountType, state.documentOptions, t.accountDocuments);

  return (
    <AccountSettingsPanel
      action={accountType === "corporation" || accountType === "individual" ? (
        <button
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={state.isUploading}
          onClick={state.submit}
          type="button"
        >
          {state.isUploading ? t.accountDocuments.uploading : t.accountDocuments.upload}
        </button>
      ) : null}
      description={t.accountDocuments.description}
      title={t.accountDocuments.title}
    >
      {state.documents.length > 0 ? (
        <section className="mt-5 rounded-lg border border-stroke-subtle bg-surface-base p-4">
          <h3 className="font-semibold text-text-strong">{t.accountDocuments.uploadedTitle}</h3>
          <ul className="mt-3 divide-y divide-stroke-subtle">
            {state.documents.map((document) => (
              <li className="py-3 text-sm" key={`${document.documentType}-${document.documentPath}`}>
                <p className="font-medium text-text-strong">{getDocumentTypeLabel(t.accountDocuments.documentTypeLabels, document.documentType)}</p>
                <p className="text-text-muted">{document.uploadedAt}</p>
                <p className="break-all text-text-muted">{document.documentPath}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {accountType !== "corporation" && accountType !== "individual" ? (
        <AccountStatusMessage className="mt-5" variant="empty">
          {t.accountDocuments.unsupportedAccountType}
        </AccountStatusMessage>
      ) : (
        <div className="mt-5 grid gap-4">
          {accountType === "individual" ? (
            <p className="text-sm text-text-muted">
              {t.accountDocuments.individualRequiredHint}
            </p>
          ) : null}
          {accountType === "corporation" ? (
            <label className="grid gap-2 text-sm md:max-w-xs">
              <span className="font-medium text-text-strong">{t.accountDocuments.corporationDocumentCountryLabel}</span>
              <select
                className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-text-strong"
                disabled={state.isUploading}
                onChange={(event) => {
                  state.updateCorporationDocumentCountry(event.currentTarget.value as CorporationDocumentCountry);
                }}
                value={state.corporationDocumentCountry}
              >
                {corporationDocumentCountries.map((country) => (
                  <option key={country} value={country}>
                    {t.accountDocuments.documentCountryLabels[country]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {accountType === "individual" ? (
            <label className="grid gap-2 text-sm md:max-w-xs">
              <span className="font-medium text-text-strong">{t.accountDocuments.individualDocumentCountryLabel}</span>
              <select
                className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-text-strong"
                disabled={state.isUploading}
                onChange={(event) => {
                  state.updateIndividualDocumentCountry(event.currentTarget.value as IndividualDocumentCountry);
                }}
                value={state.individualDocumentCountry}
              >
                {individualDocumentCountries.map((country) => (
                  <option key={country} value={country}>
                    {t.accountDocuments.documentCountryLabels[country]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="grid gap-5">
            {documentOptionGroups.map((group) => (
              <section className="grid gap-3" key={group.title}>
                <h3 className="font-semibold text-text-strong">{group.title}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {group.options.map((option) => {
                    const selected = state.selectedDocuments.find((document) => document.documentType === option.documentType);
                    return (
                      <label className="space-y-2 rounded-lg border border-stroke-subtle p-3 text-sm" key={option.documentType}>
                        <span className="block font-medium text-text-strong">
                          {t.accountDocuments.documentTypeLabels[option.documentType]}
                        </span>
                        <input
                          accept={accountDocumentAccept}
                          className="block w-full text-sm"
                          disabled={state.isUploading}
                          onChange={(event) => {
                            state.updateSelectedFile(option.documentType, event.currentTarget.files?.[0] ?? null);
                          }}
                          type="file"
                        />
                        {selected ? <span className="block text-text-muted">{t.accountDocuments.selectedFile(selected.file.name)}</span> : null}
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
      <div className="mt-5 grid gap-3">
        {state.warning ? (
          <AccountStatusMessage variant="warning">
            {state.warning}
          </AccountStatusMessage>
        ) : null}
        {state.error ? (
          <AccountStatusMessage variant="error">
            {state.error}
          </AccountStatusMessage>
        ) : null}
        {state.success ? (
          <AccountStatusMessage variant="success">
            {state.success}
          </AccountStatusMessage>
        ) : null}
      </div>
    </AccountSettingsPanel>
  );
}
