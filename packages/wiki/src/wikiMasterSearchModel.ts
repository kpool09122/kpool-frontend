import { wikiPrivateApiTypes } from "@kpool/types";
import type { z } from "zod";

import { trimTrailingSlashes } from "./wikiApiModel";
import type { WikiResourceType } from "./types/wiki";

export const wikiMasterSearchItemSchema = wikiPrivateApiTypes.schemas.WikiMasterSearchItem.transform(
  (item) => ({
    ...item,
    wikiIdentifier: item.id,
  }),
);

export const wikiMasterSearchResponseSchema = wikiPrivateApiTypes.schemas.SearchMasterWikisResponseBody.transform(
  (response) => ({
    ...response,
    wikis: response.wikis.map((item) => ({ ...item, wikiIdentifier: item.id })),
  }),
);

export const translationSetMasterSearchWikiItemSchema =
  wikiPrivateApiTypes.schemas.TranslationSetMasterSearchWikiItem;
export const translationSetMasterSearchItemSchema =
  wikiPrivateApiTypes.schemas.TranslationSetMasterSearchItem;
export const translationSetMasterSearchResponseSchema =
  wikiPrivateApiTypes.schemas.SearchTranslationSetMasterWikisResponseBody;

export type WikiMasterSearchItem = z.infer<typeof wikiMasterSearchItemSchema>;
export type WikiMasterSearchResponse = z.infer<typeof wikiMasterSearchResponseSchema>;
export type TranslationSetMasterSearchWikiItem = z.infer<typeof translationSetMasterSearchWikiItemSchema>;
export type TranslationSetMasterSearchItem = z.infer<typeof translationSetMasterSearchItemSchema>;
export type TranslationSetMasterSearchResponse = z.infer<typeof translationSetMasterSearchResponseSchema>;

export const createWikiMasterSearchUrl = ({
  baseUrl,
  keyword,
  language,
  limit,
  resourceType,
}: {
  baseUrl: string;
  keyword: string;
  language: string;
  limit?: number;
  resourceType: WikiResourceType;
}): string => {
  const url = new URL(
    `${trimTrailingSlashes(baseUrl)}/wikis/${encodeURIComponent(language)}/masters`,
  );

  url.searchParams.set("resourceType", resourceType);
  url.searchParams.set("keyword", keyword);

  if (limit) {
    url.searchParams.set("limit", String(limit));
  }

  return url.toString();
};

export const createTranslationSetMasterSearchUrl = ({
  baseUrl,
  keyword,
  limit,
  resourceType,
}: {
  baseUrl: string;
  keyword: string;
  limit?: number;
  resourceType: WikiResourceType;
}): string => {
  const url = new URL(`${trimTrailingSlashes(baseUrl)}/wiki-translation-sets/masters`);

  url.searchParams.set("resourceType", resourceType);
  url.searchParams.set("keyword", keyword);

  if (limit) {
    url.searchParams.set("limit", String(limit));
  }

  return url.toString();
};

export const selectTranslationSetMasterDisplayWiki = (
  item: TranslationSetMasterSearchItem,
  locale: string,
): TranslationSetMasterSearchWikiItem | null =>
  item.wikis.find((wiki) => wiki.language === locale) ?? item.wikis[0] ?? null;
