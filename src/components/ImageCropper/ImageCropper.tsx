"use client";

import { useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";

import { cropImageToDataUrl } from "./imageCrop";
import type { ImageCropperDictionary } from "./types";

type ImageCropperProps = {
  aspect?: number;
  disabled?: boolean;
  size?: "default" | "compact";
  sourceDataUrl: string;
  t: ImageCropperDictionary;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
  onError: (message: string) => void;
  onReselect?: () => void;
};

const createInitialCrop = (width: number, height: number, aspect?: number): Crop => {
  if (aspect) {
    return centerCrop(
      makeAspectCrop({ unit: "%", width: 82 }, aspect, width, height),
      width,
      height,
    );
  }

  return { unit: "%", x: 10, y: 10, width: 80, height: 80 };
};

const toPixelCrop = (crop: Crop, width: number, height: number): PixelCrop => ({
  unit: "px",
  x: crop.unit === "%" ? (crop.x / 100) * width : crop.x,
  y: crop.unit === "%" ? (crop.y / 100) * height : crop.y,
  width: crop.unit === "%" ? (crop.width / 100) * width : crop.width,
  height: crop.unit === "%" ? (crop.height / 100) * height : crop.height,
});

export function ImageCropper({
  aspect,
  disabled = false,
  size = "default",
  sourceDataUrl,
  t,
  onCancel,
  onConfirm,
  onError,
  onReselect,
}: ImageCropperProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [loadedSourceDataUrl, setLoadedSourceDataUrl] = useState<string | null>(null);
  const [hasImageLoadError, setHasImageLoadError] = useState(false);
  const imageFrameClassName =
    size === "compact"
      ? "mx-auto w-full max-w-[520px] overflow-hidden rounded-xl border border-stroke-subtle bg-surface-raised p-2"
      : "overflow-hidden rounded-xl border border-stroke-subtle bg-surface-raised p-2";
  const imageClassName =
    size === "compact"
      ? "max-h-[300px] max-w-full object-contain"
      : "max-h-[420px] w-full object-contain";
  const isImageLoaded = loadedSourceDataUrl === sourceDataUrl && !hasImageLoadError;
  const canConfirmCrop = isImageLoaded && Boolean(completedCrop) && !disabled;

  const confirmCrop = () => {
    const result = cropImageToDataUrl({
      crop: completedCrop,
      image: imageRef.current,
      sourceDataUrl,
    });

    if (result.ok) {
      onConfirm(result.dataUrl);
      return;
    }

    onError(t.cropFailed);
  };

  return (
    <section
      aria-label={t.title}
      className="grid gap-4 rounded-2xl border border-stroke-subtle bg-surface-base p-4"
      data-testid="image-cropper"
    >
      <div>
        <h3 className="text-base font-semibold text-text-strong">{t.title}</h3>
        <p className="mt-1 text-sm leading-6 text-text-muted">{t.description}</p>
      </div>
      <div className={imageFrameClassName}>
        <ReactCrop
          aspect={aspect}
          crop={crop}
          disabled={disabled}
          keepSelection
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={sourceDataUrl}
            ref={imageRef}
            alt=""
            className={imageClassName}
            data-testid="image-cropper-image"
            onError={() => {
              setHasImageLoadError(true);
              setLoadedSourceDataUrl(null);
              setCompletedCrop(null);
              onError(t.loadFailed);
            }}
            onLoad={(event) => {
              const image = event.currentTarget;
              const rect = image.getBoundingClientRect();
              const cropWidth = rect.width || image.width || image.naturalWidth || 1;
              const cropHeight = rect.height || image.height || image.naturalHeight || 1;
              const initialCrop = createInitialCrop(cropWidth, cropHeight, aspect);

              imageRef.current = image;
              setHasImageLoadError(false);
              setLoadedSourceDataUrl(sourceDataUrl);
              setCrop(initialCrop);
              setCompletedCrop(toPixelCrop(initialCrop, cropWidth, cropHeight));
            }}
            src={sourceDataUrl}
          />
        </ReactCrop>
      </div>
      {!isImageLoaded ? <p className="text-sm text-text-muted">{t.loading}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          className="rounded-full border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canConfirmCrop}
          onClick={confirmCrop}
          type="button"
        >
          {t.confirm}
        </button>
        {onReselect ? (
          <button
            className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            onClick={onReselect}
            type="button"
          >
            {t.reselect}
          </button>
        ) : null}
        <button
          className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={onCancel}
          type="button"
        >
          {t.cancel}
        </button>
      </div>
    </section>
  );
}
