import { revalidateTag } from "next/cache";
import { publicWikiCacheTag } from "@/gateways/wiki/publicWikiCache";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import { NextResponse, type NextRequest } from "next/server";
import { imageMetadataSchema, wikiImageReviewResponseSchema, wikiDraftImageReviewCsrfHeaderName, wikiDraftImageReviewCsrfHeaderValue } from "@kpool/wiki";
import { getApiErrorBody } from "@/gateways/support/apiError";
import { getWikiPrivateApiBaseUrl } from "@/gateways/wiki/wikiPrivateServerApi";
import { getForwardedWikiApiHeaders, jsonErrorResponse, readJsonResponseBody, wikiImageUnavailableMessage } from "../../../wikiRouteSupport";

export async function PATCH(request: NextRequest, context: { params: Promise<{ imageId: string }> }) {
  if (request.headers.get(wikiDraftImageReviewCsrfHeaderName) !== wikiDraftImageReviewCsrfHeaderValue) return jsonErrorResponse("Image update request is not allowed.", 403);
  const baseUrl = getWikiPrivateApiBaseUrl();
  if (!baseUrl) return jsonErrorResponse("Wiki image API is not configured.", 500);
  const input = imageMetadataSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return jsonErrorResponse("Invalid image metadata.", 422);
  try {
    const { imageId } = await context.params;
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/image/${encodeURIComponent(imageId)}/metadata`, {
      method: "PATCH", headers: { ...getForwardedWikiApiHeaders(request.headers), "Content-Type": "application/json" },
      body: JSON.stringify(input.data), cache: "no-store",
    });
    const body = await readJsonResponseBody(response);
    if (!response.ok) return NextResponse.json(getApiErrorBody(body, wikiImageUnavailableMessage), { status: response.status });
    const result = parseWithSchemaLog("image metadata response", wikiImageReviewResponseSchema, body);
    revalidateTag(publicWikiCacheTag, { expire: 0 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Image metadata update failed", error);
    return jsonErrorResponse(wikiImageUnavailableMessage, 502);
  }
}
