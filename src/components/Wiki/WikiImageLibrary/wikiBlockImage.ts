import type { WikiUploadedImage } from "@kpool/wiki";

export const toBlockImage = (image: WikiUploadedImage) => ({
  imageIdentifier: image.imageIdentifier,
  imageSrc: image.url,
  alt: image.altText || image.sourceName || null,
  isHidden: false,
});
