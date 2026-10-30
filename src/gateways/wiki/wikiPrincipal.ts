import { browserApiFetch } from "@/gateways/support/browserApiFetch";

import { wikiPrivateApiTypes } from "@kpool/types";
import { getAccountIdentifierFromIdentity } from "@/gateways/account/accountIdentity";
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
export const wikiPrincipalCreatedSummarySchema = wikiPrivateApiTypes.schemas.CreatedPrincipalSummary;
export const wikiPrincipalCreateRequestSchema = wikiPrivateApiTypes.schemas.CreatePrincipalRequestBody;

export type WikiPrincipalSummary = z.infer<typeof wikiPrincipalSummarySchema>;
export type WikiPrincipalCreatedSummary = z.infer<typeof wikiPrincipalCreatedSummarySchema>;
export type WikiPrincipalCreateRequest = z.infer<typeof wikiPrincipalCreateRequestSchema>;

export type WikiPrincipalState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "available"; principal: WikiPrincipalSummary }
  | { status: "missing" }
  | { status: "error"; message: string; httpStatus?: number; body?: unknown };

type WikiPolicyStatement = WikiPrincipalSummary["policies"][number]["statements"][number];
type WikiPolicyAction =
  | "APPROVE"
  | "AUTOMATIC_CREATE"
  | "OFFICIAL_CERTIFICATION_APPROVE"
  | "OFFICIAL_CERTIFICATION_REJECT"
  | "OFFICIAL_CERTIFICATION_MY_READ"
  | "OFFICIAL_CERTIFICATION_REQUEST"
  | "OFFICIAL_CERTIFICATION_OWNED_WIKI_SYNC"
  | "RELATED_WIKI_LIST"
  | "PRINCIPAL_GROUP_MANAGE"
  | "PUBLISH"
  | "TRANSLATE"
  | "REJECT";
type WikiPolicyResourceType = "AGENCY" | "GROUP" | "IMAGE" | "PRINCIPAL_GROUP" | "SONG" | "TALENT";
type OfficialCertificationResourceType = "agency" | "talent";

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

export { getAccountIdentifierFromIdentity };

const normalizePolicyValue = (value: string): string =>
  value.trim().toUpperCase().replaceAll(/[-:]/g, "_");

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
  principal.status === "active" &&
  hasMatchingStatement(principal, "ALLOW", action, resourceType) &&
  !hasMatchingStatement(principal, "DENY", action, resourceType);

// Material search authorizes a new empty IMAGE resource, not the edited Wiki.
// Unknown/dynamic conditions cannot grant access client-side; the API remains authoritative.
const emptyWikiResourceConditionMatches = (statement: WikiPolicyStatement): boolean | null => {
  const clauses = statement.condition?.clauses ?? [];
  const values: Record<string, string | string[] | boolean | null> = {
    "resource:agencyId": null, "resource:groupId": [], "resource:talentId": [],
    "resource:isOfficial": false, "resource:editorId": null,
    "resource:ownerAccountCategory": null, "resource:requesterAccountCategory": null,
  };
  const matches = clauses.map(({ field, operator, value }) => {
    if (!(field in values) || !["eq", "ne", "in", "not_in"].includes(operator)) return null;
    const actual = values[field];
    if ((typeof value === "string" && value.includes("${")) || (Array.isArray(value) && value.some((part) => part.includes("${")))) return null;
    const equals = actual !== null && (Array.isArray(actual)
      ? actual.some((item) => Array.isArray(value) ? value.includes(item) : item === value)
      : Array.isArray(value) ? value.some((item) => item === actual) : actual === value);
    const candidates = Array.isArray(value) ? value : [value];
    const contained = actual !== null && (Array.isArray(actual)
      ? actual.some((item) => candidates.includes(item)) : candidates.some((item) => item === actual));
    return operator === "eq" ? equals : operator === "ne" ? !equals : operator === "in" ? contained : !contained;
  });
  return matches.includes(false) ? false : matches.includes(null) ? null : true;
};

