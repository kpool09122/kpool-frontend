"use client";

import { useState, type FormEvent } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { buildWikiPath, formatWikiImageLicense, imageMetadataSchema, isSafeWikiSourceUrl, wikiImageLicenseOptions, type ManagedImage, type ImageMetadata } from "@kpool/wiki";
import { fetchManagedImages, updateImageMetadata } from "@/gateways/wiki/managedImageBrowserApi";
import { canManageWikiImages } from "@/gateways/wiki/wikiPrincipal";
import { useAuthStore } from "@/gateways/auth/authStore";
import { useAdmin } from "../../AdminProvider";
import { useWikiSection } from "../WikiSectionProvider";

type AdminText = ReturnType<typeof useAdmin>["t"];
const inputClass = "w-full rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2";
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
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const images = query.data?.pages.flatMap((page) => page.images) ?? [];
  return <section className="space-y-5" aria-label={text.title}>
    <h2 className="text-xl font-semibold">{text.title}</h2>
    {mutation.isSuccess ? <p role="status">{text.saved}</p> : null}
    {query.isPending ? <p role="status">{text.loading}</p> : null}
    {query.isError ? <div role="alert"><p>{query.error.message}</p><button className={buttonClass} onClick={() => void query.refetch()}>{text.reload}</button></div> : null}
    {query.data ? <p>{text.total}: {query.data.pages[0].total}</p> : null}
    {!query.isPending && !query.isError && images.length === 0 ? <p>{text.empty}</p> : null}
    <div className="grid gap-4 md:grid-cols-2">
      {images.map((image) => {
        const language = [locale, "ja", "en", "ko"].find((candidate) => image.wiki.names[candidate]?.trim()) ?? locale;
        const name = image.wiki.names[language] || image.wiki.slug;
        return <article key={image.imageIdentifier} className="overflow-hidden rounded-lg border border-stroke-subtle bg-surface-base">
          <div className="relative aspect-[4/3] bg-black/10"><Image alt={image.altText || image.sourceName} src={image.url} fill className="object-contain" sizes="(min-width: 768px) 40vw, 90vw" unoptimized /></div>
          <div className="space-y-4 p-4">
            {image.wiki.slug ? <Link href={buildWikiPath(language, image.wiki.slug)} className="text-brand-primary underline">{name}</Link> : null}
            {image.isHidden ? <p>{text.hidden}</p> : null}
            {editing?.imageIdentifier === image.imageIdentifier ? <ImageMetadataForm key={image.imageIdentifier} image={editing} t={t} busy={mutation.isPending} error={mutation.error?.message ?? null} onCancel={() => { setEditing(null); mutation.reset(); }} onSave={(metadata) => mutation.mutate({ image, metadata })} /> : <>
              <dl className="grid gap-2 text-sm">
                <div><dt className="text-text-muted">{t.draftImageSourceNameLabel}</dt><dd>{isSafeWikiSourceUrl(image.sourceUrl) ? <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="underline">{image.sourceName}</a> : image.sourceName}</dd></div>
                <div><dt className="text-text-muted">{t.imageAuthorLabel}</dt><dd>{image.author || "—"}</dd></div>
                <div><dt className="text-text-muted">{t.imageLicenseLabel}</dt><dd>{image.license ? formatWikiImageLicense(image.license) : "—"}</dd></div>
                <div><dt className="text-text-muted">{t.draftImageAltTextLabel}</dt><dd>{image.altText || "—"}</dd></div>
                <div><dt className="text-text-muted">{text.order}</dt><dd>{image.displayOrder}</dd></div>
              </dl>
              <button className={buttonClass} disabled={mutation.isPending} onClick={() => { mutation.reset(); setEditing(image); }}>{text.edit}</button>
            </>}
          </div>
        </article>;
      })}
    </div>
    {query.hasNextPage ? <button className={buttonClass} disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? text.loading : text.more}</button> : null}
  </section>;
}

export function ImageMetadataForm({ image, t, busy, error, onCancel, onSave }: {
  image: ManagedImage; t: AdminText; busy: boolean; error: string | null; onCancel: () => void; onSave: (metadata: ImageMetadata) => void;
}) {
  const [invalid, setInvalid] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const metadata = imageMetadataSchema.safeParse({ sourceName: data.get("sourceName"), author: data.get("author"), license: data.get("license"), altText: data.get("altText"), displayOrder: Number(data.get("displayOrder")) });
    setInvalid(!metadata.success);
    if (metadata.success) onSave(metadata.data);
  };
  return <form onSubmit={submit} className="space-y-3">
    <fieldset disabled={busy} className="space-y-3">
      <label className="block">{t.draftImageSourceNameLabel}<input className={inputClass} name="sourceName" defaultValue={image.sourceName} maxLength={255} required /></label>
      <label className="block">{t.imageAuthorLabel}<input className={inputClass} name="author" defaultValue={image.author ?? ""} maxLength={255} required /></label>
      <label className="block">{t.imageLicenseLabel}<select className={inputClass} name="license" defaultValue={image.license ?? ""} required><option value="" disabled>{t.managedImages.chooseLicense}</option>{wikiImageLicenseOptions.map((license) => <option key={license} value={license}>{formatWikiImageLicense(license)}</option>)}</select></label>
      <label className="block">{t.draftImageAltTextLabel}<input className={inputClass} name="altText" defaultValue={image.altText} maxLength={512} /></label>
      <label className="block">{t.managedImages.order}<input className={inputClass} name="displayOrder" type="number" min={0} max={2147483647} step={1} defaultValue={image.displayOrder} required /></label>
      {error || invalid ? <p role="alert" className="text-status-danger">{error || t.managedImages.saveFailed}</p> : null}
      <div className="flex gap-2"><button className={buttonClass} type="submit">{busy ? t.managedImages.saving : t.managedImages.save}</button><button className={buttonClass} type="button" onClick={onCancel}>{t.managedImages.cancel}</button></div>
    </fieldset>
  </form>;
}
