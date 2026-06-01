import {
  type WikiRelatedProfilesResponse,
  type WikiResourceType,
  wikiRelatedProfilesResponseSchema,
} from "@kpool/wiki";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

const readJsonResponse = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const getRouteErrorMessage = (body: unknown, fallback: string): string =>
  typeof body === "object" &&
  body !== null &&
  "message" in body &&
  typeof (body as { message: unknown }).message === "string"
    ? (body as { message: string }).message
    : fallback;

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
  const body = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog(
    "wiki related profiles response",
    wikiRelatedProfilesResponseSchema,
    body,
  );
};
