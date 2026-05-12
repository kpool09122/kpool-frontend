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
type DraftWikiSummary = z.infer<typeof schemas.DraftWikiSummary>;
type DraftWikiApiClient = {
  baseUrl: string;
  fetchDraftWiki: (
    language: string,
    resourceType: WikiResourceType,
    slug: string,
  ) => Promise<DraftWikiApiResponse>;
  saveDraftWiki: (wikiId: string, body: EditWikiRequestBody) => Promise<DraftWikiSummary>;
};

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

const defaultApiBaseUrl = process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;

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

export const createDraftWikiApiClient = (
  baseUrl: string = defaultApiBaseUrl ?? "",
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
                accept: "application/json",
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
                accept: "application/json",
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
