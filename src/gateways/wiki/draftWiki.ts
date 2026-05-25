import { createMockWikiDetail, type WikiDetail } from "@kpool/wiki";
import { wikiPrivateApiTypes } from "@kpool/types";
import { z } from "zod";

import {
  getWikiResourceTypeFromSlug,
  toWikiSectionContentPayload,
  type WikiResourceType,
} from "@kpool/wiki";
import {
  adaptWikiApiResponse,
  getWikiApiErrorMessage,
  trimTrailingSlashes,
  withWikiApiPrefix,
} from "@kpool/wiki";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getPublicWikiEndpointPath,
  publicWikiApiResponseSchema,
} from "@/gateways/wiki/publicWiki";

const draftWikiApiResponseSchema = z
  .union([
    wikiPrivateApiTypes.schemas.AgencyDraftWikiDetail,
    wikiPrivateApiTypes.schemas.DraftWikiDetail,
    wikiPrivateApiTypes.schemas.SongDraftWikiDetail,
    wikiPrivateApiTypes.schemas.TalentDraftWikiDetail,
  ])
  .and(
    z
      .object({
        translationSetIdentifier: z.string(),
      })
      .passthrough(),
  );

const submitWikiRequestBodySchema = wikiPrivateApiTypes.schemas.WikiWorkflowRequestBody.and(
  z.object({
    resourceType: z.string(),
    wikiId: z.string(),
  }),
);
const reviewWikiRequestBodySchema = wikiPrivateApiTypes.schemas.WikiWorkflowRequestBody.and(
  z.object({
    resourceType: z.string(),
  }),
);

type DraftWikiApiResponse = z.infer<typeof draftWikiApiResponseSchema>;
type EditWikiRequestBody = z.infer<typeof wikiPrivateApiTypes.schemas.UpdateWikiDraftRequestBody>;
type SubmitWikiRequestBody = z.infer<typeof submitWikiRequestBodySchema>;
type ReviewWikiRequestBody = z.infer<typeof reviewWikiRequestBodySchema>;
type DraftWikiSummary = z.infer<typeof wikiPrivateApiTypes.schemas.DraftWikiSummary>;
type CreateWikiRequestBody = z.infer<typeof wikiPrivateApiTypes.schemas.CreateWikiRequestBody>;
type PublicWikiApiResponse = z.infer<typeof publicWikiApiResponseSchema>;
export type WikiDraftWiki = z.infer<typeof wikiPrivateApiTypes.schemas.DraftWikiListItem>;
export type WikiDraftWikiStatus = z.infer<typeof wikiPrivateApiTypes.schemas.DraftWikiStatus>;
export type WikiDraftWikiListResponse = z.infer<typeof wikiPrivateApiTypes.schemas.ListDraftWikisResponseBody>;
export type WikiDraftReviewAction = "approve" | "reject";
export type WikiDraftWorkflowAction = WikiDraftReviewAction | "publish";
type DraftWikiApiClient = {
  baseUrl: string;
  fetchDraftWiki: (
    language: string,
    resourceType: WikiResourceType,
    slug: string,
  ) => Promise<DraftWikiApiResponse>;
  fetchPublicWiki: (
    language: string,
    resourceType: WikiResourceType,
    slug: string,
  ) => Promise<PublicWikiApiResponse>;
  createWikiDraft: (body: CreateWikiRequestBody) => Promise<DraftWikiSummary>;
  saveDraftWiki: (wikiId: string, body: EditWikiRequestBody) => Promise<DraftWikiSummary>;
  reviewDraftWiki: (
    wikiId: string,
    action: WikiDraftWorkflowAction,
    body: ReviewWikiRequestBody,
  ) => Promise<DraftWikiSummary>;
  submitDraftWiki: (wikiId: string, body: SubmitWikiRequestBody) => Promise<DraftWikiSummary>;
};

