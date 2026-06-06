import { createMockWikiDetail, type WikiDraftDetail } from "@kpool/wiki";
import { wikiPrivateApiTypes } from "@kpool/types";
import { z } from "zod";

import {
  getWikiResourceTypeFromSlug,
  toWikiSectionContentPayload,
  type WikiResourceType,
} from "@kpool/wiki";
import {
  adaptDraftWikiApiResponse,
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
import {
  createMockInitialDraftWikis,
  isMockWikiGatewayEnabled,
} from "./mockWikiGateway";

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
const translateWikiRequestBodySchema = reviewWikiRequestBodySchema.and(
  z.object({
    language: z.string(),
  }),
);
const autoCreateWikiRequestBodySchema = z.object({
  resourceType: z.enum(["agency", "group", "song", "talent"]),
  language: z.string(),
  name: z.string(),
  slug: z.string(),
  agencyIdentifier: z.string().nullable(),
  groupIdentifiers: z.array(z.string()),
  talentIdentifiers: z.array(z.string()),
});

type DraftWikiApiResponse = z.infer<typeof draftWikiApiResponseSchema>;
type EditWikiRequestBody = z.infer<typeof wikiPrivateApiTypes.schemas.UpdateWikiDraftRequestBody>;
type DeleteWikiRequestBody = z.infer<typeof wikiPrivateApiTypes.schemas.WikiWorkflowRequestBody>;
type SubmitWikiRequestBody = z.infer<typeof submitWikiRequestBodySchema>;
type ReviewWikiRequestBody = z.infer<typeof reviewWikiRequestBodySchema>;
type TranslateWikiRequestBody = z.infer<typeof translateWikiRequestBodySchema>;
type DraftWikiSummary = z.infer<typeof wikiPrivateApiTypes.schemas.DraftWikiSummary>;
type PublishedWikiSummary = z.infer<typeof wikiPrivateApiTypes.schemas.PublishedWikiSummary>;
type TranslateWikiResponseBody = z.infer<typeof wikiPrivateApiTypes.schemas.TranslateWikiResponseBody>;
type CreateWikiRequestBody = z.infer<typeof wikiPrivateApiTypes.schemas.CreateWikiRequestBody>;
type AutoCreateWikiRequestBody = z.infer<typeof autoCreateWikiRequestBodySchema>;
type PublicWikiApiResponse = z.infer<typeof publicWikiApiResponseSchema>;
export type WikiDraftWiki = z.infer<typeof wikiPrivateApiTypes.schemas.DraftWikiListItem>;
export type WikiDraftWikiStatus = z.infer<typeof wikiPrivateApiTypes.schemas.DraftWikiStatus>;
export type WikiDraftWikiListResponse = z.infer<typeof wikiPrivateApiTypes.schemas.ListDraftWikisResponseBody>;
export type WikiVersionInconsistentWiki = z.infer<typeof wikiPrivateApiTypes.schemas.WikiListItem>;
export type WikiVersionInconsistentWikiListResponse = z.infer<typeof wikiPrivateApiTypes.schemas.ListWikisResponseBody>;
export type WikiDraftReviewAction = "approve" | "reject";
export type WikiDraftWorkflowAction = WikiDraftReviewAction | "publish" | "translate";
type InitialDraftWikiListState = {
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: null;
  pageInfo: { current_page: number; last_page: number; total: number } | null;
  wikis: Array<WikiDraftWiki | WikiVersionInconsistentWiki>;
};
export type InitialDraftWikis = {
  approvedWikis: InitialDraftWikiListState;
  editingWikis: InitialDraftWikiListState;
  submittedWikis: InitialDraftWikiListState;
  unapprovedWikis: InitialDraftWikiListState;
  untranslatedWikis: InitialDraftWikiListState;
};
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
  autoCreateWikiDraft: (body: AutoCreateWikiRequestBody) => Promise<DraftWikiSummary>;
  saveDraftWiki: (wikiId: string, body: EditWikiRequestBody) => Promise<DraftWikiSummary>;
  deleteDraftWiki: (wikiId: string, body: DeleteWikiRequestBody) => Promise<void>;
  reviewDraftWiki: (
    wikiId: string,
    action: WikiDraftWorkflowAction,
    body: ReviewWikiRequestBody | TranslateWikiRequestBody,
  ) => Promise<DraftWikiSummary | PublishedWikiSummary | TranslateWikiResponseBody>;
  submitDraftWiki: (wikiId: string, body: SubmitWikiRequestBody) => Promise<DraftWikiSummary>;
  withdrawDraftWiki: (wikiId: string) => Promise<DraftWikiSummary>;
};

