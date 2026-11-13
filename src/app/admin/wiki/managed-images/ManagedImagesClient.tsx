"use client";

import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { buildWikiPath, formatWikiImageLicense, isSafeWikiSourceUrl, type ManagedImage, type ImageMetadata } from "@kpool/wiki";
import { fetchManagedImages, updateImageMetadata } from "@/gateways/wiki/managedImageBrowserApi";
import { canManageWikiImages } from "@/gateways/wiki/wikiPrincipal";
import { useAuthStore } from "@/gateways/auth/authStore";
import { useAdmin } from "../../AdminProvider";
import { useWikiSection } from "../WikiSectionProvider";

import { ImageMetadataDialog } from "./ImageMetadataDialog";

type AdminText = ReturnType<typeof useAdmin>["t"];
const buttonClass = "rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold disabled:opacity-60";

export function ManagedImagesClient() {
  const { currentIdentity, locale, t } = useAdmin();
  const { principalState } = useWikiSection();
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  if (principalState.status !== "available" || !canManageWikiImages(principalState.principal)) return null;
  const scope = `${currentIdentity.identityIdentifier}:${currentIdentity.accountIdentifier}:${currentIdentity.accountPrincipalIdentifier}:${principalState.principal.principalIdentifier}:${sessionVersion}`;
  return <ManagedImageWorkspace key={scope} scope={scope} locale={locale} t={t} />;
}

export function ManagedImageWorkspace({ scope, locale, t }: { scope: string; locale: ReturnType<typeof useAdmin>["locale"]; t: AdminText }) {
  const queryClient = useQueryClient();
  const queryKey = ["admin", "managedImages", scope, "approved"];
  const text = t.managedImages;
  const [editing, setEditing] = useState<ManagedImage | null>(null);
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchManagedImages(pageParam, text.loadFailed),
    getNextPageParam: (page) => page.current_page < page.last_page ? page.current_page + 1 : undefined,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: ({ image, metadata }: { image: ManagedImage; metadata: ImageMetadata }) => updateImageMetadata(image.imageIdentifier, metadata, text.saveFailed),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setEditing(null);
    },
  });
  const images = query.data?.pages.flatMap((page) => page.images) ?? [];
  return <section className="space-y-5" aria-label={text.title}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">{text.title}</h2>
      {query.data ? <p className="text-sm text-text-muted">{text.total}: {query.data.pages[0].total}</p> : null}
    </div>
    {mutation.isSuccess ? <p role="status">{text.saved}</p> : null}
    {query.isPending ? <p role="status">{text.loading}</p> : null}
    {query.isError ? <div role="alert"><p>{query.error.message}</p><button className={buttonClass} onClick={() => void query.refetch()}>{text.reload}</button></div> : null}
    {!query.isPending && !query.isError && images.length === 0 ? <p>{text.empty}</p> : null}
    <div className="space-y-2">
      {images.map((image) => {
        const language = [locale, "ja", "en", "ko"].find((candidate) => image.wiki.names[candidate]?.trim()) ?? locale;
        const name = image.wiki.names[language] || image.wiki.slug;
        return (
          <article key={image.imageIdentifier} className="flex items-center gap-3 rounded-lg border border-stroke-subtle bg-surface-base p-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-black/5 sm:size-20">
              <Image alt={image.altText || image.sourceName} src={image.url} fill className="object-contain" sizes="80px" unoptimized />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                {image.wiki.slug ? (
                  <Link href={buildWikiPath(language, image.wiki.slug)} className="truncate text-sm font-semibold hover:underline" title={name}>{name}</Link>
                ) : <p className="truncate text-sm font-semibold">{image.sourceName}</p>}
                {image.isHidden ? <span className="shrink-0 rounded bg-surface-raised px-1.5 py-0.5 text-xs text-text-muted">{text.hidden}</span> : null}
              </div>
              <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                <div className="min-w-0 max-w-full">
                  <dt className="sr-only">{t.draftImageSourceNameLabel}</dt>
                  <dd className="truncate" title={image.sourceName}>{isSafeWikiSourceUrl(image.sourceUrl) ? <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">{image.sourceName}</a> : image.sourceName}</dd>
                </div>
                <div className="min-w-0 max-w-full">
                  <dt className="sr-only">{t.imageAuthorLabel}</dt>
                  <dd className="truncate" title={image.author ?? undefined}>{image.author || "—"}</dd>
                </div>
                <div>
                  <dt className="sr-only">{t.imageLicenseLabel}</dt>
                  <dd>{image.license ? formatWikiImageLicense(image.license) : "—"}</dd>
                </div>
              </dl>
            </div>
            <button className={`${buttonClass} shrink-0`} type="button" onClick={() => { mutation.reset(); setEditing(image); }}>{text.edit}</button>
          </article>
        );
      })}
    </div>
    {editing ? (
      <ImageMetadataDialog
        key={editing.imageIdentifier}
        image={editing}
        t={t}
        busy={mutation.isPending}
        error={mutation.error?.message ?? null}
        onClose={() => { setEditing(null); mutation.reset(); }}
        onSave={(metadata) => mutation.mutate({ image: editing, metadata })}
      />
    ) : null}
    {query.hasNextPage ? <button className={buttonClass} disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? text.loading : text.more}</button> : null}
  </section>;
}
