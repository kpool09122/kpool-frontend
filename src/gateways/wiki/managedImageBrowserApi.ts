import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import { managedImageListSchema, imageMetadataSchema, wikiImageReviewResponseSchema, wikiDraftImageReviewCsrfHeaderName, wikiDraftImageReviewCsrfHeaderValue, type ImageMetadata, type ManagedImageFilters } from "@kpool/wiki";
import { getWikiRouteErrorMessage, readWikiRouteJsonResponse } from "./wikiBrowserRouteSupport";

export async function fetchManagedImages(page: number, fallbackErrorMessage: string, filters: ManagedImageFilters = {}) {
  const params = new URLSearchParams({ status: "approved", perPage: "12", page: String(page) });
  if (filters.license) params.set("license", filters.license);
  if (filters.licenseMissing) params.set("licenseMissing", "true");
  if (filters.authorMissing) params.set("authorMissing", "true");
  const response = await browserApiFetch(`/api/wiki/managed-images?${params}`);
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
