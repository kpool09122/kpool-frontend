/* eslint-disable @next/next/no-img-element -- Private account documents use authenticated BFF routes. */
"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import { useI18n } from "@/i18n/I18nProvider";

type AccountInformation = {
  name: string;
  email: string;
  type: string | null;
  status: string | null;
  phone?: string | null;
  countryCode?: string | null;
  administrativeAreaCode?: string | null;
  postalCode?: string | null;
  locality?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
};

type Document = {
  documentType: string;
  uploadedAt: string;
  documentPath?: string;
  viewUrl: string;
  downloadUrl: string;
};

function DocumentPreview({ document, label }: { document: Document; label: string }) {
  const [failed, setFailed] = useState(false);
  const fileName = document.documentPath?.split(/[\\/]/).pop();
  const isPdf = /\.pdf(?:[?#].*)?$/i.test(document.documentPath ?? "");
  return (
    <a className="min-w-0 rounded-lg border border-stroke-subtle p-3 text-sm" download={fileName || true} href={document.downloadUrl}>
      {isPdf || failed ? (
        <FileText aria-hidden="true" className="mb-2 h-8 w-8 text-text-muted" />
      ) : (
        <img alt={label} className="mb-2 h-auto w-full rounded" onError={() => setFailed(true)} src={document.viewUrl} />
      )}
      <span className="block font-medium text-text-strong">{label}</span>
      {isPdf && fileName ? <span className="block break-all text-text-muted">PDF: {fileName}</span> : null}
      <span className="block text-text-muted"><LocalizedDateTime value={document.uploadedAt} /></span>
    </a>
  );
}

export function AccountInformationDetails({ account, documents, category }: {
  account: AccountInformation;
  documents: Document[];
  category?: string;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.admin;
  const detail = t.accountCategoryChangeRequestDetail;
  const documentLabels: Record<string, string> = t.accountDocuments.documentTypeLabels;
  const fields = [
    [t.accountNameLabel, account.name],
    [t.emailAddressLabel, account.email],
    [detail.accountType, account.type],
    ...(category ? [[detail.accountCategory, category]] : []),
    [detail.accountStatus, account.status],
    [t.accountPhoneLabel, account.phone],
    [t.accountAddressCountryCodeLabel, account.countryCode],
    [t.accountAddressAdministrativeAreaCodeLabel, account.administrativeAreaCode],
    [t.accountAddressPostalCodeLabel, account.postalCode],
    [t.accountAddressLocalityLabel, account.locality],
    [t.accountAddressLine1Label, account.addressLine1],
    [t.accountAddressLine2Label, account.addressLine2],
  ];
  return <>
    <section className="rounded-xl border border-stroke-subtle p-4">
      <h3 className="font-semibold text-text-strong">{detail.accountSection}</h3>
      <dl className="mt-3 grid gap-2 break-words text-sm md:grid-cols-2">
        {fields.map(([label, value]) => <div className="min-w-0" key={label}><dt className="text-text-muted">{label}</dt><dd>{value ?? "-"}</dd></div>)}
      </dl>
    </section>
    <section className="rounded-xl border border-stroke-subtle p-4">
      <h3 className="font-semibold text-text-strong">{detail.documentsSection}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {documents.map(document => <DocumentPreview document={document} key={document.viewUrl} label={documentLabels[document.documentType] ?? document.documentType} />)}
      </div>
    </section>
  </>;
}
