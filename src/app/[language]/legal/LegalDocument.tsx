import documents from "./documents.json";

import type { Locale } from "../../../i18n/locales";

export type LegalDocumentKind = "privacy" | "terms";

export async function LegalDocument({
  document,
  locale,
}: {
  document: LegalDocumentKind;
  locale: Locale;
}) {
  const content = documents[locale][document];

  return (
    <main className="flex-1 bg-surface-base px-6 py-10 text-text-strong sm:px-10 lg:px-16">
      <article
        className="legal-content mx-auto max-w-4xl rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft sm:p-10"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </main>
  );
}