export const canSearchWikiFreeMaterials = (principal: WikiPrincipalSummary): boolean => {
  const statements = principal.policies.flatMap((policy) => policy.statements).filter((statement) =>
    valueMatches(statement.actions, "search_free_materials") && valueMatches(statement.resourceTypes, "image"));
  return principal.status === "active"
    && !statements.some((statement) => normalizePolicyValue(statement.effect) === "DENY" && emptyWikiResourceConditionMatches(statement) !== false)
    && statements.some((statement) => normalizePolicyValue(statement.effect) === "ALLOW" && emptyWikiResourceConditionMatches(statement) === true);
};

// The backend evaluates SAVE_VIDEO_LINKS against the Wiki's resource type.
// Only unconditional grants are provable here; the create API is authoritative.
export const canCreateWikiVideo = (
  principal: WikiPrincipalSummary,
  resourceType: "agency" | "group" | "song" | "talent",
): boolean => {
  const statements = principal.policies.flatMap((policy) => policy.statements)
    .filter((statement) => valueMatches(statement.actions, "save_video_links")
      && valueMatches(statement.resourceTypes, resourceType));
  return principal.status === "active"
    && !statements.some((statement) => normalizePolicyValue(statement.effect) === "DENY")
    && statements.some((statement) => normalizePolicyValue(statement.effect) === "ALLOW"
      && !(statement.condition?.clauses?.length));
};

// DeleteVideoLink authorizes Resource(type: video.resourceType), with other fields left empty.
// Unknown/dynamic conditions cannot grant access here; the DELETE API is authoritative.
export const canDeleteWikiVideo = (principal: WikiPrincipalSummary, resourceType: "agency" | "group" | "song" | "talent") => {
  const statements = principal.policies.flatMap((policy) => policy.statements).filter((statement) =>
    valueMatches(statement.actions, "delete_video_link") && valueMatches(statement.resourceTypes, resourceType));
  return principal.status === "active"
    && !statements.some((statement) => normalizePolicyValue(statement.effect) === "DENY" && emptyWikiResourceConditionMatches(statement) !== false)
    && statements.some((statement) => normalizePolicyValue(statement.effect) === "ALLOW" && emptyWikiResourceConditionMatches(statement) === true);
};

// Like actions use the video's resource type with an otherwise empty resource.
export const getWikiVideoLikePermissions = (principal: WikiPrincipalSummary, resourceType: "agency" | "group" | "song" | "talent") => {
  const allowed = (action: "like_video_link" | "unlike_video_link") => {
    const statements = principal.policies.flatMap((policy) => policy.statements).filter((statement) =>
      valueMatches(statement.actions, action) && valueMatches(statement.resourceTypes, resourceType));
    return principal.status === "active"
      && !statements.some((statement) => normalizePolicyValue(statement.effect) === "DENY" && emptyWikiResourceConditionMatches(statement) !== false)
      && statements.some((statement) => normalizePolicyValue(statement.effect) === "ALLOW" && emptyWikiResourceConditionMatches(statement) === true);
  };
  return { canLike: allowed("like_video_link"), canUnlike: allowed("unlike_video_link") };
};

export const canReviewWikiDraftImages = (principal: WikiPrincipalSummary): boolean =>
  isAllowedWithoutDeny(principal, "APPROVE", "IMAGE") &&
  isAllowedWithoutDeny(principal, "REJECT", "IMAGE");

export const canReviewWikiImageDeletionRequests = canReviewWikiDraftImages;

export const canManageWikiPrincipalGroups = (principal: WikiPrincipalSummary): boolean =>
  isAllowedWithoutDeny(principal, "PRINCIPAL_GROUP_MANAGE", "PRINCIPAL_GROUP");

const draftWikiReviewResourceTypes = ["AGENCY", "GROUP", "SONG", "TALENT"] as const;
export const draftWikiAutoCreateResourceTypes = ["agency", "group", "song", "talent"] as const;

