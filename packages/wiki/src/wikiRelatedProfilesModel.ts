import { wikiPrivateApiTypes } from "@kpool/types";
import { z } from "zod";

import { trimTrailingSlashes } from "./wikiApiModel";
import type { WikiResourceType } from "./types/wiki";

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
  (["agency", "group", "song", "talent"] as const).filter(
    (resourceType) => resourceType !== sourceResourceType,
  );

export const getWikiRelatedProfilesErrorMessage = (
  error: unknown,
  fallback = "Related profiles are temporarily unavailable. Please try again later.",
): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: unknown }).response !== null
  ) {
    const response = (error as {
      response: {
        status?: number;
        data?: unknown;
      };
    }).response;
    const detail =
      typeof response.data === "object" &&
      response.data !== null &&
      "message" in response.data &&
      typeof (response.data as { message: unknown }).message === "string"
        ? (response.data as { message: string }).message
        : null;

    if (detail) {
      return detail;
    }

    if (response.status) {
      return `Related profiles request failed with status ${response.status}.`;
    }
  }

  if (error instanceof z.ZodError) {
    return `Related profiles response did not match the expected schema: ${error.issues[0]?.message ?? "invalid response"}`;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
};
