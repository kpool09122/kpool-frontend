import Image, { type ImageProps } from "next/image";

// The parent provides the positioned, clipped frame for the image and overlay.
export function WikiProfileImage({
  alt,
  className,
  sizes,
  src,
}: Pick<ImageProps, "alt" | "className" | "sizes" | "src">) {
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
      {/* Intercept image context menus while allowing clicks to reach parent controls. */}
      <span aria-hidden="true" className="absolute inset-0 z-[1] select-none" />
    </>
  );
}
