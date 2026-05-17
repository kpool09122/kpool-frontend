import { type WikiDetail } from "@kpool/wiki";
import { schemas } from "@kpool/types/wiki-private-api";
import { z } from "zod";

import {
  getWikiResourceTypeFromSlug,
  type WikiResourceType,
} from "./wikiRouting";
import {
  adaptWikiApiResponse,
  getWikiApiErrorMessage,
  trimTrailingSlashes,
  withWikiApiPrefix,
} from "./wikiApiModel";
import { parseWithSchemaLog } from "../zodErrorLog";

const draftWikiApiResponseSchema = z
  .union([
    schemas.AgencyDraftWikiDetail,
    schemas.DraftWikiDetail,
    schemas.SongDraftWikiDetail,
    schemas.TalentDraftWikiDetail,
  ])
  .and(
    z
      .object({
        translationSetIdentifier: z.string(),
      })
      .passthrough(),
  );

type DraftWikiApiResponse = z.infer<typeof draftWikiApiResponseSchema>;
type EditWikiRequestBody = z.infer<typeof schemas.UpdateWikiDraftRequestBody>;
type SubmitWikiRequestBody = z.infer<typeof schemas.WikiWorkflowRequestBody> & {
  resourceType: string;
  wikiId: string;
};
type DraftWikiSummary = z.infer<typeof schemas.DraftWikiSummary>;
export type WikiDraftWiki = z.infer<typeof schemas.DraftWikiListItem>;
export type WikiDraftWikiStatus = z.infer<typeof schemas.DraftWikiStatus>;
export type WikiDraftWikiListResponse = z.infer<typeof schemas.ListDraftWikisResponseBody>;
type DraftWikiApiClient = {
  baseUrl: string;
  fetchDraftWiki: (
    language: string,
    resourceType: WikiResourceType,
    slug: string,
  ) => Promise<DraftWikiApiResponse>;
  saveDraftWiki: (wikiId: string, body: EditWikiRequestBody) => Promise<DraftWikiSummary>;
  submitDraftWiki: (wikiId: string, body: SubmitWikiRequestBody) => Promise<DraftWikiSummary>;
};

export const defaultWikiDraftPerPage = 12;
export const wikiDraftWikiListResponseSchema = schemas.ListDraftWikisResponseBody;

type DraftWikiState =
  | { status: "success"; data: WikiDetail }
  | { status: "empty" }
  | { status: "error"; message: string };

const draftWikiAliasByResourceType = {
  agency: "WikiOperations_getAgencyDraftWiki",
  group: "WikiOperations_getGroupDraftWiki",
  song: "WikiOperations_getSongDraftWiki",
  talent: "WikiOperations_getTalentDraftWiki",
} as const;

const getDefaultApiBaseUrl = (): string => process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL ?? "";

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const throwApiError = async (response: Response): Promise<never> => {
  throw {
    response: {
      status: response.status,
      data: await readResponseBody(response),
    },
  };
};

const parseDraftWikiResponseBody = (body: unknown): DraftWikiApiResponse =>
  parseWithSchemaLog("wiki draft detail response", draftWikiApiResponseSchema, body);

const parseDraftWikiSummaryBody = (body: unknown): DraftWikiSummary =>
  parseWithSchemaLog("wiki draft summary response", schemas.DraftWikiSummary, body);

export const adaptDraftWikiResponse = (response: DraftWikiApiResponse): WikiDetail =>
  adaptWikiApiResponse(response);

export const getDraftWikiAlias = (
  slug: string,
): (typeof draftWikiAliasByResourceType)[WikiResourceType] | null => {
  const resourceType = getWikiResourceTypeFromSlug(slug);

  return resourceType ? draftWikiAliasByResourceType[resourceType] : null;
};

export const getDraftWikiEndpointPath = (
  language: string,
  resourceType: WikiResourceType,
  slug: string,
): string =>
  `/wiki/${encodeURIComponent(language)}/${resourceType}/${encodeURIComponent(slug)}/draft`;

export const getEditWikiEndpointPath = (wikiId: string): string =>
  `/wiki/${encodeURIComponent(wikiId)}/edit`;

export const getSubmitWikiEndpointPath = (wikiId: string): string =>
  `/wiki/${encodeURIComponent(wikiId)}/submit`;

const copyStringProperty = (
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  property: string,
) => {
  const value = source[property];

  if (typeof value === "string") {
    target[property] = value;
  }
};

const copyStringArrayProperty = (
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  property: string,
) => {
  const value = source[property];

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    target[property] = value;
  }
};

export const createSubmitWikiRequestBody = (
  draft: Pick<WikiDetail, "resourceType" | "wikiIdentifier"> & Record<string, unknown>,
): SubmitWikiRequestBody => {
  const body: Record<string, unknown> = {
    resourceType: draft.resourceType,
    wikiId: draft.wikiIdentifier,
  };

  copyStringProperty(draft, body, "agencyIdentifier");
  copyStringArrayProperty(draft, body, "groupIdentifiers");
  copyStringArrayProperty(draft, body, "talentIdentifiers");

  return schemas.WikiWorkflowRequestBody.and(
    z.object({
      resourceType: z.string(),
      wikiId: z.string(),
    }),
  ).parse(body);
};

