import type { NextRequest } from "next/server";
import { wikiPrivateApiTypes } from "@kpool/types";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import {
  createWikiPrincipalGroupsUrl,
  parseWikiPrincipalGroupsResponse,
  wikiPrincipalGroupsUnavailableMessage,
} from "@/gateways/wiki/wikiPrincipalGroups";
import { savePrincipalGroups } from "../../../principalGroupSave";
const responseSchema = wikiPrivateApiTypes.wikiPrivateApi.api.find(
  (endpoint) =>
    endpoint.method === "patch" &&
    endpoint.path === "/principal-groups/members",
)!.response;
export async function PATCH(request: NextRequest) {
  const baseUrl = getWikiPrivateApiBaseUrl();
  return savePrincipalGroups(request, {
    baseUrl,
    requestSchema:
      wikiPrivateApiTypes.schemas.UpdatePrincipalGroupMembersRequestBody,
    responseSchema,
    unavailable: wikiPrincipalGroupsUnavailableMessage,
    refresh: async (body, headers, capture) => {
      const result = responseSchema.safeParse(body);
      if (!result.success) throw new Error("Invalid update response.");
      const parsed = result.data;
      const accountIdentifier = parsed.principalGroups[0]?.accountIdentifier;
      if (!accountIdentifier) throw new Error("Missing account scope.");
      const response = await fetch(
        createWikiPrincipalGroupsUrl({ baseUrl: baseUrl!, accountIdentifier }),
        { method: "GET", headers: { ...headers }, cache: "no-store" },
      );
      capture(response);
      if (!response.ok) throw response;
      return parseWikiPrincipalGroupsResponse(await response.json());
    },
  });
}
