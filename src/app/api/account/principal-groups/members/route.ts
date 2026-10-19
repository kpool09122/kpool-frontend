import type { NextRequest } from "next/server";
import { accountApiTypes } from "@kpool/types";
import { z } from "zod";
import {
  getAccountApiBaseUrl,
  parsePrincipalGroupsResponse,
  parseAccountMembersResponse,
} from "@/gateways/account/accountApi";
import { savePrincipalGroups } from "../../../principalGroupSave";
export async function PATCH(request: NextRequest) {
  const baseUrl = getAccountApiBaseUrl();
  return savePrincipalGroups(request, {
    baseUrl,
    requestSchema:
      accountApiTypes.schemas.UpdatePrincipalGroupMembersRequestBody,
    responseSchema: z.object({
      principalGroups: z.array(
        accountApiTypes.schemas.UpdatedPrincipalGroupSummary,
      ),
      principalStatuses: z.array(
        accountApiTypes.schemas.KPool_Common_PrincipalStatusUpdate,
      ),
    }),
    unavailable: "Account API is temporarily unavailable.",
    refresh: async (_body, headers, capture) => {
      const groups = await fetch(`${baseUrl}/principal-groups`, {
        headers: { ...headers },
        cache: "no-store",
      });
      capture(groups);
      if (!groups.ok) throw groups;
      const parsedGroups = parsePrincipalGroupsResponse(await groups.json());
      const members = await fetch(`${baseUrl}/members`, {
        headers: { ...headers },
        cache: "no-store",
      });
      capture(members);
      if (!members.ok) throw members;
      return {
        ...parsedGroups,
        ...parseAccountMembersResponse(await members.json()),
      };
    },
  });
}
