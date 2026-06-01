"use client";

import Image from "next/image";
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
  return (
    <div className="relative h-full min-h-[22rem] overflow-hidden rounded-[1.75rem] border border-stroke-subtle" style={cardSurfaceStyle}>
      {onOpenImageLibrary ? (
        <button
          aria-label="Open wiki image library"
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={onOpenImageLibrary}
          type="button"
        />
      ) : null}
      <Image
        alt={heroImage.alt}
        className="object-cover"
        fill
        sizes="(min-width: 1024px) 55vw, 100vw"
        src={heroImage.src}
        unoptimized
      />
      <ImageEditableOverlay />
    </div>
  );
}
