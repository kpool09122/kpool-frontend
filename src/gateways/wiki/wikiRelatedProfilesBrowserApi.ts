import {
  type WikiRelatedProfilesResponse,
  type WikiResourceType,
  wikiRelatedProfilesResponseSchema,
} from "@kpool/wiki";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getWikiRouteErrorMessage,
  readWikiRouteJsonResponse,
} from "./wikiBrowserRouteSupport";

export const fetchWikiRelatedProfiles = async ({
  fallbackErrorMessage,
  language,
  resourceType,
  slug,
}: {
  fallbackErrorMessage: string;
  language: string;
  resourceType: WikiResourceType;
  slug: string;
}): Promise<WikiRelatedProfilesResponse> => {
  const url = new URL(
    `/api/wiki/${encodeURIComponent(language)}/${encodeURIComponent(slug)}/related-profiles`,
    window.location.origin,
  );

  url.searchParams.set("resourceType", resourceType);

  const response = await fetch(`${url.pathname}${url.search}`);
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);

  if (!response.ok) {
    throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog(
    "wiki related profiles response",
    wikiRelatedProfilesResponseSchema,
    body,
  );
};
