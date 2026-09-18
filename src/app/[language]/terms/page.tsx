import type { Metadata } from "next";

import { LegalDocument } from "../legal/LegalDocument";
import { buildLegalMetadata, resolveLegalLocale, type LegalPageProps } from "../legal/legalPage";

export const generateMetadata = ({ params }: LegalPageProps): Promise<Metadata> =>
  buildLegalMetadata(params, "terms");

export default async function TermsPage({ params }: LegalPageProps) {
  const locale = await resolveLegalLocale(params);

  return LegalDocument({ document: "terms", locale });
}
