import { schemas } from "@kpool/types/wiki-private-api";
import { z } from "zod";

import {
  getWikiApiErrorMessage,
  trimTrailingSlashes,
  withWikiApiPrefix,
} from "./wikiApiModel";

export const wikiImageListResponseSchema = schemas.ListUploadedImagesResponseBody;
export const wikiImageUploadResponseSchema = schemas.ImageDraftSummary;
export const wikiImageUploadRequestSchema = schemas.UploadImageRequestBody;

export type WikiUploadedImage = z.infer<typeof schemas.UploadedImageListItem>;
export type WikiImageListResponse = z.infer<typeof wikiImageListResponseSchema>;
export type WikiImageUploadRequest = z.infer<typeof wikiImageUploadRequestSchema>;
export type WikiImageUploadResponse = z.infer<typeof wikiImageUploadResponseSchema>;

export const wikiImageAcceptedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const acceptedExtensions = [".jpg", ".jpeg", ".png", ".webp"] as const;

export const wikiImageAcceptAttribute = [
  ...wikiImageAcceptedMimeTypes,
  ...acceptedExtensions,
].join(",");

export const defaultWikiImagePerPage = 12;

export const getWikiImageApiBaseUrl = (): string =>
  process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL
    ? withWikiApiPrefix(process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL)
    : "";

export const isAcceptedWikiImageFile = (file: Pick<File, "name" | "type">): boolean => {
  const normalizedType = file.type.toLowerCase();
  const normalizedName = file.name.toLowerCase();

  return (
    wikiImageAcceptedMimeTypes.some((type) => type === normalizedType) &&
    acceptedExtensions.some((extension) => normalizedName.endsWith(extension))
  );
};

export const stripDataUrlPrefix = (value: string): string => {
  const marker = ";base64,";
  const markerIndex = value.indexOf(marker);

  return markerIndex >= 0 ? value.slice(markerIndex + marker.length) : value;
};

export const createWikiImageUploadRequest = ({
  altText,
  base64EncodedImage,
  displayOrder,
  fileName,
  resourceType,
  wikiIdentifier,
}: {
  altText: string;
  base64EncodedImage: string;
  displayOrder: number;
  fileName: string;
  resourceType: string;
  wikiIdentifier: string;
}): WikiImageUploadRequest =>
  wikiImageUploadRequestSchema.parse({
    resourceType,
    wikiIdentifier,
    base64EncodedImage: stripDataUrlPrefix(base64EncodedImage),
    imageUsage: "wiki_editor",
    displayOrder,
    sourceUrl: "",
    sourceName: fileName,
    altText: altText.trim() || fileName,
    agreedToTermsAt: new Date().toISOString(),
  });

export const createWikiImagesUrl = ({
  baseUrl,
  page,
  perPage,
  wikiIdentifier,
}: {
  baseUrl: string;
  page: number;
  perPage: number;
  wikiIdentifier: string;
}): string => {
  const url = new URL(`${trimTrailingSlashes(baseUrl)}/images`);

  url.searchParams.set("wikiIdentifier", wikiIdentifier);
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("page", String(page));

  return url.toString();
};

export const getWikiImageErrorMessage = (error: unknown): string =>
  getWikiApiErrorMessage(error, {
    notFound: "Wiki image resource was not found.",
    requestFailedPrefix: "Wiki image request failed with status",
    responseSchemaPrefix: "Wiki image response did not match the expected schema",
    unavailable: "Wiki images are temporarily unavailable. Please try again later.",
  });