export const defaultWikiDraftPerPage = 12;
export const wikiDraftWikiListResponseSchema = wikiPrivateApiTypes.schemas.ListDraftWikisResponseBody;
export const wikiVersionInconsistentWikiListResponseSchema = wikiPrivateApiTypes.schemas.ListWikisResponseBody;
export const wikiDraftReviewCsrfHeaderName = "X-KPool-Wiki-Review-Request";
export const wikiDraftReviewCsrfHeaderValue = "1";

const createEmptyDraftWikiListState = (): InitialDraftWikiListState => ({
  isInitialLoading: false,
  isLoadingMore: false,
  loadError: null,
  pageInfo: null,
  wikis: [],
});

export const createInitialDraftWikis = (): InitialDraftWikis => ({
  approvedWikis: createEmptyDraftWikiListState(),
  editingWikis: createEmptyDraftWikiListState(),
  submittedWikis: createEmptyDraftWikiListState(),
  unapprovedWikis: createEmptyDraftWikiListState(),
  untranslatedWikis: createEmptyDraftWikiListState(),
});

type DraftWikiState =
  | { status: "success"; data: WikiDraftDetail }
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
  parseWithSchemaLog("wiki draft summary response", wikiPrivateApiTypes.schemas.DraftWikiSummary, body);

const parsePublishedWikiSummaryBody = (body: unknown): PublishedWikiSummary =>
  parseWithSchemaLog("published wiki summary response", wikiPrivateApiTypes.schemas.PublishedWikiSummary, body);

const parseTranslateWikiResponseBody = (body: unknown): TranslateWikiResponseBody =>
  parseWithSchemaLog("translate wiki response", wikiPrivateApiTypes.schemas.TranslateWikiResponseBody, body);

const parseCreateWikiRequestBody = (body: unknown): CreateWikiRequestBody =>
  parseWithSchemaLog("wiki create request", wikiPrivateApiTypes.schemas.CreateWikiRequestBody, body);

const parseAutoCreateWikiRequestBody = (body: unknown): AutoCreateWikiRequestBody =>
  parseWithSchemaLog("wiki auto-create request", autoCreateWikiRequestBodySchema, body);

const parsePublicWikiResponseBody = (body: unknown): PublicWikiApiResponse =>
  parseWithSchemaLog("public wiki detail response", publicWikiApiResponseSchema, body);

export const adaptDraftWikiResponse = (response: DraftWikiApiResponse): WikiDraftDetail =>
  adaptDraftWikiApiResponse(response);

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

export const getDeleteWikiEndpointPath = (wikiId: string): string =>
  `/wiki/${encodeURIComponent(wikiId)}`;

export const getCreateWikiEndpointPath = (): string => "/wiki/create";

export const getAutoCreateWikiEndpointPath = (): string => "/wiki/auto-create";

export const getSubmitWikiEndpointPath = (wikiId: string): string =>
  `/wiki/${encodeURIComponent(wikiId)}/submit`;

export const getWithdrawWikiEndpointPath = (wikiId: string): string =>
  `/wiki/${encodeURIComponent(wikiId)}/withdraw`;

export const getReviewWikiEndpointPath = (
  wikiId: string,
  action: WikiDraftWorkflowAction,
): string =>
  `/wiki/${encodeURIComponent(wikiId)}/${action}`;

export const getPublishWikiEndpointPath = (wikiId: string): string =>
  getReviewWikiEndpointPath(wikiId, "publish");

export const getVersionInconsistentWikisEndpointPath = (): string =>
  "/wikis/version-inconsistencies";

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

export const createWikiRequestBodyFromInitialFields = ({
  language,
  name,
  resourceType,
  slug,
}: {
  language: string;
  name: string;
  resourceType: WikiResourceType;
  slug: string;
}): CreateWikiRequestBody =>
  parseCreateWikiRequestBody({
    language,
    resourceType,
    slug,
    basic: {
      name,
      normalizedName: "",
      resourceType,
    },
    sections: [],
  });

export const createAutoCreateWikiRequestBodyFromInitialFields = ({
  agencyIdentifier = null,
  groupIdentifiers = [],
  language,
  name,
  resourceType,
  slug,
  talentIdentifiers = [],
}: {
  agencyIdentifier?: string | null;
  groupIdentifiers?: string[];
  language: string;
  name: string;
  resourceType: WikiResourceType;
  slug: string;
  talentIdentifiers?: string[];
}): AutoCreateWikiRequestBody =>
  parseAutoCreateWikiRequestBody({
    resourceType,
    language,
    name,
    slug,
    agencyIdentifier,
    groupIdentifiers,
    talentIdentifiers,
  });

const isNotFoundApiError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "response" in error &&
  typeof (error as { response?: unknown }).response === "object" &&
  (error as { response?: unknown }).response !== null &&
  (error as { response: { status?: unknown } }).response.status === 404;

