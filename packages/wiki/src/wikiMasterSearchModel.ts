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

export type WikiMasterSearchItem = z.infer<typeof wikiMasterSearchItemSchema>;
export type WikiMasterSearchResponse = z.infer<typeof wikiMasterSearchResponseSchema>;

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
