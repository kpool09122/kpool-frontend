import Image from "next/image";
import { ImageIcon, ReloadIcon } from "@radix-ui/react-icons";

import { type WikiUploadedImage } from "../../../app/wiki/wikiImageModel";
import { type WikiImageLibraryDictionary } from "./types";

export function WikiImageListPanel({
  canLoadMore,
  images,
  isBusy,
  isInitialLoading,
  isLoadingMore,
  loadError,
  t,
  onLoadMore,
  onSelectImage,
}: {
  canLoadMore: boolean;
  images: WikiUploadedImage[];
  isBusy: boolean;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  t: WikiImageLibraryDictionary;
  onLoadMore: () => void;
  onSelectImage?: (image: WikiUploadedImage) => void;
}) {
  return (
    <div
      aria-labelledby="wiki-image-library-images-tab"
      id="wiki-image-library-images-panel"
      role="tabpanel"
    >
      {loadError ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {loadError}
        </div>
      ) : null}

      {isInitialLoading ? (
        <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-stroke-subtle text-sm font-semibold text-text-muted">
          {t.loading}
        </div>
      ) : images.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <article
              className="overflow-hidden rounded-2xl border border-stroke-subtle bg-surface-base"
              key={image.imageIdentifier}
            >
              <button
                aria-label={t.selectImage(image.altText || t.noAltText)}
                className="grid w-full text-left transition hover:bg-brand-highlight/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                onClick={() => onSelectImage?.(image)}
                type="button"
              >
                <span className="relative block aspect-[4/3] bg-black/10">
                  <Image
                    alt={image.altText || image.sourceName || image.imageIdentifier}
                    className="object-cover"
                    fill
                    sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 90vw"
                    src={image.url}
                    unoptimized
                  />
                </span>
                <span className="grid gap-2 p-4 text-sm">
                  <span className="truncate font-semibold">
                    {t.imageAltText(image.altText || t.noAltText)}
                  </span>
                </span>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-stroke-subtle p-6 text-center">
          <div>
            <ImageIcon className="mx-auto h-6 w-6 text-text-muted" />
            <p className="mt-3 font-semibold">{t.emptyTitle}</p>
            <p className="mt-1 text-sm text-text-muted">{t.emptyMessage}</p>
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-center">
        {canLoadMore ? (
          <button
            className="inline-flex items-center gap-2 rounded-full border border-stroke-subtle px-5 py-3 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onLoadMore}
            type="button"
          >
            <ReloadIcon />
            {isLoadingMore ? t.loadingMore : t.loadMore}
          </button>
        ) : images.length > 0 ? (
          <p className="text-sm font-semibold text-text-muted">{t.allLoaded}</p>
        ) : null}
      </div>
    </div>
  );
}
