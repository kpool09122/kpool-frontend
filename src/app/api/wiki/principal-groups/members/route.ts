import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import {
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

const getWikiPrincipalGroupRouteErrorMessage = (status: number, body: unknown): string => {
  if (status >= 500) {
    return wikiPrincipalGroupsUnavailableMessage;
  }

  if (typeof body === "object" && body !== null && "message" in body && typeof (body as { message: unknown }).message === "string") {
    return (body as { message: string }).message;
  }

  if (typeof body === "object" && body !== null && "detail" in body && typeof (body as { detail: unknown }).detail === "string") {
    return (body as { detail: string }).detail;
  }

  return `Wiki principal groups request failed with status ${status}.`;
};

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
    const apiResponse = await fetch(createWikiPrincipalGroupMembersUrl(baseUrl), {
      method: "PATCH",
      headers: {
        ...getForwardedWikiApiHeaders(request.headers),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateRequest),
      cache: "no-store",
    });
    const body = await readJsonResponseBody(apiResponse);

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: getWikiPrincipalGroupRouteErrorMessage(apiResponse.status, body) },
        { status: apiResponse.status },
      );
    }

    return NextResponse.json(parseWikiPrincipalGroupsResponse(body), { status: apiResponse.status });
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