export const canReviewWikiDraftWikis = (principal: WikiPrincipalSummary): boolean =>
  draftWikiReviewResourceTypes.some(
    (resourceType) =>
      isAllowedWithoutDeny(principal, "APPROVE", resourceType) &&
      isAllowedWithoutDeny(principal, "REJECT", resourceType),
  );

const officialCertificationResourceTypes = ["agency", "talent"] as const;

export const canReviewOfficialCertifications = (principal: WikiPrincipalSummary): boolean =>
  officialCertificationResourceTypes.some(
    (resourceType) =>
      isAllowedWithoutDeny(
        principal,
        "OFFICIAL_CERTIFICATION_APPROVE",
        normalizePolicyValue(resourceType) as WikiPolicyResourceType,
      ) &&
      isAllowedWithoutDeny(
        principal,
        "OFFICIAL_CERTIFICATION_REJECT",
        normalizePolicyValue(resourceType) as WikiPolicyResourceType,
      ),
  );

export type OfficialCertificationPermissions = {
  canRead: boolean;
  requestResourceTypes: OfficialCertificationResourceType[];
  canSyncOwnedWikis: boolean;
  relatedResourceTypes: OfficialCertificationResourceType[];
};

export const getOfficialCertificationPermissions = (principal: WikiPrincipalSummary): OfficialCertificationPermissions => {
  const allowedResourceTypes = (action: WikiPolicyAction) => officialCertificationResourceTypes.filter(
    (resourceType) => isAllowedWithoutDeny(principal, action, normalizePolicyValue(resourceType) as WikiPolicyResourceType),
  );
  return {
    canRead: allowedResourceTypes("OFFICIAL_CERTIFICATION_MY_READ").length > 0,
    requestResourceTypes: allowedResourceTypes("OFFICIAL_CERTIFICATION_REQUEST"),
    canSyncOwnedWikis: isAllowedWithoutDeny(principal, "OFFICIAL_CERTIFICATION_OWNED_WIKI_SYNC", "AGENCY"),
    relatedResourceTypes: allowedResourceTypes("RELATED_WIKI_LIST"),
  };
};

export const canManageOfficialCertifications = (principal: WikiPrincipalSummary): boolean => {
  const permissions = getOfficialCertificationPermissions(principal);
  return permissions.canRead || permissions.requestResourceTypes.length > 0
    || permissions.canSyncOwnedWikis || permissions.relatedResourceTypes.length > 0;
};

export const canPublishWikiDraftWikis = (principal: WikiPrincipalSummary): boolean =>
  draftWikiReviewResourceTypes.some((resourceType) =>
    isAllowedWithoutDeny(principal, "PUBLISH", resourceType),
  );

export const canTranslateWikis = (principal: WikiPrincipalSummary): boolean =>
  draftWikiReviewResourceTypes.some((resourceType) =>
    isAllowedWithoutDeny(principal, "TRANSLATE", resourceType),
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

export const getWikiPrincipalResponseErrorMessage = ({
  data,
  status,
}: {
  data: unknown;
  status: number;
}): string =>
  toWikiPrincipalMessage({ response: { status, data } });

const getWikiPrincipalBoundaryErrorMessage = (error: unknown): string =>
  error instanceof z.ZodError ? toWikiPrincipalMessage(error) : wikiPrincipalUnavailableMessage;

export const getCurrentWikiPrincipal = async ({
  fetchAdapter = browserApiFetch,
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
        httpStatus: response.status,
        body,
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
  fetchAdapter = browserApiFetch,
  identityIdentifier,
}: WikiPrincipalCreateRequest & {
  fetchAdapter?: FetchAdapter;
}): Promise<{ status: "available" } | Extract<WikiPrincipalState, { status: "error" }>> => {
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

    parseWithSchemaLog("wiki principal create response", wikiPrincipalCreatedSummarySchema, responseBody);
    return { status: "available" };
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
