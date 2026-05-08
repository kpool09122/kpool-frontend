import { type WikiDetail } from "@kpool/wiki";
import {
  createApiClient,
  schemas,
} from "@kpool/types/wiki-private-api";
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

const draftWikiApiResponseSchema = z.union([
  schemas.AgencyDraftWikiDetail,
  schemas.DraftWikiDetail,
  schemas.SongDraftWikiDetail,
  schemas.TalentDraftWikiDetail,
]);

type DraftWikiApiClient = ReturnType<typeof createApiClient>;
type DraftWikiApiResponse = z.infer<typeof draftWikiApiResponseSchema>;
type EditWikiRequestBody = z.infer<typeof schemas.UpdateWikiDraftRequestBody>;
type DraftWikiSummary = z.infer<typeof schemas.DraftWikiSummary>;

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

export const adaptDraftWikiResponse = (response: DraftWikiApiResponse): WikiDetail =>
  adaptWikiApiResponse(response);

export const getDraftWikiAlias = (
  slug: string,
): (typeof draftWikiAliasByResourceType)[WikiResourceType] | null => {
  const resourceType = getWikiResourceTypeFromSlug(slug);

  return resourceType ? draftWikiAliasByResourceType[resourceType] : null;
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

  const response = await client[alias]({
    params: {
      language,
      slug,
    },
  });

  return adaptDraftWikiResponse(draftWikiApiResponseSchema.parse(response));
};

export const saveDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
  body: EditWikiRequestBody,
): Promise<DraftWikiSummary> =>
  schemas.DraftWikiSummary.parse(
    await client.WikiOperations_editWiki(body, {
      params: {
        wikiId,
      },
    }),
  );

export const createDraftWikiApiClient = (
  baseUrl: string = defaultApiBaseUrl ?? "",
): DraftWikiApiClient | null =>
  baseUrl ? createApiClient(withWikiApiPrefix(baseUrl)) : null;

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
