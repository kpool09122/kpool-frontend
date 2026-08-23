import { wikiPrivateApiTypes } from "@kpool/types";
import { z } from "zod";

import { getWikiApiErrorMessage, trimTrailingSlashes, withWikiApiPrefix } from "@kpool/wiki";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import { wikiDraftReviewCsrfHeaderName, wikiDraftReviewCsrfHeaderValue } from "./draftWiki";

const officialCertificationRequestSchema = wikiPrivateApiTypes.schemas.RequestCertificationRequestBody;
const officialCertificationSummarySchema = wikiPrivateApiTypes.schemas.OfficialCertificationSummary;
const officialCertificationListResponseSchema = z.object({
  officialCertifications: z.array(wikiPrivateApiTypes.schemas.OfficialCertificationListItem),
  current_page: z.number().int(),
  last_page: z.number().int(),
  total: z.number().int(),
  per_page: z.number().int(),
}).passthrough();
const myOwnedWikisResponseSchema = wikiPrivateApiTypes.schemas.ListMyOwnedWikisResponseBody;
const relatedWikisResponseSchema = wikiPrivateApiTypes.schemas.ListRelatedWikisResponseBody;
const relatedWikisResourceTypeSchema = z.enum(["agency", "talent"]);
const syncOwnedWikiCertificationsRequestSchema = wikiPrivateApiTypes.schemas.SyncOwnedWikiCertificationsRequestBody;
const syncOwnedWikiCertificationsResponseSchema = z.object({
  approved: z.array(wikiPrivateApiTypes.schemas.SyncedOfficialCertificationResource),
  rejected: z.array(wikiPrivateApiTypes.schemas.SyncedOfficialCertificationResource),
  unchanged: z.array(wikiPrivateApiTypes.schemas.SyncedOfficialCertificationResource),
}).passthrough();
const officialCertificationActionRequestSchema = z.object({
  certificationIdentifier: z.string().uuid(),
});

export type OfficialCertificationRequest = z.infer<typeof officialCertificationRequestSchema>;
export type OfficialCertificationSummary = z.infer<typeof officialCertificationSummarySchema>;
export type OfficialCertificationListItem = z.infer<typeof wikiPrivateApiTypes.schemas.OfficialCertificationListItem>;
export type OfficialCertificationListResponse = z.infer<typeof officialCertificationListResponseSchema>;
export type MyOwnedWikisResponse = z.infer<typeof myOwnedWikisResponseSchema>;
export type RelatedWikisResponse = z.infer<typeof relatedWikisResponseSchema>;
export type RelatedWikisResourceType = z.infer<typeof relatedWikisResourceTypeSchema>;
export type SyncOwnedWikiCertificationsRequestBody = z.infer<typeof syncOwnedWikiCertificationsRequestSchema>;
export type SyncOwnedWikiCertificationsResponse = z.infer<typeof syncOwnedWikiCertificationsResponseSchema>;
export type OfficialCertificationActionRequest = z.infer<typeof officialCertificationActionRequestSchema>;
export type OfficialCertificationAction = "approve" | "reject";
export type OfficialCertificationListStatus = "pending" | "approved";

type FetchAdapter = typeof fetch;
type OfficialCertificationApiClient = {
  baseUrl: string;
  fetchAdapter: FetchAdapter;
  headers: HeadersInit;
  listCertifications: (params: {
    page?: number;
    perPage?: number;
    status: OfficialCertificationListStatus;
  }) => Promise<OfficialCertificationListResponse>;
  requestCertification: (body: OfficialCertificationRequest) => Promise<OfficialCertificationSummary>;
  reviewCertification: (certificationIdentifier: string, action: OfficialCertificationAction) => Promise<OfficialCertificationSummary>;
  listMyCertifications: (params: { perPage?: number; status?: OfficialCertificationListStatus }) => Promise<OfficialCertificationListResponse>;
  listMyOwnedWikis: (params: { perPage?: number }) => Promise<MyOwnedWikisResponse>;
  listRelatedWikis: (params: {
    resourceType: RelatedWikisResourceType;
    translationSetIdentifier: string;
  }) => Promise<RelatedWikisResponse>;
  syncOwnedWikiCertifications: (body: SyncOwnedWikiCertificationsRequestBody) => Promise<SyncOwnedWikiCertificationsResponse>;
};

