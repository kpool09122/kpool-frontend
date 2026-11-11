"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { normalizeWikiImageWidth } from "@kpool/wiki";
import { useI18n } from "@/i18n/I18nProvider";
import { ImageEditableOverlay } from "./icons";

export function WikiBlockImage({ src, alt, imageWidth, onSelect, onMaxWidthChange, showEditableOverlay = false }: {
  src: string;
  alt: string;
  imageWidth?: number | null;
  onSelect?: () => void;
  onMaxWidthChange?: (src: string, width: number) => void;
  showEditableOverlay?: boolean;
}) {
  const { dictionary } = useI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<{ src: string; width: number; height: number } | null>(null);
  const size = loaded?.src === src ? loaded : null;
  const requestedWidth = normalizeWikiImageWidth(imageWidth);
  const naturalWidth = size?.width;
  const displayWidth = naturalWidth ? Math.min(requestedWidth ?? naturalWidth, naturalWidth) : requestedWidth;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !naturalWidth || !onMaxWidthChange) return;
    const measure = () => {
      const maximum = Math.floor(Math.min(naturalWidth, frame.clientWidth));
      if (maximum > 0) onMaxWidthChange(src, maximum);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [naturalWidth, onMaxWidthChange, src]);

  return (
    <div className="min-w-0 self-start" ref={frameRef}>
      <div
        className="relative max-w-full overflow-hidden rounded-2xl ring-1 ring-inset ring-stroke-subtle"
        style={{ width: displayWidth ? `${displayWidth}px` : "100%" }}
      >
        <Image
          alt={alt}
          className="block h-auto w-full"
          draggable={false}
          height={size?.height ?? 1}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (naturalWidth > 0 && naturalHeight > 0) setLoaded({ src, width: naturalWidth, height: naturalHeight });
          }}
          src={src}
          unoptimized
          width={size?.width ?? 1}
        />
        {onSelect ? (
          <button
            aria-label={`${dictionary.wiki.ui.openImageLibrary}: ${alt}`}
            className="absolute inset-0 z-[1] cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary"
            onClick={onSelect}
            type="button"
          />
        ) : null}
        {showEditableOverlay ? <ImageEditableOverlay /> : null}
      </div>
    </div>
  );
}
