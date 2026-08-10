"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
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

const getDocumentFileName = (documentPath: string): string => {
  const fileName = documentPath.split(/[\\/]/).pop();
  return fileName || documentPath;
};

const isPdfDocument = (documentPath: string): boolean =>
  /\.pdf(?:[?#].*)?$/i.test(documentPath);

const getDocumentViewUrl = (documentType: string): string =>
  `/api/account/my/documents/${encodeURIComponent(documentType)}`;

const getDocumentDownloadUrl = (documentType: string): string =>
  `${getDocumentViewUrl(documentType)}?download=1`;

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
                    const uploaded = state.documents.find((document) => document.documentType === option.documentType);
                    const isUploadedDismissed = state.dismissedUploadedDocumentTypes.includes(option.documentType);
                    const documentLabel = getDocumentTypeLabel(t.accountDocuments.documentTypeLabels, option.documentType);
                    const shouldShowUploaded = uploaded && !selected && !isUploadedDismissed;

                    if (shouldShowUploaded) {
                      return (
                        <section
                          className="space-y-2 rounded-lg border border-stroke-subtle p-3 text-sm"
                          key={option.documentType}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-text-strong">{documentLabel}</p>
                              {isPdfDocument(uploaded.documentPath) ? (
                                <a
                                  aria-label={`${documentLabel}をダウンロード`}
                                  className="mt-3 flex min-w-0 items-center gap-3 rounded-lg border border-stroke-subtle bg-surface-base p-3 transition hover:bg-surface-raised"
                                  download={getDocumentFileName(uploaded.documentPath)}
                                  href={getDocumentDownloadUrl(uploaded.documentType)}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element -- Static public icon is decorative and does not need Next image optimization. */}
                                  <img
                                    alt=""
                                    aria-hidden="true"
                                    className="h-8 w-8 shrink-0"
                                    src="/pdf_icon.webp"
                                  />
                                  <p className="min-w-0 break-all font-medium text-text-strong">
                                    {getDocumentFileName(uploaded.documentPath)}
                                  </p>
                                </a>
                              ) : (
                                <div className="mt-3 w-full overflow-hidden rounded-lg border border-stroke-subtle bg-surface-base">
                                  <a
                                    aria-label={`${documentLabel}をダウンロード`}
                                    download={getDocumentFileName(uploaded.documentPath)}
                                    href={getDocumentDownloadUrl(uploaded.documentType)}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element -- Verification documents should render at their own aspect ratio without Next image resizing. */}
                                    <img
                                      alt={documentLabel}
                                      className="h-auto w-full"
                                      src={getDocumentViewUrl(uploaded.documentType)}
                                    />
                                  </a>
                                </div>
                              )}
                            </div>
                            <button
                              aria-label={t.accountDocuments.removeUploadedDocument(documentLabel)}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-stroke-subtle text-text-muted transition hover:bg-surface-base hover:text-text-strong"
                              disabled={state.isUploading}
                              onClick={() => {
                                state.dismissUploadedDocument(option.documentType);
                              }}
                              type="button"
                            >
                              <Cross2Icon aria-hidden="true" />
                            </button>
                          </div>
                        </section>
                      );
                    }

                    return (
                      <label className="space-y-2 rounded-lg border border-stroke-subtle p-3 text-sm" key={option.documentType}>
                        <span className="block font-medium text-text-strong">
                          {documentLabel}
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