export const defaultOfficialCertificationPerPage = 20;

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

const parseOfficialCertificationRequest = (body: unknown): OfficialCertificationRequest => {
  const { resourceType, translationSetIdentifier } = parseWithSchemaLog(
    "official certification request",
    officialCertificationRequestSchema,
    body,
  );

  return { resourceType, translationSetIdentifier };
};

const parseOfficialCertificationSummary = (body: unknown): OfficialCertificationSummary =>
  parseWithSchemaLog("official certification response", officialCertificationSummarySchema, body);

const parseOfficialCertificationListResponse = (body: unknown): OfficialCertificationListResponse =>
  parseWithSchemaLog("official certification list response", officialCertificationListResponseSchema, body);

const parseOfficialCertificationActionRequest = (body: unknown): OfficialCertificationActionRequest =>
  parseWithSchemaLog("official certification action request", officialCertificationActionRequestSchema, body);

const parseMyOwnedWikisResponse = (body: unknown): MyOwnedWikisResponse =>
  parseWithSchemaLog("my owned wikis response", myOwnedWikisResponseSchema, body);

const parseRelatedWikisResponse = (body: unknown): RelatedWikisResponse =>
  parseWithSchemaLog("related wikis response", relatedWikisResponseSchema, body);

const parseRelatedWikisResourceType = (value: unknown): RelatedWikisResourceType =>
  parseWithSchemaLog("related wikis resource type", relatedWikisResourceTypeSchema, value);

const parseSyncOwnedWikiCertificationsRequest = (body: unknown): SyncOwnedWikiCertificationsRequestBody =>
  parseWithSchemaLog("sync owned wiki certifications request", syncOwnedWikiCertificationsRequestSchema, body);

const parseSyncOwnedWikiCertificationsResponse = (body: unknown): SyncOwnedWikiCertificationsResponse =>
  parseWithSchemaLog("sync owned wiki certifications response", syncOwnedWikiCertificationsResponseSchema, body);

const getOfficialCertificationRequestEndpointPath = (): string => "/official-certification/request";

const getMyOfficialCertificationListEndpointPath = ({
  perPage,
  status,
}: {
  perPage?: number;
  status?: OfficialCertificationListStatus;
}): string => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (perPage) params.set("perPage", String(perPage));
  const query = params.toString();
  return `/my/official-certifications${query ? `?${query}` : ""}`;
};

const getMyOwnedWikisEndpointPath = ({ perPage }: { perPage?: number }): string => {
  const params = new URLSearchParams();
  if (perPage) params.set("perPage", String(perPage));
  const query = params.toString();
  return `/my/owned-wikis${query ? `?${query}` : ""}`;
};

const getRelatedWikisEndpointPath = ({
  resourceType,
  translationSetIdentifier,
}: {
  resourceType: RelatedWikisResourceType;
  translationSetIdentifier: string;
}): string =>
  `/wiki/${encodeURIComponent(resourceType)}/${encodeURIComponent(translationSetIdentifier)}/related-wikis`;

const getSyncOwnedWikiCertificationsEndpointPath = (): string => "/official-certification/owned-wikis";

const getOfficialCertificationListEndpointPath = ({
  page,
  perPage,
  status,
}: {
  page?: number;
  perPage?: number;
  status: OfficialCertificationListStatus;
}): string => {
  const params = new URLSearchParams({ status });

  if (page) {
    params.set("page", String(page));
  }

  if (perPage) {
    params.set("perPage", String(perPage));
  }

  return `/official-certifications?${params.toString()}`;
};

const getOfficialCertificationReviewEndpointPath = (
  certificationIdentifier: string,
  action: OfficialCertificationAction,
): string => `/official-certification/${encodeURIComponent(certificationIdentifier)}/${action}`;

export const officialCertificationUnavailableMessage =
  "Official certification is temporarily unavailable. Please try again later.";

