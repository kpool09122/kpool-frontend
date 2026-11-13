import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import { managedImageListSchema, imageMetadataSchema, wikiImageReviewResponseSchema, wikiDraftImageReviewCsrfHeaderName, wikiDraftImageReviewCsrfHeaderValue, type ImageMetadata } from "@kpool/wiki";
import { getWikiRouteErrorMessage, readWikiRouteJsonResponse } from "./wikiBrowserRouteSupport";

export async function fetchManagedImages(page: number, fallbackErrorMessage: string) {
  const response = await browserApiFetch(`/api/wiki/managed-images?status=approved&perPage=12&page=${page}`);
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);
  if (!response.ok) throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  return parseWithSchemaLog("managed images", managedImageListSchema, body);
}
export async function updateImageMetadata(imageIdentifier: string, metadata: ImageMetadata, fallbackErrorMessage: string) {
  const response = await browserApiFetch(`/api/wiki/images/${encodeURIComponent(imageIdentifier)}/metadata`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", [wikiDraftImageReviewCsrfHeaderName]: wikiDraftImageReviewCsrfHeaderValue },
    body: JSON.stringify(parseWithSchemaLog("image metadata request", imageMetadataSchema, metadata)),
  });
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);
  if (!response.ok) throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  return parseWithSchemaLog("image metadata update", wikiImageReviewResponseSchema, body);
}
