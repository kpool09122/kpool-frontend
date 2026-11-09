import { cache } from "react";
import { notFound } from "next/navigation";
import { loadPublicWikiState } from "@/gateways/wiki/publicWiki";
import { isSupportedLocale } from "@/i18n/locales";

// Layout, metadata and page share the same request-scoped existence check.
export const loadPublicWikiRouteState = cache(async (language: string, slug: string) => {
  if (!isSupportedLocale(language)) notFound();
  const state = await loadPublicWikiState(language, slug);
  if (state.status === "empty") notFound();
  return state;
});