export const createSubmitWikiRequestBody = (
  draft: Pick<WikiDraftDetail, "resourceType" | "wikiIdentifier"> & Record<string, unknown>,
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

export const createDeleteWikiRequestBody = (
  draft: Record<string, unknown>,
): DeleteWikiRequestBody => {
  const body: Record<string, unknown> = {};

  copyStringProperty(draft, body, "agencyIdentifier");
  copyStringArrayProperty(draft, body, "groupIdentifiers");
  copyStringArrayProperty(draft, body, "talentIdentifiers");

  return parseWithSchemaLog(
    "wiki delete request",
    wikiPrivateApiTypes.schemas.WikiWorkflowRequestBody,
    body,
  );
};

export const createTranslateWikiRequestBody = (
  wiki: Pick<WikiVersionInconsistentWiki, "language" | "resourceType" | "wikiIdentifier"> &
    Record<string, unknown>,
): TranslateWikiRequestBody => {
  const body: Record<string, unknown> = {
    language: wiki.language,
    resourceType: wiki.resourceType,
  };

  copyStringProperty(wiki, body, "agencyIdentifier");
  copyStringArrayProperty(wiki, body, "groupIdentifiers");
  copyStringArrayProperty(wiki, body, "talentIdentifiers");

  return parseWithSchemaLog("wiki translate request", translateWikiRequestBodySchema, body);
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

export const createVersionInconsistentWikisUrl = ({
  baseUrl,
  order,
  page,
  perPage,
  resourceType,
  sort,
}: {
  baseUrl: string;
  order?: "asc" | "desc";
  page: number;
  perPage: number;
  resourceType?: string;
  sort?: "name" | "updatedAt";
}): string => {
  const url = new URL(`${trimTrailingSlashes(baseUrl)}${getVersionInconsistentWikisEndpointPath()}`);

  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("page", String(page));

  if (resourceType) {
    url.searchParams.set("resourceType", resourceType);
  }

  if (sort) {
    url.searchParams.set("sort", sort);
  }

  if (order) {
    url.searchParams.set("order", order);
  }

  return url.toString();
};

export const fetchDraftWiki = async (
  client: DraftWikiApiClient,
  language: string,
  slug: string,
): Promise<WikiDraftDetail | null> => {
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

export const deleteDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
  body: DeleteWikiRequestBody,
): Promise<void> =>
  client.deleteDraftWiki(wikiId, body);

export const submitDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
  body: SubmitWikiRequestBody,
): Promise<DraftWikiSummary> =>
  client.submitDraftWiki(wikiId, body);

export const withdrawDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
): Promise<DraftWikiSummary> =>
  client.withdrawDraftWiki(wikiId);

export const reviewDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
  action: WikiDraftWorkflowAction,
  body: ReviewWikiRequestBody | TranslateWikiRequestBody,
): Promise<DraftWikiSummary | PublishedWikiSummary | TranslateWikiResponseBody> =>
  client.reviewDraftWiki(wikiId, action, body);

export const publishDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
  body: ReviewWikiRequestBody,
): Promise<PublishedWikiSummary> =>
  client.reviewDraftWiki(wikiId, "publish", body) as Promise<PublishedWikiSummary>;

