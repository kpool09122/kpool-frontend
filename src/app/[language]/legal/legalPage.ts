import { notFound } from "next/navigation";

import { dictionaries } from "../../../i18n/dictionaries";
import { isSupportedLocale } from "../../../i18n/locales";
import type { LegalDocumentKind } from "./LegalDocument";

type LegalPageProps = {
  params: PromiseLike<{ language: string }>;
};

export const resolveLegalLocale = async (params: LegalPageProps["params"]) => {
  const { language } = await params;

  if (!isSupportedLocale(language)) {
    notFound();
  }

  return language;
};

export const buildLegalMetadata = async (
  params: LegalPageProps["params"],
  document: LegalDocumentKind,
) => {
  const locale = await resolveLegalLocale(params);
  const legal = dictionaries[locale].legal;

  return document === "terms"
    ? { title: legal.termsTitle, description: legal.termsDescription }
    : { title: legal.privacyTitle, description: legal.privacyDescription };
};

export type { LegalPageProps };