const getOfficialCertificationErrorMessage = (error: unknown, fallbackErrorMessage: string): string =>
  getWikiApiErrorMessage(error, {
    notFound: "Official certification was not found.",
    requestFailedPrefix: "Official certification request failed with status",
    responseSchemaPrefix: "Official certification response did not match the expected schema",
    unavailable: fallbackErrorMessage,
  });

export const createOfficialCertificationRequestBody = ({
  resourceType,
  translationSetIdentifier,
}: OfficialCertificationRequest): OfficialCertificationRequest =>
  parseOfficialCertificationRequest({
    resourceType,
    translationSetIdentifier,
  });

export const createOfficialCertificationActionRequestBody = (
  certificationIdentifier: string,
): OfficialCertificationActionRequest =>
  parseOfficialCertificationActionRequest({ certificationIdentifier });

export const createSyncOwnedWikiCertificationsRequestBody = (
  translationSetIdentifiers: string[],
): SyncOwnedWikiCertificationsRequestBody =>
  parseSyncOwnedWikiCertificationsRequest({ translationSetIdentifiers: Array.from(new Set(translationSetIdentifiers)) });

export const createOfficialCertificationListUrl = ({
  baseUrl,
  page,
  perPage,
  status,
}: {
  baseUrl: string;
  page?: number;
  perPage?: number;
  status: OfficialCertificationListStatus;
}): string => `${trimTrailingSlashes(withWikiApiPrefix(baseUrl))}${getOfficialCertificationListEndpointPath({ page, perPage, status })}`;

