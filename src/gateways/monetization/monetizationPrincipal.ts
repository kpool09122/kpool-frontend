import { monetizationApiTypes } from "@kpool/types";
import { z } from "zod";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { principalGroupApiError, savePrincipalGroupRequest } from "@/gateways/support/principalGroupSave";
import { readApiErrorBody } from "@/gateways/support/apiError";

// Use the synchronized backend contract; do not duplicate authorization schemas.
// #926 runtime Action enum has three card actions omitted by its TypeSpec union.
// Keep the generated source untouched and normalize only this known contract gap.
const statementSchema = monetizationApiTypes.schemas.PrincipalPolicyStatement.extend({ actions: z.array(z.enum(["principal_group_read", "principal_group_manage", "payment_method_register", "card_registration_prepare", "payment_method_read", "payment_method_delete"])) });
export const principalSchema = monetizationApiTypes.schemas.PrincipalSnapshot.extend({ policies: z.array(monetizationApiTypes.schemas.PrincipalPolicySummary.extend({ statements: z.array(statementSchema) })) });
export const createdPrincipalSchema = monetizationApiTypes.schemas.PrincipalSummary;
export const groupsSchema = z.object({ principalGroups: z.array(monetizationApiTypes.schemas.PrincipalGroup) });
export const membersSchema = z.object({ members: z.array(monetizationApiTypes.schemas.PrincipalGroupMember) });
export const groupListSchema = z.object({ groups: z.array(monetizationApiTypes.schemas.PrincipalGroup), users: z.array(monetizationApiTypes.schemas.PrincipalGroupMember) });
export const updateRequestSchema = monetizationApiTypes.schemas.UpdatePrincipalGroupMembersRequest;
export const updateResponseSchema = monetizationApiTypes.monetizationApi.api.find(endpoint => endpoint.method === "patch" && endpoint.path === "/principal-groups/members")!.response;
export type MonetizationPrincipal = z.infer<typeof principalSchema>;
export type MonetizationGroup = z.infer<typeof monetizationApiTypes.schemas.PrincipalGroup>;
export type MonetizationMember = z.infer<typeof monetizationApiTypes.schemas.PrincipalGroupMember>;
export type MonetizationState = { status: "missing" } | { status: "available"; principal: MonetizationPrincipal } | { status: "error"; httpStatus?: number };
export const monetizationUnavailable = "Monetization authorization is temporarily unavailable.";
export const getMonetizationApiBaseUrl = () => {
  const base = process.env.KPOOL_MONETIZATION_API_BASE_URL?.replace(/\/+$/, "");
  return base ? base.endsWith("/api/v1/monetization") ? base : `${base}/api/v1/monetization` : null;
};

export const canManageMonetization = (principal: MonetizationPrincipal, accountIdentifier: string) => {
  const matches = principal.policies.flatMap(policy => policy.statements).filter(statement => {
    if (!statement.actions.includes("principal_group_manage") || !statement.resourceTypes.includes("principal_group")) return false;
    return (statement.condition?.clauses ?? []).every(clause => {
      if (clause.field !== "resource:accountId") return false;
      // Match the backend's strict scalar equality versus collection membership.
      if (clause.operator === "eq") return clause.value === accountIdentifier;
      if (clause.operator === "ne") return clause.value !== accountIdentifier;
      const values = Array.isArray(clause.value) ? clause.value : [clause.value];
      return clause.operator === "in" ? values.includes(accountIdentifier) : !values.includes(accountIdentifier);
    });
  });
  return principal.status === "active" && matches.some(statement => statement.effect === "allow") && !matches.some(statement => statement.effect === "deny");
};

export const getMonetizationPrincipal = async ({ fetchAdapter = browserApiFetch, signal }: { fetchAdapter?: typeof fetch; signal?: AbortSignal } = {}): Promise<MonetizationState> => {
  try {
    const response = await fetchAdapter("/api/monetization/principal/me", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" }, signal });
    if (response.status === 404) return { status: "missing" };
    if (!response.ok) return { status: "error", httpStatus: response.status };
    const parsed = principalSchema.safeParse(await readApiErrorBody(response));
    return parsed.success ? { status: "available", principal: parsed.data } : { status: "error" };
  } catch {
    return { status: "error" };
  }
};
export const activateMonetization = async ({ fetchAdapter = browserApiFetch }: { fetchAdapter?: typeof fetch } = {}) => {
  try {
    const response = await fetchAdapter("/api/monetization/principals", { method: "POST", credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) return { ok: false as const, status: response.status };
    const parsed = createdPrincipalSchema.safeParse(await readApiErrorBody(response));
    return parsed.success ? { ok: true as const } : { ok: false as const, status: 502 };
  } catch {
    return { ok: false as const, status: 502 };
  }
};
export const fetchMonetizationGroups = async ({ fallback, fetchAdapter = browserApiFetch }: { fallback: string; fetchAdapter?: typeof fetch }) => {
  const response = await fetchAdapter("/api/monetization/principal-groups", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
  const body = await readApiErrorBody(response);
  if (!response.ok) throw principalGroupApiError(response.status, body, fallback);
  // BFF supplies authoritative groups plus the separately queried member candidates.
  const parsed = groupListSchema.safeParse(body);
  if (!parsed.success) throw principalGroupApiError(502, null, fallback);
  return parsed.data;
};
export const saveMonetizationGroups = (body: z.infer<typeof updateRequestSchema>, fallback: string) => savePrincipalGroupRequest({ url: "/api/monetization/principal-groups/members", body, dataSchema: groupListSchema, fallback });
