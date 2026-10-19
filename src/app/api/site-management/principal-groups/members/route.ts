import type { NextRequest } from "next/server";
import { siteManagementApiTypes } from "@kpool/types";
import { getSiteManagementApiBaseUrl } from "@/gateways/contact/contactApi";
import {
  siteManagementMembersRequestSchema,
  siteManagementUnavailableMessage,
} from "@/gateways/site-management/siteManagementPrincipalGroups";
import { savePrincipalGroups } from "../../../principalGroupSave";

export async function PATCH(request: NextRequest) {
  const baseUrl = getSiteManagementApiBaseUrl();
  return savePrincipalGroups(request, {
    baseUrl,
    requestSchema: siteManagementMembersRequestSchema,
    responseSchema:
      siteManagementApiTypes.schemas.UpdatePrincipalGroupMembersResponse,
    unavailable: siteManagementUnavailableMessage,
    refresh: async (_body, headers, captureCookies) => {
      const response = await fetch(`${baseUrl}/principal-groups`, {
        method: "GET",
        headers: { ...headers },
        cache: "no-store",
      });
      captureCookies(response);
      if (!response.ok) throw response;
      const parsed =
        siteManagementApiTypes.schemas.PrincipalGroupList.safeParse(
          await response.json(),
        );
      if (!parsed.success) throw parsed.error;
      return parsed.data;
    },
  });
}
