import {
  type WikiMasterSearchItem,
  type WikiMasterSearchResponse,
  type WikiResourceType,
  wikiMasterSearchResponseSchema,
} from "@kpool/wiki";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getWikiRouteErrorMessage,
  readWikiRouteJsonResponse,
} from "./wikiBrowserRouteSupport";

export type { WikiMasterSearchItem };

export const fetchWikiMasterSearch = async ({
  fallbackErrorMessage,
  keyword,
  language,
  limit = 20,
  resourceType,
}: {
  fallbackErrorMessage: string;
  keyword: string;
  language: string;
  limit?: number;
  resourceType: WikiResourceType;
}): Promise<WikiMasterSearchResponse> => {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return { wikis: [] };
  }

  const url = new URL("/api/wiki/master-search", window.location.origin);

  url.searchParams.set("language", language);
  url.searchParams.set("resourceType", resourceType);
  url.searchParams.set("keyword", trimmedKeyword);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(`${url.pathname}${url.search}`);
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);

  if (!response.ok) {
    throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog("wiki master search response", wikiMasterSearchResponseSchema, body);
};
