import { readApiErrorBody } from "@/gateways/support/apiError";
import { siteManagementApiTypes } from "@kpool/types";
import { z } from "zod";
import { principalGroupApiError } from "@/gateways/support/principalGroupSave";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

export type SiteManagementPrincipalGroupList = z.infer<typeof siteManagementApiTypes.schemas.PrincipalGroupList>;
export const siteManagementUnavailableMessage = "SiteManagement principal groups are unavailable.";
export const siteManagementSaveResultSchema = z.object({
  committed: z.literal(true),
  refresh: z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data: siteManagementApiTypes.schemas.PrincipalGroupList }),
    z.object({ ok: z.literal(false), status: z.number(), kind: z.enum(["http", "network", "schema"]), message: z.string() }),
  ]),
});
export type SiteManagementAccessRefresh = (status?: number | null) => Promise<boolean | null>;
export type SiteManagementSaveResult = z.infer<typeof siteManagementSaveResultSchema>;
export type SiteManagementMembersRequest = z.infer<typeof siteManagementApiTypes.schemas.UpdatePrincipalGroupMembersRequestBody>;
export const saveSiteManagementPrincipalGroups = async (body: SiteManagementMembersRequest, { fetchAdapter = browserApiFetch }: { fetchAdapter?: typeof fetch } = {}) => {
  const payload = siteManagementMembersRequestSchema.safeParse(body);
  if (!payload.success) throw Object.assign(new Error("Invalid membership request."), { status: 422 });
  const response = await fetchAdapter("/api/site-management/principal-groups/members", { method: "PATCH", cache: "no-store", credentials: "include", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload.data) });
  if (!response.ok) throw principalGroupApiError(response.status, await readApiErrorBody(response), siteManagementUnavailableMessage);
  // HTTP success certifies commitment; an invalid BFF envelope must not offer PATCH retry.
  const failed: SiteManagementSaveResult = { committed: true, refresh: { ok: false, status: 502, kind: "schema", message: siteManagementUnavailableMessage } };
  return response.json().then((value: unknown) => {
    const result = siteManagementSaveResultSchema.safeParse(value);
    return result.success ? result.data : failed;
  }, () => failed);
};
export const siteManagementMembersRequestSchema = siteManagementApiTypes.schemas.UpdatePrincipalGroupMembersRequestBody.refine((body) =>
  new Set(body.principalGroups.map((group) => group.principalGroupIdentifier)).size === body.principalGroups.length &&
  body.principalGroups.every((group) => new Set(group.principalIdentifiers).size === group.principalIdentifiers.length),
);
export const parseSiteManagementPrincipalGroups = (body: unknown): SiteManagementPrincipalGroupList =>
  parseWithSchemaLog("site management principal groups", siteManagementApiTypes.schemas.PrincipalGroupList, body);

export const fetchSiteManagementPrincipalGroups = async ({ fetchAdapter = browserApiFetch }: { fetchAdapter?: typeof fetch } = {}) => {
  const response = await fetchAdapter("/api/site-management/principal-groups", { cache: "no-store", credentials: "include", headers: { Accept: "application/json" } });
  if (!response.ok) throw principalGroupApiError(response.status, await readApiErrorBody(response), siteManagementUnavailableMessage);
  return parseSiteManagementPrincipalGroups(await response.json());
};
