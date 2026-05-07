import { type WikiDetail, type WikiDetailState } from "@kpool/wiki";
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

const publicWikiHeroImageSchema = z
  .object({
    imageIdentifier: z.string().nullable().optional(),
    src: z.string().optional(),
    alt: z.string().nullable().optional(),
  })
  .passthrough();

export const publicWikiApiResponseSchema = z
  .object({
    wikiIdentifier: z.string(),
    slug: z.string(),
    language: z.string(),
    resourceType: z.string(),
    version: z.number().int(),
    themeColor: z.string().nullable().optional(),
    heroImage: publicWikiHeroImageSchema.nullable().optional(),
    basic: z.unknown(),
    sections: z.array(z.unknown()),
  })
  .passthrough();

type PublicWikiApiResponse = z.infer<typeof publicWikiApiResponseSchema>;

export type PublicWikiApiClient = {
  fetchWiki: (
    language: string,
    resourceType: WikiResourceType,
    slug: string,
  ) => Promise<unknown>;
};

const defaultApiBaseUrl = process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;

export const getPublicWikiEndpointPath = (
  language: string,
  resourceType: WikiResourceType,
  slug: string,
): string =>
  `/wiki/${encodeURIComponent(language)}/${resourceType}/${encodeURIComponent(slug)}`;

export const createPublicWikiApiClient = (
  baseUrl: string = defaultApiBaseUrl ?? "",
): PublicWikiApiClient | null => {
  if (!baseUrl) {
    return null;
  }

  const apiBaseUrl = withWikiApiPrefix(baseUrl);

  return {
    fetchWiki: async (language, resourceType, slug) => {
      const response = await fetch(
        `${apiBaseUrl}${getPublicWikiEndpointPath(language, resourceType, slug)}`,
        {
          headers: {
            accept: "application/json",
          },
          next: {
            revalidate: 60,
          },
        },
      );

      if (!response.ok) {
        throw {
          response: {
            status: response.status,
            data: await response.json().catch(() => null),
          },
        };
      }

      return response.json();
    },
  };
};

export const adaptPublicWikiResponse = (
  response: PublicWikiApiResponse,
): WikiDetail => adaptWikiApiResponse(response);

export const fetchPublicWiki = async (
  client: PublicWikiApiClient,
  language: string,
  slug: string,
): Promise<WikiDetail | null> => {
  const resourceType = getWikiResourceTypeFromSlug(slug);

  if (!resourceType) {
    return null;
  }

  const response = await client.fetchWiki(language, resourceType, slug);

  return adaptPublicWikiResponse(publicWikiApiResponseSchema.parse(response));
};

export const getPublicWikiErrorMessage = (error: unknown): string =>
  getWikiApiErrorMessage(error, {
    notFound: "Public wiki was not found.",
    requestFailedPrefix: "Public wiki request failed with status",
    responseSchemaPrefix: "Public wiki response did not match the expected schema",
    unavailable: "Public wikis are temporarily unavailable. Please try again later.",
  });

export const loadPublicWikiState = async (
  language: string,
  slug: string,
): Promise<WikiDetailState> => {
  const client = createPublicWikiApiClient();

  if (!client) {
    return {
      status: "error",
      message: "Wiki API is not configured.",
    };
  }

  try {
    const wiki = await fetchPublicWiki(client, language, slug);

    return wiki ? { status: "success", data: wiki } : { status: "empty" };
  } catch (error) {
    return {
      status: "error",
      message: getPublicWikiErrorMessage(error),
    };
  }
};