export const createWikiDraftWikisUrl = ({
  baseUrl,
  onlyMine,
  page,
  perPage,
  resourceType,
  status,
  translationSetIdentifier,
}: {
  baseUrl: string;
  onlyMine?: boolean;
  page: number;
  perPage: number;
  resourceType?: string;
  status: WikiDraftWikiStatus;
  translationSetIdentifier?: string;
}): string => {
  const url = new URL(`${trimTrailingSlashes(baseUrl)}/draft-wikis`);

  url.searchParams.set("status", status);
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("page", String(page));

  if (onlyMine !== undefined) {
    url.searchParams.set("onlyMine", String(onlyMine));
  }

  if (resourceType) {
    url.searchParams.set("resourceType", resourceType);
  }

  if (translationSetIdentifier) {
    url.searchParams.set("translationSetIdentifier", translationSetIdentifier);
  }

  return url.toString();
};

export const fetchDraftWiki = async (
  client: DraftWikiApiClient,
  language: string,
  slug: string,
): Promise<WikiDetail | null> => {
  const alias = getDraftWikiAlias(slug);

  if (!alias) {
    return null;
  }
  const resourceType = getWikiResourceTypeFromSlug(slug);

  if (!resourceType) {
    return null;
  }

  const response = await client.fetchDraftWiki(language, resourceType, slug);

  return adaptDraftWikiResponse(response);
};

export const saveDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
  body: EditWikiRequestBody,
): Promise<DraftWikiSummary> =>
  client.saveDraftWiki(wikiId, body);

export const submitDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
  body: SubmitWikiRequestBody,
): Promise<DraftWikiSummary> =>
  client.submitDraftWiki(wikiId, body);

export const createDraftWikiApiClient = (
  baseUrl: string = getDefaultApiBaseUrl(),
  forwardedHeaders: HeadersInit = {},
): DraftWikiApiClient | null => {
  const apiBaseUrl = baseUrl ? withWikiApiPrefix(baseUrl) : "";

  return apiBaseUrl
    ? {
        baseUrl: apiBaseUrl,
        fetchDraftWiki: async (language, resourceType, slug) => {
          const response = await fetch(
            `${apiBaseUrl}${getDraftWikiEndpointPath(language, resourceType, slug)}`,
            {
              headers: {
                ...forwardedHeaders,
                Accept: "application/json",
              },
              cache: "no-store",
            },
          );

          if (!response.ok) {
            await throwApiError(response);
          }

          const responseBody = await readResponseBody(response);

          return parseDraftWikiResponseBody(responseBody);
        },
        saveDraftWiki: async (wikiId, body) => {
          const response = await fetch(
            `${apiBaseUrl}${getEditWikiEndpointPath(wikiId)}`,
            {
              method: "POST",
              headers: {
                ...forwardedHeaders,
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
              cache: "no-store",
            },
          );

          if (!response.ok) {
            await throwApiError(response);
          }

          const responseBody = await readResponseBody(response);

          return parseDraftWikiSummaryBody(responseBody);
        },
        submitDraftWiki: async (wikiId, body) => {
          const response = await fetch(
            `${apiBaseUrl}${getSubmitWikiEndpointPath(wikiId)}`,
            {
              method: "POST",
              headers: {
                ...forwardedHeaders,
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
              cache: "no-store",
            },
          );

          if (!response.ok) {
            await throwApiError(response);
          }

          const responseBody = await readResponseBody(response);

          return parseDraftWikiSummaryBody(responseBody);
        },
      }
    : null;
};

export const getDraftWikiErrorMessage = (error: unknown): string =>
  getWikiApiErrorMessage(error, {
    notFound: "Draft wiki was not found.",
    requestFailedPrefix: "Draft wiki request failed with status",
    responseSchemaPrefix: "Draft wiki response did not match the expected schema",
    unavailable: "Wiki drafts are temporarily unavailable. Please try again later.",
  });

const readBrowserJsonResponse = async (response: Response): Promise<unknown> => {
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

export const fetchWikiDraftWikis = async ({
  fallbackErrorMessage,
  onlyMine,
  page,
  perPage,
  resourceType,
  status,
  translationSetIdentifier,
}: {
  fallbackErrorMessage: string;
  onlyMine?: boolean;
  page: number;
  perPage: number;
  resourceType?: string;
  status: WikiDraftWikiStatus;
  translationSetIdentifier?: string;
}): Promise<WikiDraftWikiListResponse> => {
  const url = new URL("/api/wiki/draft-wikis", window.location.origin);

  url.searchParams.set("status", status);
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("page", String(page));

  if (onlyMine !== undefined) {
    url.searchParams.set("onlyMine", String(onlyMine));
  }

  if (resourceType) {
    url.searchParams.set("resourceType", resourceType);
  }

  if (translationSetIdentifier) {
    url.searchParams.set("translationSetIdentifier", translationSetIdentifier);
  }

  const response = await fetch(`${url.pathname}${url.search}`, {
    credentials: "include",
  });
  const body = await readBrowserJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return wikiDraftWikiListResponseSchema.parse(body);
};

export const loadDraftWikiState = async (
  language: string,
  slug: string,
): Promise<DraftWikiState> => {
  const client = createDraftWikiApiClient();

  if (!client) {
    return {
      status: "error",
      message: "Wiki draft API is not configured.",
    };
  }

  try {
    const wiki = await fetchDraftWiki(client, language, slug);

    return wiki ? { status: "success", data: wiki } : { status: "empty" };
  } catch (error) {
    return {
      status: "error",
      message: getDraftWikiErrorMessage(error),
    };
  }
};
