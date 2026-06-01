import { wikiPrivateApiTypes } from "@kpool/types";
import { z } from "zod";

import { trimTrailingSlashes } from "./wikiApiModel";

const parseWikiSchema = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);

  return result.success ? result.data : (body as T);
};

export const defaultWikiImagePerPage = 12;
export const wikiImageMaxFileSizeBytes = 5 * 1024 * 1024;
export const wikiImageMaxBase64Length = Math.ceil(wikiImageMaxFileSizeBytes / 3) * 4;
export const wikiImageMaxUploadBodyBytes = wikiImageMaxBase64Length + 4096;
export const wikiDraftImageReviewCsrfHeaderName = "X-KPool-Wiki-Review-Request";
export const wikiDraftImageReviewCsrfHeaderValue = "1";

export const wikiSafeSourceUrlSchema = z
  .string()
  .trim()
  .refine((value) => isSafeWikiSourceUrl(value), {
    message: "Wiki image source URL must use http or https.",
  });

export const wikiImageListResponseSchema = wikiPrivateApiTypes.schemas.ListUploadedImagesResponseBody;
export const wikiDraftImageListResponseSchema = wikiPrivateApiTypes.schemas.ListDraftImagesResponseBody;
export const wikiImageUploadResponseSchema = wikiPrivateApiTypes.schemas.ImageDraftSummary;
export const wikiImageUploadRequestSchema = wikiPrivateApiTypes.schemas.UploadImageRequestBody.extend({
  base64EncodedImage: z.string().max(wikiImageMaxBase64Length),
});
export const wikiImageReviewResponseSchema = z.union([
  wikiPrivateApiTypes.schemas.ImageDraftSummary,
  wikiPrivateApiTypes.schemas.ImageSummary,
]);

export type WikiUploadedImage = z.infer<typeof wikiPrivateApiTypes.schemas.UploadedImageListItem>;
export type WikiDraftImage = z.infer<typeof wikiPrivateApiTypes.schemas.DraftImageListItem>;
export type WikiImageListResponse = z.infer<typeof wikiImageListResponseSchema>;
export type WikiDraftImageListResponse = z.infer<typeof wikiDraftImageListResponseSchema>;
export type WikiImageUploadRequest = z.infer<typeof wikiImageUploadRequestSchema>;
export type WikiImageUploadResponse = z.infer<typeof wikiImageUploadResponseSchema>;
export type WikiImageReviewResponse = z.infer<typeof wikiImageReviewResponseSchema>;
export type WikiDraftImageStatus = z.infer<typeof wikiPrivateApiTypes.schemas.DraftImageStatus>;

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

export type WikiImageAssociationInput = {
  resourceType: string;
  translationSetIdentifier: string;
};

export const isSafeWikiSourceUrl = (value: string): boolean => {
  const trimmedValue = value.trim();

  if (!URL.canParse(trimmedValue)) {
    return false;
  }

  const url = new URL(trimmedValue);

  return url.protocol === "http:" || url.protocol === "https:";
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

export const isAcceptedWikiImageFile = (file: { name: string; type: string }): boolean => {
  const normalizedType = file.type.toLowerCase();
  const normalizedName = file.name.toLowerCase();

  return (
    wikiImageAcceptedMimeTypes.some((type) => type === normalizedType) &&
    acceptedExtensions.some((extension) => normalizedName.endsWith(extension))
  );
};

export const isWikiImageFileSizeAllowed = (file: { size: number }): boolean =>
  Number.isFinite(file.size) && file.size > 0 && file.size <= wikiImageMaxFileSizeBytes;

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
  parseWikiSchema(wikiImageUploadRequestSchema, {
    resourceType: imageAssociation.resourceType,
    translationSetIdentifier: imageAssociation.translationSetIdentifier,
    base64EncodedImage: stripDataUrlPrefix(base64EncodedImage),
    displayOrder,
    sourceUrl: isSafeWikiSourceUrl(sourceUrl) ? sourceUrl.trim() : "",
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
