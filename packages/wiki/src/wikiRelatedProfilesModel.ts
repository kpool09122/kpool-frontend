import { wikiPrivateApiTypes } from "@kpool/types";
import type { z } from "zod";

import { trimTrailingSlashes } from "./wikiApiModel";
import { wikiResourceTypes, type WikiResourceType } from "./types/wiki";

export const wikiRelatedProfilesResponseSchema =
  wikiPrivateApiTypes.schemas.ListRelatedProfilesResponseBody;

export type WikiRelatedProfile = z.infer<typeof wikiPrivateApiTypes.schemas.RelatedProfileItem>;
export type WikiRelatedProfilesResponse = z.infer<typeof wikiRelatedProfilesResponseSchema>;

export const createWikiRelatedProfilesUrl = ({
  baseUrl,
  language,
  resourceType,
  slug,
}: {
  baseUrl: string;
  language: string;
  resourceType: WikiResourceType;
  slug: string;
}): string => {
  const url = new URL(
    `${trimTrailingSlashes(baseUrl)}/wiki/${encodeURIComponent(language)}/${encodeURIComponent(slug)}/related-profiles`,
  );

  url.searchParams.set("resourceType", resourceType);

  return url.toString();
};

export const getSelectableRelatedProfileResourceTypes = (
  sourceResourceType: WikiResourceType,
): WikiResourceType[] =>
  wikiResourceTypes.filter((resourceType) => resourceType !== sourceResourceType);