export const createOfficialCertificationApiClient = (
  baseUrl = getDefaultApiBaseUrl(),
  headers: HeadersInit = {},
  fetchAdapter: FetchAdapter = fetch,
): OfficialCertificationApiClient | null => {
  if (!baseUrl) {
    return null;
  }

  const resolvedBaseUrl = withWikiApiPrefix(baseUrl);
  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  return {
    baseUrl: resolvedBaseUrl,
    fetchAdapter,
    headers: requestHeaders,
    async listCertifications({ page, perPage, status }) {
      const response = await fetchAdapter(
        `${trimTrailingSlashes(resolvedBaseUrl)}${getOfficialCertificationListEndpointPath({ page, perPage, status })}`,
        {
          method: "GET",
          headers: requestHeaders,
        },
      );

      if (!response.ok) {
        await throwApiError(response);
      }

      return parseOfficialCertificationListResponse(await readResponseBody(response));
    },
    async requestCertification(body) {
      const response = await fetchAdapter(
        `${trimTrailingSlashes(resolvedBaseUrl)}${getOfficialCertificationRequestEndpointPath()}`,
        {
          method: "POST",
          headers: {
            ...requestHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parseOfficialCertificationRequest(body)),
        },
      );

      if (!response.ok) {
        await throwApiError(response);
      }

      return parseOfficialCertificationSummary(await readResponseBody(response));
    },
    async listMyCertifications({ perPage, status }) {
      const response = await fetchAdapter(
        `${trimTrailingSlashes(resolvedBaseUrl)}${getMyOfficialCertificationListEndpointPath({ perPage, status })}`,
        { method: "GET", headers: requestHeaders },
      );
      if (!response.ok) await throwApiError(response);
      return parseOfficialCertificationListResponse(await readResponseBody(response));
    },
    async listMyOwnedWikis({ perPage }) {
      const response = await fetchAdapter(
        `${trimTrailingSlashes(resolvedBaseUrl)}${getMyOwnedWikisEndpointPath({ perPage })}`,
        { method: "GET", headers: requestHeaders },
      );
      if (!response.ok) await throwApiError(response);
      return parseMyOwnedWikisResponse(await readResponseBody(response));
    },
    async listRelatedWikis({ resourceType, translationSetIdentifier }) {
      const response = await fetchAdapter(
        `${trimTrailingSlashes(resolvedBaseUrl)}${getRelatedWikisEndpointPath({
          resourceType: parseRelatedWikisResourceType(resourceType),
          translationSetIdentifier,
        })}`,
        { method: "GET", headers: requestHeaders },
      );
      if (!response.ok) await throwApiError(response);
      return parseRelatedWikisResponse(await readResponseBody(response));
    },
    async syncOwnedWikiCertifications(body) {
      const response = await fetchAdapter(
        `${trimTrailingSlashes(resolvedBaseUrl)}${getSyncOwnedWikiCertificationsEndpointPath()}`,
        {
          method: "PUT",
          headers: { ...requestHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(parseSyncOwnedWikiCertificationsRequest(body)),
        },
      );
      if (!response.ok) await throwApiError(response);
      return parseSyncOwnedWikiCertificationsResponse(await readResponseBody(response));
    },
    async reviewCertification(certificationIdentifier, action) {
      const response = await fetchAdapter(
        `${trimTrailingSlashes(resolvedBaseUrl)}${getOfficialCertificationReviewEndpointPath(certificationIdentifier, action)}`,
        {
          method: "POST",
          headers: requestHeaders,
        },
      );

      if (!response.ok) {
        await throwApiError(response);
      }

      return parseOfficialCertificationSummary(await readResponseBody(response));
    },
  };
};

export const listOfficialCertifications = async (
  client: OfficialCertificationApiClient,
  params: {
    page?: number;
    perPage?: number;
    status: OfficialCertificationListStatus;
  },
): Promise<OfficialCertificationListResponse> => client.listCertifications(params);

export const requestOfficialCertification = async (
  client: OfficialCertificationApiClient,
  body: unknown,
): Promise<OfficialCertificationSummary> =>
  client.requestCertification(parseOfficialCertificationRequest(body));

export const reviewOfficialCertification = async (
  client: OfficialCertificationApiClient,
  body: unknown,
  action: OfficialCertificationAction,
): Promise<OfficialCertificationSummary> => {
  const request = parseOfficialCertificationActionRequest(body);

  return client.reviewCertification(request.certificationIdentifier, action);
};

export const fetchOfficialCertificationReviews = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  page = 1,
  perPage = defaultOfficialCertificationPerPage,
  status = "pending",
}: {
  fallbackErrorMessage: string;
  fetchAdapter?: FetchAdapter;
  page?: number;
  perPage?: number;
  status?: OfficialCertificationListStatus;
}): Promise<OfficialCertificationListResponse> => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
      status,
    });
    const response = await fetchAdapter(`/api/wiki/official-certification?${params.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      await throwApiError(response);
    }

    return parseOfficialCertificationListResponse(await readResponseBody(response));
  } catch (error) {
    throw new Error(getOfficialCertificationErrorMessage(error, fallbackErrorMessage));
  }
};

export const requestOfficialCertificationFromBrowser = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestBody,
}: {
  fallbackErrorMessage: string;
  fetchAdapter?: FetchAdapter;
  requestBody: OfficialCertificationRequest;
}): Promise<OfficialCertificationSummary> => {
  try {
    const response = await fetchAdapter("/api/wiki/official-certification/request", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        [wikiDraftReviewCsrfHeaderName]: wikiDraftReviewCsrfHeaderValue,
      },
      body: JSON.stringify(parseOfficialCertificationRequest(requestBody)),
    });

    if (!response.ok) {
      await throwApiError(response);
    }

    return parseOfficialCertificationSummary(await readResponseBody(response));
  } catch (error) {
    throw new Error(getOfficialCertificationErrorMessage(error, fallbackErrorMessage));
  }
};

export const reviewOfficialCertificationFromBrowser = async ({
  action,
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestBody,
}: {
  action: OfficialCertificationAction;
  fallbackErrorMessage: string;
  fetchAdapter?: FetchAdapter;
  requestBody: OfficialCertificationActionRequest;
}): Promise<OfficialCertificationSummary> => {
  try {
    const response = await fetchAdapter(`/api/wiki/official-certification/${action}`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        [wikiDraftReviewCsrfHeaderName]: wikiDraftReviewCsrfHeaderValue,
      },
      body: JSON.stringify(parseOfficialCertificationActionRequest(requestBody)),
    });

    if (!response.ok) {
      await throwApiError(response);
    }

    return parseOfficialCertificationSummary(await readResponseBody(response));
  } catch (error) {
    throw new Error(getOfficialCertificationErrorMessage(error, fallbackErrorMessage));
  }
};


export const listMyOfficialCertifications = async (
  client: OfficialCertificationApiClient,
  params: { perPage?: number; status?: OfficialCertificationListStatus },
): Promise<OfficialCertificationListResponse> => client.listMyCertifications(params);

export const listMyOwnedWikis = async (
  client: OfficialCertificationApiClient,
  params: { perPage?: number },
): Promise<MyOwnedWikisResponse> => client.listMyOwnedWikis(params);

export const listRelatedWikis = async (
  client: OfficialCertificationApiClient,
  params: { resourceType: unknown; translationSetIdentifier: string },
): Promise<RelatedWikisResponse> =>
  client.listRelatedWikis({
    resourceType: parseRelatedWikisResourceType(params.resourceType),
    translationSetIdentifier: params.translationSetIdentifier,
  });

export const syncOwnedWikiCertifications = async (
  client: OfficialCertificationApiClient,
  body: unknown,
): Promise<SyncOwnedWikiCertificationsResponse> =>
  client.syncOwnedWikiCertifications(parseSyncOwnedWikiCertificationsRequest(body));

export const fetchMyOfficialCertificationsFromBrowser = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  perPage = defaultOfficialCertificationPerPage,
  status,
}: {
  fallbackErrorMessage: string;
  fetchAdapter?: FetchAdapter;
  perPage?: number;
  status?: OfficialCertificationListStatus;
}): Promise<OfficialCertificationListResponse> => {
  try {
    const params = new URLSearchParams({ perPage: String(perPage) });
    if (status) params.set("status", status);
    const response = await fetchAdapter(`/api/wiki/my/official-certifications?${params.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) await throwApiError(response);
    return parseOfficialCertificationListResponse(await readResponseBody(response));
  } catch (error) {
    throw new Error(getOfficialCertificationErrorMessage(error, fallbackErrorMessage));
  }
};

