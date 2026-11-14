import { z } from "zod";
import { wikiPrivateApiTypes } from "@kpool/types";
import { isSafeWikiSourceUrl } from "./wikiImageModel";

export const managedImageSchema = wikiPrivateApiTypes.schemas.ManagedImageListItem;
export const managedImageListSchema = wikiPrivateApiTypes.schemas.ListManagedImagesResponseBody;
export const imageMetadataSchema = wikiPrivateApiTypes.schemas.UpdateImageMetadataRequestBody.extend({
  sourceUrl: z.string().trim()
    .pipe(wikiPrivateApiTypes.schemas.UpdateImageMetadataRequestBody.shape.sourceUrl)
    .refine((url) => !url || isSafeWikiSourceUrl(url))
    .nullable(),
  sourceName: z.string().trim().min(1).max(255),
  author: z.string().trim().min(1).max(255),
  altText: z.string().max(512),
  displayOrder: z.number().int().min(0).max(2147483647),
}).strip();
export type ManagedImage = z.infer<typeof managedImageSchema>;
export type ManagedImageList = z.infer<typeof managedImageListSchema>;
export type ImageMetadata = z.infer<typeof imageMetadataSchema>;

export type ManagedImageFilters = {
  license?: ImageMetadata["license"];
  authorMissing?: boolean;
  licenseMissing?: boolean;
};
