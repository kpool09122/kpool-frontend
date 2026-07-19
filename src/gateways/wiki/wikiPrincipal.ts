import { wikiPrivateApiTypes } from "@kpool/types";
import type { IdentitySummary } from "@/gateways/identity/identityApi";
import { z } from "zod";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getMockWikiPrincipalState,
  isMockWikiGatewayEnabled,
} from "./mockWikiGateway";

import {
  getWikiApiErrorMessage,
  trimTrailingSlashes,
  withWikiApiPrefix,
} from "@kpool/wiki";

export const wikiPrincipalSummarySchema = wikiPrivateApiTypes.schemas.PrincipalSummary;
export const wikiPrincipalCreateRequestSchema = wikiPrivateApiTypes.schemas.CreatePrincipalRequestBody;

export type WikiPrincipalSummary = z.infer<typeof wikiPrincipalSummarySchema>;
export type WikiPrincipalCreateRequest = z.infer<typeof wikiPrincipalCreateRequestSchema>;

export type WikiPrincipalState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "available"; principal: WikiPrincipalSummary }
  | { status: "missing" }
  | { status: "error"; message: string };

type WikiPolicyStatement = WikiPrincipalSummary["policies"][number]["statements"][number];
type WikiPolicyAction = "APPROVE" | "AUTOMATIC_CREATE" | "PUBLISH" | "REJECT";
type WikiPolicyResourceType = "AGENCY" | "GROUP" | "IMAGE" | "SONG" | "TALENT";

type FetchAdapter = typeof fetch;

type ResponseLike = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export const getWikiPrincipalApiBaseUrl = (): string =>
  process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL
    ? withWikiApiPrefix(process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL)
    : "";