export const fetchMyOwnedWikisFromBrowser = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  perPage = 100,
}: {
  fallbackErrorMessage: string;
  fetchAdapter?: FetchAdapter;
  perPage?: number;
}): Promise<MyOwnedWikisResponse> => {
  try {
    const params = new URLSearchParams({ perPage: String(perPage) });
    const response = await fetchAdapter(`/api/wiki/my/owned-wikis?${params.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) await throwApiError(response);
    return parseMyOwnedWikisResponse(await readResponseBody(response));
  } catch (error) {
    throw new Error(getOfficialCertificationErrorMessage(error, fallbackErrorMessage));
  }
};

export const fetchRelatedWikisFromBrowser = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  resourceType,
  translationSetIdentifier,
}: {
  fallbackErrorMessage: string;
  fetchAdapter?: FetchAdapter;
  resourceType: RelatedWikisResourceType;
  translationSetIdentifier: string;
}): Promise<RelatedWikisResponse> => {
  try {
    const params = new URLSearchParams({
      resourceType: parseRelatedWikisResourceType(resourceType),
      translationSetIdentifier,
    });
    const response = await fetchAdapter(`/api/wiki/official-certification/related-wikis?${params.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) await throwApiError(response);
    return parseRelatedWikisResponse(await readResponseBody(response));
  } catch (error) {
    throw new Error(getOfficialCertificationErrorMessage(error, fallbackErrorMessage));
  }
};

export const syncOwnedWikiCertificationsFromBrowser = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestBody,
}: {
  fallbackErrorMessage: string;
  fetchAdapter?: FetchAdapter;
  requestBody: SyncOwnedWikiCertificationsRequestBody;
}): Promise<SyncOwnedWikiCertificationsResponse> => {
  try {
    const response = await fetchAdapter("/api/wiki/official-certification/owned-wikis", {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        [wikiDraftReviewCsrfHeaderName]: wikiDraftReviewCsrfHeaderValue,
      },
      body: JSON.stringify(parseSyncOwnedWikiCertificationsRequest(requestBody)),
    });
    if (!response.ok) await throwApiError(response);
    return parseSyncOwnedWikiCertificationsResponse(await readResponseBody(response));
  } catch (error) {
    throw new Error(getOfficialCertificationErrorMessage(error, fallbackErrorMessage));
  }
};
