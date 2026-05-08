import { type WikiDetail, type WikiDetailState } from "@kpool/wiki";
import { z } from "zod";

import {
  getWikiResourceTypeFromSlug,
  wikiResourceTypes,
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

const publicWikiListItemSchema = z
  .object({
    wikiIdentifier: z.string(),
    slug: z.string(),
    language: z.string(),
    resourceType: z.enum(wikiResourceTypes),
    version: z.number().int(),
    themeColor: z.string().nullable().optional(),
    heroImage: publicWikiHeroImageSchema.nullable().optional(),
    name: z.string(),
    normalizedName: z.string(),
    publishedAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
  })
  .passthrough();

export const publicWikiListApiResponseSchema = z
  .object({
    wikis: z.array(publicWikiListItemSchema),
    current_page: z.number().int(),
    last_page: z.number().int(),
    total: z.number().int(),
    per_page: z.number().int(),
  })
  .passthrough();

export type PublicWikiListItem = z.infer<typeof publicWikiListItemSchema>;

export type PublicWikiList = {
  wikis: PublicWikiListItem[];
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
};

export type PublicWikiListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; data: PublicWikiList };

export type PublicWikiListQuery = {
  keyword?: string;
  order?: "asc" | "desc";
  page?: number;
  perPage?: number;
  resourceType?: WikiResourceType;
  sort?: "name" | "updatedAt";
};

export type PublicWikiApiClient = {
  fetchWiki: (
    language: string,
    resourceType: WikiResourceType,
    slug: string,
  ) => Promise<unknown>;
  fetchWikiList: (language: string, query: PublicWikiListQuery) => Promise<unknown>;
};

const defaultApiBaseUrl = process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;

export const getPublicWikiEndpointPath = (
  language: string,
  resourceType: WikiResourceType,
  slug: string,
): string =>
  `/wiki/${encodeURIComponent(language)}/${resourceType}/${encodeURIComponent(slug)}`;

const appendQueryParam = (
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void => {
  if (value !== undefined && String(value).length > 0) {
    params.set(key, String(value));
  }
};

export const getPublicWikiListEndpointPath = (
  language: string,
  query: PublicWikiListQuery = {},
): string => {
  const params = new URLSearchParams();

  appendQueryParam(params, "perPage", query.perPage);
  appendQueryParam(params, "resourceType", query.resourceType);
  appendQueryParam(params, "keyword", query.keyword);
  appendQueryParam(params, "sort", query.sort);
  appendQueryParam(params, "order", query.order);
  appendQueryParam(params, "page", query.page);

  const queryString = params.toString();

  return `/wikis/${encodeURIComponent(language)}${queryString ? `?${queryString}` : ""}`;
};

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
    fetchWikiList: async (language, query) => {
      const response = await fetch(
        `${apiBaseUrl}${getPublicWikiListEndpointPath(language, query)}`,
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

export const adaptPublicWikiListResponse = (
  response: z.infer<typeof publicWikiListApiResponseSchema>,
): PublicWikiList => ({
  currentPage: response.current_page,
  lastPage: response.last_page,
  perPage: response.per_page,
  total: response.total,
  wikis: response.wikis,
});

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

export const fetchPublicWikiList = async (
  client: PublicWikiApiClient,
  language: string,
  query: PublicWikiListQuery,
): Promise<PublicWikiList> => {
  const response = await client.fetchWikiList(language, query);

  return adaptPublicWikiListResponse(publicWikiListApiResponseSchema.parse(response));
};

export const getPublicWikiErrorMessage = (error: unknown): string =>
  getWikiApiErrorMessage(error, {
    notFound: "Public wiki was not found.",
    requestFailedPrefix: "Public wiki request failed with status",
    responseSchemaPrefix: "Public wiki response did not match the expected schema",
    unavailable: "Public wikis are temporarily unavailable. Please try again later.",
  });

export const getPublicWikiListErrorMessage = (error: unknown): string =>
  getWikiApiErrorMessage(error, {
    notFound: "Public wikis were not found.",
    requestFailedPrefix: "Public wiki list request failed with status",
    responseSchemaPrefix:
      "Public wiki list response did not match the expected schema",
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

export const loadPublicWikiListState = async (
  language: string,
  query: PublicWikiListQuery,
): Promise<PublicWikiListState> => {
  const client = createPublicWikiApiClient();

  if (!client) {
    return {
      status: "error",
      message: "Wiki API is not configured.",
    };
  }

  try {
    const wikiList = await fetchPublicWikiList(client, language, query);

    return wikiList.wikis.length > 0
      ? { status: "success", data: wikiList }
      : { status: "empty" };
  } catch (error) {
    return {
      status: "error",
      message: getPublicWikiListErrorMessage(error),
    };
  }
};