export const defaultWikiDraftPerPage = 12;
export const wikiDraftWikiListResponseSchema = wikiPrivateApiTypes.schemas.ListDraftWikisResponseBody;
export const wikiDraftReviewCsrfHeaderName = "X-KPool-Wiki-Review-Request";
export const wikiDraftReviewCsrfHeaderValue = "1";

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
const isMockWikiGatewayEnabled = (): boolean =>
  process.env.KPOOL_ENABLE_MOCK_WIKI_GATEWAY === "1";

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
  parseWithSchemaLog("wiki draft summary response", wikiPrivateApiTypes.schemas.DraftWikiSummary, body);

const parseCreateWikiRequestBody = (body: unknown): CreateWikiRequestBody =>
  parseWithSchemaLog("wiki create request", wikiPrivateApiTypes.schemas.CreateWikiRequestBody, body);

const parsePublicWikiResponseBody = (body: unknown): PublicWikiApiResponse =>
  parseWithSchemaLog("public wiki detail response", publicWikiApiResponseSchema, body);

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

export const getCreateWikiEndpointPath = (): string => "/wiki/create";

export const getSubmitWikiEndpointPath = (wikiId: string): string =>
  `/wiki/${encodeURIComponent(wikiId)}/submit`;

export const getReviewWikiEndpointPath = (
  wikiId: string,
  action: WikiDraftWorkflowAction,
): string =>
  `/wiki/${encodeURIComponent(wikiId)}/${action}`;

export const getPublishWikiEndpointPath = (wikiId: string): string =>
  getReviewWikiEndpointPath(wikiId, "publish");

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

const getPublicWikiAssociationSource = (
  publicWiki: PublicWikiApiResponse,
): Record<string, unknown> => {
  const basic =
    typeof publicWiki.basic === "object" && publicWiki.basic !== null
      ? (publicWiki.basic as Record<string, unknown>)
      : {};

  return {
    ...basic,
    ...publicWiki,
  };
};

export const createWikiDraftRequestBodyFromPublicWiki = (
  publicWiki: PublicWikiApiResponse,
): CreateWikiRequestBody => {
  const source = getPublicWikiAssociationSource(publicWiki);
  const publicWikiDetail = adaptWikiApiResponse(publicWiki);
  const body: Record<string, unknown> = {
    basic: publicWiki.basic,
    publishedWikiIdentifier: publicWiki.wikiIdentifier,
    sections: toWikiSectionContentPayload(publicWikiDetail.sections),
  };

  copyStringProperty(source, body, "language");
  copyStringProperty(source, body, "resourceType");
  copyStringProperty(source, body, "slug");
  copyStringProperty(source, body, "themeColor");
  copyStringProperty(source, body, "agencyIdentifier");
  copyStringArrayProperty(source, body, "groupIdentifiers");
  copyStringArrayProperty(source, body, "talentIdentifiers");

  if (typeof publicWiki.heroImage?.imageIdentifier === "string") {
    body.imageIdentifier = publicWiki.heroImage.imageIdentifier;
  }

  return parseCreateWikiRequestBody(body);
};

const isNotFoundApiError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "response" in error &&
  typeof (error as { response?: unknown }).response === "object" &&
  (error as { response?: unknown }).response !== null &&
  (error as { response: { status?: unknown } }).response.status === 404;

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

  return parseWithSchemaLog("wiki submit request", submitWikiRequestBodySchema, body);
};

export const createReviewWikiRequestBody = (
  draft: Pick<WikiDraftWiki, "resourceType" | "wikiIdentifier"> & Record<string, unknown>,
): ReviewWikiRequestBody => {
  const body: Record<string, unknown> = {
    resourceType: draft.resourceType,
  };

  copyStringProperty(draft, body, "agencyIdentifier");
  copyStringArrayProperty(draft, body, "groupIdentifiers");
  copyStringArrayProperty(draft, body, "talentIdentifiers");

  return parseWithSchemaLog("wiki review request", reviewWikiRequestBodySchema, body);
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

  try {
    const response = await client.fetchDraftWiki(language, resourceType, slug);

    return adaptDraftWikiResponse(response);
  } catch (error) {
    if (!isNotFoundApiError(error)) {
      throw error;
    }

    const publicWiki = await client.fetchPublicWiki(language, resourceType, slug);
    const createBody = createWikiDraftRequestBodyFromPublicWiki(publicWiki);

    await client.createWikiDraft(createBody);

    const response = await client.fetchDraftWiki(language, resourceType, slug);

    return adaptDraftWikiResponse(response);
  }
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

export const reviewDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
  action: WikiDraftWorkflowAction,
  body: ReviewWikiRequestBody,
): Promise<DraftWikiSummary> =>
  client.reviewDraftWiki(wikiId, action, body);

