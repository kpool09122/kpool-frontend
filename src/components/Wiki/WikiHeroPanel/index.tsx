"use client";

import { useI18n } from "@/i18n/I18nProvider";

import { WikiProfileImage } from "../WikiProfileImage";
import { type WikiDetail } from "@kpool/wiki";

import { ImageEditableOverlay } from "../icons";
import { cardSurfaceStyle } from "../styles";

type WikiHeroPanelProps = {
  heroImage: WikiDetail["heroImage"];
  onOpenImageLibrary?: () => void;
};

export function WikiHeroPanel({
  heroImage,
  onOpenImageLibrary,
}: WikiHeroPanelProps) {
  const { dictionary } = useI18n();
  return (
    <div className="relative h-full min-h-[30rem] overflow-hidden rounded-[1.75rem] border border-stroke-subtle" style={cardSurfaceStyle}>
      <WikiProfileImage
        alt={heroImage.alt}
        className="object-cover"
        overlayAction={onOpenImageLibrary ? {
          label: dictionary.wiki.ui.openImageLibrary,
          onClick: onOpenImageLibrary,
        } : undefined}
        sizes="(min-width: 1024px) 55vw, 100vw"
        src={heroImage.src}
      />
      <ImageEditableOverlay />
    </div>
  );
}
