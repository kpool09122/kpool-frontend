"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

import { type WikiDetail } from "@kpool/wiki";

import { ImageEditableOverlay } from "../icons";
import { cardSurfaceStyle } from "../styles";

type WikiHeroPanelProps = {
  heroImage: WikiDetail["heroImage"];
  onOpenImageLibrary?: () => void;
};

const maxPhotoHeight = "min(60svh, 480px)";

export function WikiHeroPanel({
  heroImage,
  onOpenImageLibrary,
}: WikiHeroPanelProps) {
  const { dictionary } = useI18n();
  const [loadedImage, setLoadedImage] = useState<{ src: string; width: number; height: number }>();
  const dimensions = loadedImage?.src === heroImage.src ? loadedImage : undefined;
  const isPlaceholder = heroImage.isPlaceholder === true;

  return (
    <div
      className={`relative mx-auto max-w-full overflow-hidden rounded-[1.75rem] border border-stroke-subtle ${isPlaceholder ? "aspect-[4/3] max-h-[min(72svh,38rem)] w-full" : "w-fit"}`}
      style={cardSurfaceStyle}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Wiki hero images have no size metadata and determine the size of their frame. */}
      <img
        alt={heroImage.alt}
        className={isPlaceholder ? "absolute inset-0 size-full object-cover" : "block aspect-[auto_4/3] h-auto w-96 max-w-full"}
        draggable={false}
        onLoad={({ currentTarget }) => {
          const { naturalWidth, naturalHeight } = currentTarget;
          if (!isPlaceholder && naturalWidth && naturalHeight) {
            setLoadedImage({ src: heroImage.src, width: naturalWidth, height: naturalHeight });
          }
        }}
        src={heroImage.src}
        style={!isPlaceholder && dimensions ? {
          width: `min(${dimensions.width}px, calc(${maxPhotoHeight} * ${dimensions.width / dimensions.height}))`,
        } : undefined}
      />
      {onOpenImageLibrary ? (
        <>
          <button
            aria-label={dictionary.wiki.ui.openImageLibrary}
            className="absolute inset-0 z-10 grid cursor-pointer select-none place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary"
            onClick={onOpenImageLibrary}
            type="button"
          >
            {isPlaceholder ? (
              <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white">
                {dictionary.wiki.heroCard.choosePhoto}
              </span>
            ) : null}
          </button>
          {isPlaceholder ? null : <ImageEditableOverlay />}
        </>
      ) : (
        <span aria-hidden="true" className="absolute inset-0 select-none" />
      )}
    </div>
  );
}
