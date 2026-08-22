import {
  selectTranslationSetMasterDisplayWiki,
  type TranslationSetMasterSearchItem,
  type TranslationSetMasterSearchResponse,
  type TranslationSetMasterSearchWikiItem,
  type WikiResourceType,
  translationSetMasterSearchResponseSchema,
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
}: {
  fallbackErrorMessage: string;
  keyword: string;
  limit?: number;
  locale: string;
  resourceType: WikiResourceType;
}): Promise<TranslationSetMasterSearchDisplayResponse> => {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return { translationSetMasters: [] };
  }

  const url = new URL("/api/wiki/translation-set-master-search", window.location.origin);

  url.searchParams.set("resourceType", resourceType);
  url.searchParams.set("keyword", trimmedKeyword);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(`${url.pathname}${url.search}`);
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
