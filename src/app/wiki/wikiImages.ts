import { schemas } from "@kpool/types/wiki-private-api";
import { z } from "zod";

import {
  getWikiApiErrorMessage,
  trimTrailingSlashes,
  withWikiApiPrefix,
} from "./wikiApiModel";

export const wikiImageListResponseSchema = schemas.ListUploadedImagesResponseBody;
export const wikiDraftImageListResponseSchema = schemas.ListDraftImagesResponseBody;
export const wikiImageUploadResponseSchema = schemas.ImageDraftSummary;
export const wikiImageUploadRequestSchema = schemas.UploadImageRequestBody;
export const wikiImageReviewResponseSchema = z.union([
  schemas.ImageDraftSummary,
  schemas.ImageSummary,
]);

export type WikiUploadedImage = z.infer<typeof schemas.UploadedImageListItem>;
export type WikiDraftImage = z.infer<typeof schemas.DraftImageListItem>;
export type WikiImageListResponse = z.infer<typeof wikiImageListResponseSchema>;
export type WikiDraftImageListResponse = z.infer<typeof wikiDraftImageListResponseSchema>;
export type WikiImageUploadRequest = z.infer<typeof wikiImageUploadRequestSchema>;
export type WikiImageUploadResponse = z.infer<typeof wikiImageUploadResponseSchema>;
export type WikiImageReviewResponse = z.infer<typeof wikiImageReviewResponseSchema>;
export type WikiDraftImageStatus = z.infer<typeof schemas.DraftImageStatus>;

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

export type WikiImageAssociationInput = {
  resourceType: string;
  translationSetIdentifier: string;
};

export const createWikiImageAssociationInput = ({
  resourceType,
  translationSetIdentifier,
}: {
  resourceType: string;
  translationSetIdentifier: string;
}): WikiImageAssociationInput => ({
  resourceType,
  translationSetIdentifier,
});

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
  imageAssociation,
  rightsConfirmationAgreed,
  sourceName,
  sourceUrl,
}: {
  altText: string;
  base64EncodedImage: string;
  displayOrder: number;
  fileName: string;
  imageAssociation: WikiImageAssociationInput;
  rightsConfirmationAgreed: boolean;
  sourceName: string;
  sourceUrl: string;
}): WikiImageUploadRequest =>
  wikiImageUploadRequestSchema.parse({
    resourceType: imageAssociation.resourceType,
    translationSetIdentifier: imageAssociation.translationSetIdentifier,
    base64EncodedImage: stripDataUrlPrefix(base64EncodedImage),
    imageUsage: "profile",
    displayOrder,
    sourceUrl: sourceUrl.trim(),
    sourceName: sourceName.trim(),
    altText: altText.trim() || fileName,
    agreedToTermsAt: new Date().toISOString(),
    rightsConfirmationAgreed,
  });

export const createWikiImagesUrl = ({
  baseUrl,
  page,
  perPage,
  translationSetIdentifier,
}: {
  baseUrl: string;
  page: number;
  perPage: number;
  translationSetIdentifier: string;
}): string => {
  const url = new URL(`${trimTrailingSlashes(baseUrl)}/images`);

  url.searchParams.set("translationSetIdentifier", translationSetIdentifier);
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("page", String(page));

  return url.toString();
};

export const createWikiDraftImagesUrl = ({
  baseUrl,
  page,
  perPage,
  status,
  wikiIdentifier,
}: {
  baseUrl: string;
  page: number;
  perPage: number;
  status: WikiDraftImageStatus;
  wikiIdentifier?: string;
}): string => {
  const url = new URL(`${trimTrailingSlashes(baseUrl)}/draft-images`);

  url.searchParams.set("status", status);
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("page", String(page));

  if (wikiIdentifier) {
    url.searchParams.set("wikiIdentifier", wikiIdentifier);
  }

  return url.toString();
};

