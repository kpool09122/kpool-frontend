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
const officialCertificationActionRequestSchema = z.object({
  certificationIdentifier: z.string().uuid(),
});

export type OfficialCertificationRequest = z.infer<typeof officialCertificationRequestSchema>;
export type OfficialCertificationSummary = z.infer<typeof officialCertificationSummarySchema>;
export type OfficialCertificationListItem = z.infer<typeof wikiPrivateApiTypes.schemas.OfficialCertificationListItem>;
export type OfficialCertificationListResponse = z.infer<typeof officialCertificationListResponseSchema>;
export type OfficialCertificationActionRequest = z.infer<typeof officialCertificationActionRequestSchema>;
export type OfficialCertificationAction = "approve" | "reject";
export type OfficialCertificationListStatus = "pending";

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

const getOfficialCertificationRequestEndpointPath = (): string => "/official-certification/request";

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
