import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import { NextResponse, type NextRequest } from "next/server";
import { managedImageListSchema } from "@kpool/wiki";
import { getApiErrorBody } from "@/gateways/support/apiError";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { getForwardedWikiApiHeaders, jsonErrorResponse, parsePositiveIntegerParam, readJsonResponseBody, wikiImageUnavailableMessage } from "../wikiRouteSupport";

export async function GET(request: NextRequest) {
  const baseUrl = getWikiPrivateApiBaseUrl();
  if (!baseUrl) return jsonErrorResponse("Wiki image API is not configured.", 500);
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/managed-images`);
  url.searchParams.set("status", "approved");
  url.searchParams.set("page", String(parsePositiveIntegerParam(request.nextUrl.searchParams.get("page"), 1)));
  url.searchParams.set("perPage", String(parsePositiveIntegerParam(request.nextUrl.searchParams.get("perPage"), 12)));
  try {
    const response = await fetch(url, { headers: getForwardedWikiApiHeaders(request.headers), cache: "no-store" });
    const body = await readJsonResponseBody(response);
    if (!response.ok) return NextResponse.json(getApiErrorBody(body, wikiImageUnavailableMessage), { status: response.status });
    return NextResponse.json(parseWithSchemaLog("managed images response", managedImageListSchema, body));
  } catch (error) {
    console.error("Managed images request failed", error);
    return jsonErrorResponse(wikiImageUnavailableMessage, 502);
  }
}