export const translateDraftWiki = async (
  client: DraftWikiApiClient,
  wikiId: string,
  body: TranslateWikiRequestBody,
): Promise<TranslateWikiResponseBody> =>
  client.reviewDraftWiki(wikiId, "translate", body) as Promise<TranslateWikiResponseBody>;

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
        autoCreateWikiDraft: async (body) => {
          const response = await fetch(
            `${apiBaseUrl}${getAutoCreateWikiEndpointPath()}`,
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
        deleteDraftWiki: async (wikiId, body) => {
          const response = await fetch(
            `${apiBaseUrl}${getDeleteWikiEndpointPath(wikiId)}`,
            {
              method: "DELETE",
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

          return action === "publish"
            ? parsePublishedWikiSummaryBody(responseBody)
            : action === "translate"
              ? parseTranslateWikiResponseBody(responseBody)
              : parseDraftWikiSummaryBody(responseBody);
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
        withdrawDraftWiki: async (wikiId) => {
          const response = await fetch(
            `${apiBaseUrl}${getWithdrawWikiEndpointPath(wikiId)}`,
            {
              method: "POST",
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

export const createWiki = async ({
  fallbackErrorMessage,
  requestBody,
}: {
  fallbackErrorMessage: string;
  requestBody: CreateWikiRequestBody;
}): Promise<DraftWikiSummary> => {
  const response = await fetch("/api/wiki/draft-wikis", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const body = await readBrowserJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseDraftWikiSummaryBody(body);
};

export const autoCreateWiki = async ({
  fallbackErrorMessage,
  requestBody,
}: {
  fallbackErrorMessage: string;
  requestBody: AutoCreateWikiRequestBody;
}): Promise<DraftWikiSummary> => {
  const response = await fetch("/api/wiki/draft-wikis/auto-create", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const body = await readBrowserJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseDraftWikiSummaryBody(body);
};

export const fetchVersionInconsistentWikis = async ({
  fallbackErrorMessage,
  order,
  page,
  perPage,
  resourceType,
  sort,
}: {
  fallbackErrorMessage: string;
  order?: "asc" | "desc";
  page: number;
  perPage: number;
  resourceType?: string;
  sort?: "name" | "updatedAt";
}): Promise<WikiVersionInconsistentWikiListResponse> => {
  const url = new URL("/api/wiki/version-inconsistent-wikis", window.location.origin);

  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("page", String(page));

  if (resourceType) {
    url.searchParams.set("resourceType", resourceType);
  }

  if (sort) {
    url.searchParams.set("sort", sort);
  }

  if (order) {
    url.searchParams.set("order", order);
  }

  const response = await fetch(`${url.pathname}${url.search}`, {
    credentials: "include",
  });
  const body = await readBrowserJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog(
    "wiki version inconsistent list response",
    wikiVersionInconsistentWikiListResponseSchema,
    body,
  );
};

export const loadInitialDraftWikisForRequest = async (
  cookieHeader: string,
): Promise<InitialDraftWikis> => {
  if (isMockWikiGatewayEnabled()) {
    return createMockInitialDraftWikis();
  }

  const configuredBaseUrl = getDefaultApiBaseUrl();
  const baseUrl = configuredBaseUrl ? withWikiApiPrefix(configuredBaseUrl) : "";

  if (!baseUrl) {
    return createInitialDraftWikis();
  }

  try {
    const response = await fetch(
      createWikiDraftWikisUrl({
        baseUrl,
        onlyMine: true,
        page: 1,
        perPage: defaultWikiDraftPerPage,
        status: "pending",
      }),
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Cookie: cookieHeader,
        },
      },
    );

    if (!response.ok) {
      return createInitialDraftWikis();
    }

    const bodyResult = wikiDraftWikiListResponseSchema.safeParse(await response.json());

    if (!bodyResult.success) {
      return createInitialDraftWikis();
    }

    const body = bodyResult.data;

    return {
      ...createInitialDraftWikis(),
      editingWikis: {
        isInitialLoading: false,
        isLoadingMore: false,
        loadError: null,
        pageInfo: {
          current_page: body.current_page,
          last_page: body.last_page,
          total: body.total,
        },
        wikis: body.wikis,
      },
    };
  } catch {
    return createInitialDraftWikis();
  }
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
  requestBody: ReviewWikiRequestBody | TranslateWikiRequestBody;
}): Promise<DraftWikiSummary | PublishedWikiSummary | TranslateWikiResponseBody> => {
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

  return action === "publish"
    ? parsePublishedWikiSummaryBody(body)
    : action === "translate"
      ? parseTranslateWikiResponseBody(body)
      : parseDraftWikiSummaryBody(body);
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
  }) as Promise<DraftWikiSummary>;

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
  }) as Promise<DraftWikiSummary>;

export const deleteWikiDraft = async ({
  fallbackErrorMessage,
  requestBody,
  wikiId,
}: {
  fallbackErrorMessage: string;
  requestBody: DeleteWikiRequestBody;
  wikiId: string;
}): Promise<void> => {
  const response = await fetch(
    `/api/wiki/drafts/${encodeURIComponent(wikiId)}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );
  const body = await readBrowserJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }
};

export const publishWikiDraft = async ({
  fallbackErrorMessage,
  wikiId,
  requestBody,
}: {
  fallbackErrorMessage: string;
  wikiId: string;
  requestBody: ReviewWikiRequestBody;
}): Promise<PublishedWikiSummary> =>
  reviewWikiDraftRequest({
    action: "publish",
    fallbackErrorMessage,
    wikiId,
    requestBody,
  }) as Promise<PublishedWikiSummary>;

export const translateWikiDraft = async ({
  fallbackErrorMessage,
  wikiId,
  requestBody,
}: {
  fallbackErrorMessage: string;
  wikiId: string;
  requestBody: TranslateWikiRequestBody;
}): Promise<TranslateWikiResponseBody> =>
  reviewWikiDraftRequest({
    action: "translate",
    fallbackErrorMessage,
    wikiId,
    requestBody,
  }) as Promise<TranslateWikiResponseBody>;

export const withdrawWikiDraft = async ({
  fallbackErrorMessage,
  wikiId,
}: {
  fallbackErrorMessage: string;
  wikiId: string;
}): Promise<DraftWikiSummary> => {
  const response = await fetch(
    `/api/wiki/drafts/${encodeURIComponent(wikiId)}/withdraw`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    },
  );
  const body = await readBrowserJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseDraftWikiSummaryBody(body);
};

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
