import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Locale } from "../../../i18n/locales";

export type LegalDocumentKind = "privacy" | "terms";

export async function LegalDocument({
  document,
  locale,
}: {
  document: LegalDocumentKind;
  locale: Locale;
}) {
  const content = await readFile(
    path.join(process.cwd(), "public", "legal", locale, `${document}.html`),
    "utf8",
  );

  return (
    <main className="min-h-screen bg-surface-base px-6 py-10 text-text-strong sm:px-10 lg:px-16">
      <article
        className="legal-content mx-auto max-w-4xl rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft sm:p-10"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </main>
  );
}
