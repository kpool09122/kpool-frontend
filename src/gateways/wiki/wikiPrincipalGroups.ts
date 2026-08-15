import { wikiPrivateApiTypes } from "@kpool/types";
import { z } from "zod";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export const wikiPrincipalGroupListResponseSchema = wikiPrivateApiTypes.schemas.ListPrincipalGroupsResponseBody;
export const wikiPrincipalGroupMembersUpdateRequestSchema = wikiPrivateApiTypes.schemas.UpdatePrincipalGroupMembersRequestBody;

export type WikiPrincipalGroupSummary = z.infer<typeof wikiPrivateApiTypes.schemas.PrincipalGroupManagementSummary>;
export type WikiPrincipalGroupMemberSummary = z.infer<typeof wikiPrivateApiTypes.schemas.PrincipalGroupMemberSummary>;
export type WikiPrincipalGroupListResponse = z.infer<typeof wikiPrincipalGroupListResponseSchema>;
export type WikiPrincipalGroupMembersUpdateRequest = z.infer<typeof wikiPrincipalGroupMembersUpdateRequestSchema>;

export type WikiPrincipalGroupBrowserApiError = Error & { wikiPrincipalGroupRouteStatus: number };

export const wikiPrincipalGroupsUnavailableMessage =
  "Wiki principal groups are temporarily unavailable. Please try again later.";

export const isWikiPrincipalGroupBrowserApiError = (
  error: unknown,
): error is WikiPrincipalGroupBrowserApiError =>
  error instanceof Error &&
  "wikiPrincipalGroupRouteStatus" in error &&
  typeof (error as { wikiPrincipalGroupRouteStatus: unknown }).wikiPrincipalGroupRouteStatus === "number";

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getRouteErrorMessage = (body: unknown, fallbackErrorMessage: string): string =>
  typeof body === "object" &&
  body !== null &&
  "message" in body &&
  typeof (body as { message: unknown }).message === "string"
    ? (body as { message: string }).message
    : fallbackErrorMessage;

const createRouteError = (
  response: Response,
  body: unknown,
  fallbackErrorMessage: string,
): WikiPrincipalGroupBrowserApiError =>
  Object.assign(new Error(getRouteErrorMessage(body, fallbackErrorMessage)), {
    wikiPrincipalGroupRouteStatus: response.status,
  });

export const parseWikiPrincipalGroupsResponse = (body: unknown): WikiPrincipalGroupListResponse =>
  parseWithSchemaLog(
    "wiki principal groups response",
    wikiPrincipalGroupListResponseSchema,
    body,
  );

export const parseWikiPrincipalGroupMembersUpdateRequest = (
  body: unknown,
): WikiPrincipalGroupMembersUpdateRequest =>
  parseWithSchemaLog(
    "wiki principal group members update request",
    wikiPrincipalGroupMembersUpdateRequestSchema,
    body,
  );

export const createWikiPrincipalGroupsUrl = ({
  accountIdentifier,
  baseUrl,
}: {
  accountIdentifier: string;
  baseUrl: string;
}): string => {
  const url = new URL(`${baseUrl}/principal-groups`);
  url.searchParams.set("accountIdentifier", accountIdentifier);
  return url.toString();
};

export const createWikiPrincipalGroupMembersUrl = (baseUrl: string): string =>
  `${baseUrl}/principal-groups/members`;

export const fetchWikiPrincipalGroups = async ({
  accountIdentifier,
  fallbackErrorMessage,
  fetchAdapter = fetch,
}: {
  accountIdentifier: string;
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
}): Promise<WikiPrincipalGroupListResponse> => {
  const params = new URLSearchParams({ accountIdentifier });
  const response = await fetchAdapter(`/api/wiki/principal-groups?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw createRouteError(response, body, fallbackErrorMessage);
  }

  return parseWikiPrincipalGroupsResponse(body);
};

export const updateWikiPrincipalGroupMembers = async ({
  fallbackErrorMessage,
  fetchAdapter = fetch,
  requestBody,
}: {
  fallbackErrorMessage: string;
  fetchAdapter?: typeof fetch;
  requestBody: WikiPrincipalGroupMembersUpdateRequest;
}): Promise<WikiPrincipalGroupListResponse> => {
  const response = await fetchAdapter("/api/wiki/principal-groups/members", {
    method: "PATCH",
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw createRouteError(response, body, fallbackErrorMessage);
  }

  return parseWikiPrincipalGroupsResponse(body);
};
