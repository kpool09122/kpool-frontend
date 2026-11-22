import type { NextRequest } from "next/server";
import { getMonetizationApiBaseUrl, monetizationUnavailable, updateRequestSchema, updateResponseSchema } from "@/gateways/monetization/monetizationPrincipal";
import { savePrincipalGroups } from "../../../principalGroupSave";
import { loadGroupList, validateSession } from "../../routeSupport";
export async function PATCH(request: NextRequest) {
  const rejected = validateSession(request, true);
  if (rejected) return rejected;
  const baseUrl = getMonetizationApiBaseUrl();
  return savePrincipalGroups(request, {
    baseUrl, requestSchema: updateRequestSchema, responseSchema: updateResponseSchema, unavailable: monetizationUnavailable,
    refresh: (_body, headers, capture) => loadGroupList(baseUrl!, headers, capture),
  });
}