export const getAccountIdentifierFromIdentity = (
  identity: IdentitySummary | null,
): string | null => {
  if (!identity) {
    return null;
  }

  const identityRecord = identity as Record<string, unknown>;
  const accountRecord = identityRecord.account;
  const accounts = identityRecord.accounts;
  const directAccountIdentifier = getAccountIdentifierFromRecord(identityRecord, {
    includeGenericId: false,
  });

  if (directAccountIdentifier) {
    return directAccountIdentifier;
  }

  if (isRecord(accountRecord)) {
    const nestedAccountIdentifier = getAccountIdentifierFromRecord(accountRecord, {
      includeGenericId: true,
    });

    if (nestedAccountIdentifier) {
      return nestedAccountIdentifier;
    }
  }

  if (Array.isArray(accounts)) {
    const account = accounts.find(isRecord);

    return account
      ? getAccountIdentifierFromRecord(account, { includeGenericId: true })
      : null;
  }

  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringValue = (
  record: Record<string, unknown>,
  keys: string[],
): string | null => {
  const value = keys
    .map((key) => record[key])
    .find((candidate) => typeof candidate === "string" && candidate.length > 0);

  return typeof value === "string" ? value : null;
};

const getAccountIdentifierFromRecord = (
  record: Record<string, unknown>,
  { includeGenericId }: { includeGenericId: boolean },
): string | null =>
  getStringValue(record, [
    "accountId",
    "accountIdentifier",
    "account_id",
    "account_identifier",
    ...(includeGenericId ? ["id"] : []),
  ]);

const normalizePolicyValue = (value: string): string => value.trim().toUpperCase();

const valueMatches = (values: string[], target: string): boolean => {
  const normalizedTarget = normalizePolicyValue(target);

  return values
    .map(normalizePolicyValue)
    .some((value) => value === normalizedTarget || value === "*" || value === "ALL");
};

const statementMatches = (
  statement: WikiPolicyStatement,
  action: WikiPolicyAction,
  resourceType: WikiPolicyResourceType,
): boolean =>
  valueMatches(statement.actions, action) &&
  valueMatches(statement.resourceTypes, resourceType);

const hasMatchingStatement = (
  principal: WikiPrincipalSummary,
  effect: "ALLOW" | "DENY",
  action: WikiPolicyAction,
  resourceType: WikiPolicyResourceType,
): boolean =>
  principal.policies.some((policy) =>
    policy.statements.some(
      (statement) =>
        normalizePolicyValue(statement.effect) === effect &&
        statementMatches(statement, action, resourceType),
    ),
  );

const isAllowedWithoutDeny = (
  principal: WikiPrincipalSummary,
  action: WikiPolicyAction,
  resourceType: WikiPolicyResourceType,
): boolean =>
  hasMatchingStatement(principal, "ALLOW", action, resourceType) &&
  !hasMatchingStatement(principal, "DENY", action, resourceType);

export const canReviewWikiDraftImages = (principal: WikiPrincipalSummary): boolean =>
  isAllowedWithoutDeny(principal, "APPROVE", "IMAGE") &&
  isAllowedWithoutDeny(principal, "REJECT", "IMAGE");

export const canReviewWikiImageDeletionRequests = canReviewWikiDraftImages;

const draftWikiReviewResourceTypes = ["AGENCY", "GROUP", "SONG", "TALENT"] as const;
export const draftWikiAutoCreateResourceTypes = ["agency", "group", "song", "talent"] as const;

export const canReviewWikiDraftWikis = (principal: WikiPrincipalSummary): boolean =>
  draftWikiReviewResourceTypes.some(
    (resourceType) =>
      isAllowedWithoutDeny(principal, "APPROVE", resourceType) &&
      isAllowedWithoutDeny(principal, "REJECT", resourceType),
  );

export const canPublishWikiDraftWikis = (principal: WikiPrincipalSummary): boolean =>
  draftWikiReviewResourceTypes.some((resourceType) =>
    isAllowedWithoutDeny(principal, "PUBLISH", resourceType),
  );

export const canAutoCreateWikiDraftWikiResourceType = (
  principal: WikiPrincipalSummary,
  resourceType: (typeof draftWikiAutoCreateResourceTypes)[number],
): boolean =>
  isAllowedWithoutDeny(
    principal,
    "AUTOMATIC_CREATE",
    normalizePolicyValue(resourceType) as WikiPolicyResourceType,
  );

export const canAutoCreateWikiDraftWikis = (principal: WikiPrincipalSummary): boolean =>
  draftWikiAutoCreateResourceTypes.some((resourceType) =>
    canAutoCreateWikiDraftWikiResourceType(principal, resourceType),
  );

const readResponseBody = async (response: ResponseLike): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const wikiPrincipalUnavailableMessage =
  "Wiki principal is temporarily unavailable. Please try again later.";

const toWikiPrincipalMessage = (error: unknown): string =>
  getWikiApiErrorMessage(error, {
    notFound: "Wiki principal was not found.",
    requestFailedPrefix: "Wiki principal request failed with status",
    responseSchemaPrefix: "Wiki principal response did not match the expected schema",
    unavailable: wikiPrincipalUnavailableMessage,
  });

export const getWikiPrincipalErrorMessage = toWikiPrincipalMessage;

const isServerErrorStatus = (status: number): boolean => status >= 500;

export const getWikiPrincipalResponseErrorMessage = ({
  data,
  status,
}: {
  data: unknown;
  status: number;
}): string =>
  isServerErrorStatus(status)
    ? wikiPrincipalUnavailableMessage
    : toWikiPrincipalMessage({ response: { status, data } });

const getWikiPrincipalBoundaryErrorMessage = (error: unknown): string =>
  error instanceof z.ZodError ? toWikiPrincipalMessage(error) : wikiPrincipalUnavailableMessage;

export const getCurrentWikiPrincipal = async ({
  fetchAdapter = fetch,
}: {
  fetchAdapter?: FetchAdapter;
} = {}): Promise<Extract<WikiPrincipalState, { status: "available" | "missing" | "error" }>> => {
  try {
    const response = await fetchAdapter("/api/wiki/principal/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const body = await readResponseBody(response);

    if (response.status === 404) {
      return { status: "missing" };
    }

    if (!response.ok) {
      return {
        status: "error",
        message: getWikiPrincipalResponseErrorMessage({
          status: response.status,
          data: body,
        }),
      };
    }

    return {
      status: "available",
      principal: parseWithSchemaLog("wiki principal response", wikiPrincipalSummarySchema, body),
    };
  } catch (error) {
    return {
      status: "error",
      message: getWikiPrincipalBoundaryErrorMessage(error),
    };
  }
};

export const getCurrentWikiPrincipalForRequest = async ({
  baseUrl = getWikiPrincipalApiBaseUrl(),
  cookieHeader,
  fetchAdapter = fetch,
}: {
  baseUrl?: string;
  cookieHeader?: string;
  fetchAdapter?: FetchAdapter;
} = {}): Promise<Extract<WikiPrincipalState, { status: "available" | "missing" | "error" }>> => {
  const mockPrincipalState = getMockWikiPrincipalState(cookieHeader);

  if (mockPrincipalState) {
    return mockPrincipalState;
  }

  if (!baseUrl) {
    return {
      status: "error",
      message: "Wiki principal API is not configured.",
    };
  }

  try {
    const response = await fetchAdapter(createWikiCurrentPrincipalUrl(baseUrl), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    const body = await readResponseBody(response);

    if (response.status === 404) {
      return { status: "missing" };
    }

    if (!response.ok) {
      return {
        status: "error",
        message: getWikiPrincipalResponseErrorMessage({
          status: response.status,
          data: body,
        }),
      };
    }

    return {
      status: "available",
      principal: parseWithSchemaLog("wiki principal response", wikiPrincipalSummarySchema, body),
    };
  } catch (error) {
    return {
      status: "error",
      message: getWikiPrincipalBoundaryErrorMessage(error),
    };
  }
};

export const getInitialWikiPrincipalForRequest = async ({
  cookieHeader,
  hasAuthenticatedIdentity,
}: {
  cookieHeader: string;
  hasAuthenticatedIdentity: boolean;
}): Promise<Extract<WikiPrincipalState, { status: "available" | "missing" | "error" | "idle" }>> => {
  if (!hasAuthenticatedIdentity && !isMockWikiGatewayEnabled()) {
    return { status: "idle" };
  }

  return getCurrentWikiPrincipalForRequest({ cookieHeader });
};

export const createWikiPrincipal = async ({
  accountIdentifier,
  fetchAdapter = fetch,
  identityIdentifier,
}: WikiPrincipalCreateRequest & {
  fetchAdapter?: FetchAdapter;
}): Promise<Extract<WikiPrincipalState, { status: "available" | "error" }>> => {
  try {
    const body = parseWithSchemaLog("wiki principal create request", wikiPrincipalCreateRequestSchema, {
      accountIdentifier,
      identityIdentifier,
    });
    const response = await fetchAdapter("/api/wiki/principal/create", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const responseBody = await readResponseBody(response);

    if (!response.ok) {
      return {
        status: "error",
        message: getWikiPrincipalResponseErrorMessage({
          status: response.status,
          data: responseBody,
        }),
      };
    }

    return {
      status: "available",
      principal: parseWithSchemaLog("wiki principal create response", wikiPrincipalSummarySchema, responseBody),
    };
  } catch (error) {
    return {
      status: "error",
      message: getWikiPrincipalBoundaryErrorMessage(error),
    };
  }
};

export const createWikiCurrentPrincipalUrl = (baseUrl: string): string =>
  `${trimTrailingSlashes(baseUrl)}/principal/me`;

export const createWikiPrincipalCreateUrl = (baseUrl: string): string =>
  `${trimTrailingSlashes(baseUrl)}/principal/create`;