export const publishDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
  body: ReviewWikiRequestBody,
): Promise<DraftWikiSummary> =>
  client.reviewDraftWiki(wikiId, "publish", body);

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
        fetchPublicWiki: async (language, resourceType, slug) => {
          const response = await fetch(
            `${apiBaseUrl}${getPublicWikiEndpointPath(language, resourceType, slug)}`,
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

          return parsePublicWikiResponseBody(responseBody);
        },
        createWikiDraft: async (body) => {
          const response = await fetch(
            `${apiBaseUrl}${getCreateWikiEndpointPath()}`,
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
        reviewDraftWiki: async (wikiId, action, body) => {
          const response = await fetch(
            `${apiBaseUrl}${getReviewWikiEndpointPath(wikiId, action)}`,
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

  return parseWithSchemaLog("wiki draft list response", wikiDraftWikiListResponseSchema, body);
};

const reviewWikiDraftRequest = async ({
  action,
  fallbackErrorMessage,
  wikiId,
  requestBody,
}: {
  action: WikiDraftWorkflowAction;
  fallbackErrorMessage: string;
  wikiId: string;
  requestBody: ReviewWikiRequestBody;
}): Promise<DraftWikiSummary> => {
  const response = await fetch(
    `/api/wiki/drafts/${encodeURIComponent(wikiId)}/${action}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        [wikiDraftReviewCsrfHeaderName]: wikiDraftReviewCsrfHeaderValue,
      },
      body: JSON.stringify(requestBody),
    },
  );
  const body = await readBrowserJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseDraftWikiSummaryBody(body);
};

export const approveWikiDraft = async ({
  fallbackErrorMessage,
  wikiId,
  requestBody,
}: {
  fallbackErrorMessage: string;
  wikiId: string;
  requestBody: ReviewWikiRequestBody;
}): Promise<DraftWikiSummary> =>
  reviewWikiDraftRequest({
    action: "approve",
    fallbackErrorMessage,
    wikiId,
    requestBody,
  });

export const rejectWikiDraft = async ({
  fallbackErrorMessage,
  wikiId,
  requestBody,
}: {
  fallbackErrorMessage: string;
  wikiId: string;
  requestBody: ReviewWikiRequestBody;
}): Promise<DraftWikiSummary> =>
  reviewWikiDraftRequest({
    action: "reject",
    fallbackErrorMessage,
    wikiId,
    requestBody,
  });

export const publishWikiDraft = async ({
  fallbackErrorMessage,
  wikiId,
  requestBody,
}: {
  fallbackErrorMessage: string;
  wikiId: string;
  requestBody: ReviewWikiRequestBody;
}): Promise<DraftWikiSummary> =>
  reviewWikiDraftRequest({
    action: "publish",
    fallbackErrorMessage,
    wikiId,
    requestBody,
  });

export const loadDraftWikiState = async (
  language: string,
  slug: string,
  forwardedHeaders: HeadersInit = {},
): Promise<DraftWikiState> => {
  if (isMockWikiGatewayEnabled()) {
    return slug === "empty"
      ? { status: "empty" }
      : {
          status: "success",
          data: {
            ...createMockWikiDetail(slug),
            language,
          },
        };
  }

  const client = createDraftWikiApiClient(getDefaultApiBaseUrl(), forwardedHeaders);

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
