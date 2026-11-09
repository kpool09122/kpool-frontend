import {
  selectTranslationSetMasterDisplayWiki,
  type TranslationSetMasterSearchItem,
  type TranslationSetMasterSearchResponse,
  type TranslationSetMasterSearchWikiItem,
  type WikiResourceType,
  translationSetMasterSearchResponseSchema,
  wikiResourceTypes,
} from "@kpool/wiki";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getWikiRouteErrorMessage,
  readWikiRouteJsonResponse,
} from "./wikiBrowserRouteSupport";

export type TranslationSetMasterSearchDisplayItem = TranslationSetMasterSearchItem & {
  displayWiki: TranslationSetMasterSearchWikiItem;
};

export type TranslationSetMasterSearchDisplayResponse = {
  translationSetMasters: TranslationSetMasterSearchDisplayItem[];
};

const toDisplayResponse = (
  response: TranslationSetMasterSearchResponse,
  locale: string,
): TranslationSetMasterSearchDisplayResponse => ({
  translationSetMasters: response.translationSetMasters.flatMap((item) => {
    const displayWiki = selectTranslationSetMasterDisplayWiki(item, locale);

    return displayWiki ? [{ ...item, displayWiki }] : [];
  }),
});

export const fetchTranslationSetMasterSearch = async ({
  fallbackErrorMessage,
  keyword,
  limit = 20,
  locale,
  resourceType,
  signal,
}: {
  fallbackErrorMessage: string;
  keyword: string;
  limit?: number;
  locale: string;
  resourceType: WikiResourceType;
  signal?: AbortSignal;
}): Promise<TranslationSetMasterSearchDisplayResponse> => {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return { translationSetMasters: [] };
  }

  const url = new URL("/api/wiki/translation-set-master-search", window.location.origin);

  url.searchParams.set("resourceType", resourceType);
  url.searchParams.set("keyword", trimmedKeyword);
  url.searchParams.set("limit", String(limit));

  const path = `${url.pathname}${url.search}`;
  const response = signal ? await fetch(path, { signal }) : await fetch(path);
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);

  if (!response.ok) {
    throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  }

  return toDisplayResponse(
    parseWithSchemaLog(
      "translation set master search response",
      translationSetMasterSearchResponseSchema,
      body,
    ),
    locale,
  );
};

export const fetchAllTranslationSetMasterSearch = async (
  options: Omit<Parameters<typeof fetchTranslationSetMasterSearch>[0], "resourceType">,
): Promise<TranslationSetMasterSearchDisplayResponse> => {
  const responses = await Promise.all(
    wikiResourceTypes.map((resourceType) =>
      fetchTranslationSetMasterSearch({ ...options, resourceType }),
    ),
  );
  return {
    translationSetMasters: responses.flatMap((response) => response.translationSetMasters),
  };
};