export const createWikiDraftImageReviewUrl = ({
  action,
  baseUrl,
  imageIdentifier,
}: {
  action: "approve" | "reject";
  baseUrl: string;
  imageIdentifier: string;
}): string =>
  `${trimTrailingSlashes(baseUrl)}/image/${encodeURIComponent(imageIdentifier)}/${action}`;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeDraftImageWikiNames = (names: unknown): Record<string, string> => {
  if (isObjectRecord(names)) {
    return Object.fromEntries(
      Object.entries(names).filter((entry): entry is [string, string] => {
        const [, value] = entry;

        return typeof value === "string";
      }),
    );
  }

  if (!Array.isArray(names)) {
    return {};
  }

  return Object.fromEntries(
    names.flatMap((name) => {
      if (!isObjectRecord(name)) {
        return [];
      }

      const language =
        typeof name.language === "string"
          ? name.language
          : typeof name.locale === "string"
            ? name.locale
            : null;
      const value =
        typeof name.name === "string"
          ? name.name
          : typeof name.value === "string"
            ? name.value
            : null;

      return language && value ? [[language, value]] : [];
    }),
  );
};

export const normalizeWikiDraftImageListResponse = (body: unknown): unknown => {
  if (!isObjectRecord(body) || !Array.isArray(body.images)) {
    return body;
  }

  return {
    ...body,
    images: body.images.map((image) => {
      if (!isObjectRecord(image) || !isObjectRecord(image.wiki)) {
        return image;
      }

      return {
        ...image,
        wiki: {
          ...image.wiki,
          names: normalizeDraftImageWikiNames(image.wiki.names),
        },
      };
    }),
  };
};

const readJsonResponse = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const getRouteErrorMessage = (body: unknown, fallback: string): string =>
  typeof body === "object" &&
  body !== null &&
  "message" in body &&
  typeof (body as { message: unknown }).message === "string"
    ? (body as { message: string }).message
    : fallback;

export const fetchWikiDraftImages = async ({
  page,
  perPage,
  status,
  wikiIdentifier,
  fallbackErrorMessage,
}: {
  page: number;
  perPage: number;
  status: WikiDraftImageStatus;
  wikiIdentifier?: string;
  fallbackErrorMessage: string;
}): Promise<WikiDraftImageListResponse> => {
  const url = new URL("/api/wiki/draft-images", window.location.origin);

  url.searchParams.set("status", status);
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("page", String(page));

  if (wikiIdentifier) {
    url.searchParams.set("wikiIdentifier", wikiIdentifier);
  }

  const response = await fetch(`${url.pathname}${url.search}`);
  const body = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return wikiDraftImageListResponseSchema.parse(normalizeWikiDraftImageListResponse(body));
};

const reviewWikiDraftImage = async ({
  action,
  fallbackErrorMessage,
  imageIdentifier,
}: {
  action: "approve" | "reject";
  fallbackErrorMessage: string;
  imageIdentifier: string;
}): Promise<WikiImageReviewResponse> => {
  const response = await fetch(
    `/api/wiki/draft-images/${encodeURIComponent(imageIdentifier)}/${action}`,
    {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    },
  );
  const body = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return wikiImageReviewResponseSchema.parse(body);
};

export const approveWikiDraftImage = async ({
  fallbackErrorMessage,
  imageIdentifier,
}: {
  fallbackErrorMessage: string;
  imageIdentifier: string;
}): Promise<WikiImageReviewResponse> =>
  reviewWikiDraftImage({
    action: "approve",
    fallbackErrorMessage,
    imageIdentifier,
  });

export const rejectWikiDraftImage = async ({
  fallbackErrorMessage,
  imageIdentifier,
}: {
  fallbackErrorMessage: string;
  imageIdentifier: string;
}): Promise<WikiImageReviewResponse> =>
  reviewWikiDraftImage({
    action: "reject",
    fallbackErrorMessage,
    imageIdentifier,
  });

export const getWikiImageErrorMessage = (error: unknown): string =>
  getWikiApiErrorMessage(error, {
    notFound: "Wiki image resource was not found.",
    requestFailedPrefix: "Wiki image request failed with status",
    responseSchemaPrefix: "Wiki image response did not match the expected schema",
    unavailable: "Wiki images are temporarily unavailable. Please try again later.",
  });
