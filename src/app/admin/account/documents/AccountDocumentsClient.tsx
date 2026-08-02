"use client";

import { accountDocumentAccept } from "./accountDocumentRules";
import { useAccountSection } from "../AccountSectionContext";
import { useAccountDocuments } from "./useAccountDocuments";

const getDocumentTypeLabel = (
  labels: Record<string, string>,
  documentType: string,
) => labels[documentType] ?? documentType;

export function AccountDocumentsClient() {
  const { accountIdentifier, canEdit, t } = useAccountSection();
  const state = useAccountDocuments({ accountIdentifier, canEdit, t });

  if (state.isLoading) {
    return <p className="text-sm text-text-muted">{t.accountDocuments.loading}</p>;
  }

  const accountType = state.account?.type;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-strong">{t.accountDocuments.title}</h2>
        <p className="text-sm text-text-muted">{t.accountDocuments.description}</p>
      </div>

      {state.error ? (
        <div className="rounded-lg border border-danger-subtle bg-danger-subtle/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-lg border border-success-subtle bg-success-subtle/10 px-4 py-3 text-sm text-success">
          {state.success}
        </div>
      ) : null}

      <section className="rounded-2xl border border-stroke-subtle bg-surface-base p-4">
        <h3 className="font-semibold text-text-strong">{t.accountDocuments.uploadedTitle}</h3>
        {state.documents.length > 0 ? (
          <ul className="mt-3 divide-y divide-stroke-subtle">
            {state.documents.map((document) => (
              <li className="py-3 text-sm" key={`${document.documentType}-${document.documentPath}`}>
                <p className="font-medium text-text-strong">{getDocumentTypeLabel(t.accountDocuments.documentTypeLabels, document.documentType)}</p>
                <p className="text-text-muted">{document.uploadedAt}</p>
                <p className="break-all text-text-muted">{document.documentPath}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-muted">{t.accountDocuments.empty}</p>
        )}
      </section>

      {accountType !== "corporation" && accountType !== "individual" ? (
        <p className="rounded-lg border border-stroke-subtle px-4 py-3 text-sm text-text-muted">
          {t.accountDocuments.unsupportedAccountType}
        </p>
      ) : (
        <section className="space-y-4 rounded-2xl border border-stroke-subtle bg-surface-base p-4">
          <div>
            <h3 className="font-semibold text-text-strong">
              {accountType === "corporation" ? t.accountDocuments.corporationFormTitle : t.accountDocuments.individualFormTitle}
            </h3>
            <p className="text-sm text-text-muted">
              {accountType === "corporation" ? t.accountDocuments.corporationRequiredHint : t.accountDocuments.individualRequiredHint}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {state.documentOptions.map((option) => {
              const selected = state.selectedDocuments.find((document) => document.documentType === option.documentType);
              return (
                <label className="space-y-2 rounded-lg border border-stroke-subtle p-3 text-sm" key={option.documentType}>
                  <span className="block font-medium text-text-strong">
                    {t.accountDocuments.documentTypeLabels[option.documentType]}
                  </span>
                  <input
                    accept={accountDocumentAccept}
                    className="block w-full text-sm"
                    disabled={!canEdit || state.isUploading}
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
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!canEdit || state.isUploading}
            onClick={state.submit}
            type="button"
          >
            {state.isUploading ? t.accountDocuments.uploading : t.accountDocuments.upload}
          </button>
        </section>
      )}
    </div>
  );
}
