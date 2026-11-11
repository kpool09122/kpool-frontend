"use client";

import Image, { type ImageProps } from "next/image";

type WikiProfileImageProps = Pick<ImageProps, "alt" | "className" | "sizes" | "src"> & {
  overlayAction?: {
    label: string;
    onClick: () => void;
  };
};

// The parent provides the positioned, clipped frame for the image and overlay.
export function WikiProfileImage({
  alt,
  className,
  overlayAction,
  sizes,
  src,
}: WikiProfileImageProps) {
  return (
    <>
      <Image
        alt={alt}
        className={className}
        draggable={false}
        fill
        sizes={sizes}
        src={src}
        unoptimized
      />
      {overlayAction ? (
        <button
          aria-label={overlayAction.label}
          className="absolute inset-0 z-10 cursor-pointer select-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary"
          onClick={overlayAction.onClick}
          type="button"
        />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 z-[1] select-none" />
      )}
    </>
  );
}
