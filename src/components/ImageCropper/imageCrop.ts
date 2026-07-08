import type { PixelCrop } from "react-image-crop";

const dataUrlMimePattern = /^data:([^;,]+)[;,]/;

export type CropImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: "canvas-unavailable" };

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("file-read-failed"));
    };
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });

const resolveMimeType = (sourceDataUrl: string, fallback = "image/png") =>
  sourceDataUrl.match(dataUrlMimePattern)?.[1] ?? fallback;

const getRenderedImageSize = (image: HTMLImageElement) => {
  const rect = image.getBoundingClientRect();

  return {
    width: rect.width || image.width || image.naturalWidth,
    height: rect.height || image.height || image.naturalHeight,
  };
};

export const cropImageToDataUrl = ({
  crop,
  image,
  sourceDataUrl,
}: {
  crop: PixelCrop | null;
  image: HTMLImageElement | null;
  sourceDataUrl: string;
}): CropImageResult => {
  if (!crop || !image || !image.naturalWidth || !image.naturalHeight || !crop.width || !crop.height) {
    return { ok: false, reason: "canvas-unavailable" };
  }

  const renderedSize = getRenderedImageSize(image);
  const scaleX = image.naturalWidth / renderedSize.width;
  const scaleY = image.naturalHeight / renderedSize.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * scaleX));
  canvas.height = Math.max(1, Math.round(crop.height * scaleY));
  const context = canvas.getContext("2d");

  if (!context) {
    return { ok: false, reason: "canvas-unavailable" };
  }

  context.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return { ok: true, dataUrl: canvas.toDataURL(resolveMimeType(sourceDataUrl)) };
};
