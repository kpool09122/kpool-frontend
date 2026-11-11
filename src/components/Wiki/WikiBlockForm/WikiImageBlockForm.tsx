"use client";

import { useCallback, useState } from "react";
import type { WikiBlock, WikiImageBlock, WikiImageGalleryBlock } from "@kpool/wiki";
import { LocalizedForm } from "@/components/LocalizedForm";
import { useI18n } from "@/i18n/I18nProvider";
import { WikiBlockDisplay } from "../WikiBlockDisplay";
import { WikiFormActions } from "../WikiFormActions";
import type { WikiImagePicker } from "../WikiImageLibrary/types";
import { toBlockImage } from "../WikiImageLibrary/wikiBlockImage";
import { normalizeWikiImageWidth } from "@kpool/wiki";

const isUnselectedImage = (image: WikiImageGalleryBlock["images"][number]) =>
  !image.imageSrc || image.imageIdentifier === "pending-image" || image.imageIdentifier === "pending-gallery-image";

export function WikiImageBlockForm({ block, onCancel, onSave, onRequestImage }: {
  block: WikiImageBlock | WikiImageGalleryBlock;
  onCancel: () => void;
  onSave: (changes: Partial<WikiBlock>) => void;
  onRequestImage: WikiImagePicker;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.blockForm;
  const isGallery = block.blockType === "image_gallery";
  const [images, setImages] = useState<WikiImageGalleryBlock["images"]>(() => isGallery ? block.images : [block]);
  const [imageWidth, setImageWidth] = useState(() => normalizeWikiImageWidth(block.imageWidth));
  const [maximumWidths, setMaximumWidths] = useState<Record<string, number>>({});
  const reportMaximumWidth = useCallback((src: string, width: number) => {
    setMaximumWidths((current) => current[src] === width ? current : { ...current, [src]: width });
  }, []);
  const maximumWidth = Math.max(0, ...images.map((image) => maximumWidths[image.imageSrc] ?? 0));
  const currentWidth = Math.min(imageWidth ?? maximumWidth, maximumWidth);
  const [caption, setCaption] = useState(() =>
    (isGallery ? block.images.every(isUnselectedImage) : isUnselectedImage(block)) ? "" : block.caption ?? "",
  );
  const chooseImage = (index: number) => onRequestImage((image) => {
    setImages((current) => current.map((entry, entryIndex) => entryIndex === index ? toBlockImage(image) : entry));
  });
  const canSave = images.length > 0 && !images.some(isUnselectedImage);

  return (
    <LocalizedForm className="grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      if (!canSave) return;
      const width = block.imageWidth != null || imageWidth != null ? { imageWidth } : {};
      onSave(isGallery ? { images, caption: caption || null, ...width } : { ...images[0], caption: caption || null, ...width });
    }}>
      <div className="grid gap-4" data-unsaved-value={JSON.stringify(images)}>
        {images.map((image, index) => (
          <div className="grid gap-3" key={index}>
            {isUnselectedImage(image) || image.isHidden ? (
              <button className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-stroke-subtle bg-surface-base text-sm font-semibold" onClick={() => chooseImage(index)} type="button">
                {t.selectImage}
              </button>
            ) : (
              <WikiBlockDisplay
                block={{ ...image, blockType: "image", blockIdentifier: block.blockIdentifier, displayOrder: 1, caption: null, imageWidth }}
                onSelectImage={() => chooseImage(index)}
                onImageMaxWidth={reportMaximumWidth}
                showEditableImageOverlay
              />
            )}
            {isGallery ? (
              <button className="justify-self-start text-sm text-status-danger disabled:opacity-40" disabled={images.length <= 1} onClick={() => setImages((current) => current.filter((_, entryIndex) => entryIndex !== index))} type="button">
                {t.removeImage}
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {isGallery ? (
        <button className="justify-self-start rounded-lg border border-stroke-subtle px-3 py-2 text-sm" onClick={() => onRequestImage((image) => setImages((current) => [...current.filter((entry) => !isUnselectedImage(entry)), toBlockImage(image)]))} type="button">
          {t.addImage}
        </button>
      ) : null}
      <label className="grid gap-2 text-sm font-semibold">
        <span>{t.imageWidth}: {maximumWidth > 0 ? `${currentWidth}px` : "—"}</span>
        <input name="imageWidth" type="range" disabled={maximumWidth === 0} min={1} max={Math.max(1, maximumWidth)} step={1} value={Math.max(1, currentWidth)} onChange={(event) => setImageWidth(Number(event.currentTarget.value))} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        {t.caption}
        <input className="w-full rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" name="caption" value={caption} onChange={(event) => setCaption(event.currentTarget.value)} />
      </label>
      <WikiFormActions disabled={!canSave} onCancel={onCancel} />
    </LocalizedForm>
  );
}
