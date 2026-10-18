import { getApiErrorBody } from "@/gateways/support/apiError";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import {
  createWikiPrincipalGroupsUrl,
  createWikiPrincipalGroupMembersUrl,
  parseWikiPrincipalGroupMembersUpdateRequest,
  parseWikiPrincipalGroupsResponse,
  wikiPrincipalGroupsUnavailableMessage,
} from "@/gateways/wiki/wikiPrincipalGroups";
import {
  getForwardedWikiApiHeaders,
  jsonErrorResponse,
  readJsonResponseBody,
} from "../../wikiRouteSupport";

const principalGroupMembersUpdateResponseSchema = z.object({
  principalGroups: z.array(
    z.object({
      accountIdentifier: z.string().uuid(),
    }),
  ).min(1),
});

export async function PATCH(request: NextRequest) {
  const baseUrl = getWikiPrivateApiBaseUrl();

  if (!baseUrl) {
    return jsonErrorResponse("Wiki principal group API is not configured.", 500);
  }

  let updateRequest;

  try {
    updateRequest = parseWikiPrincipalGroupMembersUpdateRequest(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid wiki principal group members update request." },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { message: "Invalid wiki principal group members update request." },
      { status: 400 },
    );
  }

  try {
    const forwardedHeaders = getForwardedWikiApiHeaders(request.headers);
    const apiResponse = await fetch(createWikiPrincipalGroupMembersUrl(baseUrl), {
      method: "PATCH",
      headers: {
        ...forwardedHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateRequest),
      cache: "no-store",
    });
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        getApiErrorBody(body, wikiPrincipalGroupsUnavailableMessage),
        { status: apiResponse.status },
      );
    }

    const updateResponse = principalGroupMembersUpdateResponseSchema.safeParse(body);

    if (!updateResponse.success) {
      return NextResponse.json(
        { message: "Wiki principal group response did not match the expected schema." },
        { status: 502 },
      );
    }

    const principalGroupsResponse = await fetch(
      createWikiPrincipalGroupsUrl({
        accountIdentifier: updateResponse.data.principalGroups[0].accountIdentifier,
        baseUrl,
      }),
      {
        method: "GET",
        headers: forwardedHeaders,
        cache: "no-store",
      },
    );
    const principalGroupsBody = await readJsonResponseBody(principalGroupsResponse);

    if (!principalGroupsResponse.ok) {
      return NextResponse.json(
        getApiErrorBody(principalGroupsBody, wikiPrincipalGroupsUnavailableMessage),
        { status: principalGroupsResponse.status },
      );
    }

    return NextResponse.json(parseWikiPrincipalGroupsResponse(principalGroupsBody), { status: principalGroupsResponse.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Wiki principal group response did not match the expected schema." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: wikiPrincipalGroupsUnavailableMessage },
      { status: 502 },
    );
  }
}
