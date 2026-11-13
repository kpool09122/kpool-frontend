"use client";

import { useId, useState, type FormEvent } from "react";
import Image from "next/image";
import { formatWikiImageLicense, imageMetadataSchema, wikiImageLicenseOptions, type ManagedImage, type ImageMetadata } from "@kpool/wiki";
import type { useAdmin } from "../../AdminProvider";

type AdminText = ReturnType<typeof useAdmin>["t"];
type FormProps = {
  image: ManagedImage;
  t: AdminText;
  busy: boolean;
  error: string | null;
  onSave: (metadata: ImageMetadata) => void;
};
const inputClass = "mt-1 w-full rounded-md border border-stroke-subtle bg-surface-base px-3 py-2 text-sm font-normal";
const labelClass = "block min-w-0 text-xs font-semibold text-text-muted";
const buttonClass = "rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60";

const openImageDialog = (dialog: HTMLDialogElement | null) => {
  if (!dialog) return;
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  if (!dialog.open) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  dialog.querySelector<HTMLInputElement>('input[name="sourceName"]')?.focus();
  return () => {
    dialog.close?.();
    document.body.style.overflow = previousOverflow;
    opener?.focus();
  };
};

export function ImageMetadataDialog({ image, t, busy, error, onClose, onSave }: FormProps & { onClose: () => void }) {
  const titleId = useId();
  return (
    <dialog
      ref={openImageDialog}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-xl border border-stroke-subtle bg-surface-raised p-5 text-text-strong shadow-xl backdrop:bg-black/50"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    >
      <div className="mb-4 flex items-center gap-3 border-b border-stroke-subtle pb-4">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-black/5">
          <Image src={image.url} alt={image.altText || image.sourceName} fill sizes="48px" className="object-contain" unoptimized />
        </div>
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-semibold">{t.managedImages.edit}</h2>
          <p className="truncate text-xs text-text-muted" title={image.sourceName}>{image.sourceName}</p>
        </div>
      </div>
      <ImageMetadataForm image={image} t={t} busy={busy} error={error} onCancel={onClose} onSave={onSave} />
    </dialog>
  );
}

export function ImageMetadataForm({ image, t, busy, error, onCancel, onSave }: FormProps & { onCancel: () => void }) {
  const [invalid, setInvalid] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const metadata = imageMetadataSchema.safeParse({
      sourceName: data.get("sourceName"),
      author: data.get("author"),
      license: data.get("license"),
      altText: data.get("altText"),
      displayOrder: Number(data.get("displayOrder")),
    });
    setInvalid(!metadata.success);
    if (metadata.success) onSave(metadata.data);
  };
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>{t.draftImageSourceNameLabel}<input className={inputClass} name="sourceName" defaultValue={image.sourceName} maxLength={255} required /></label>
        <label className={labelClass}>{t.imageAuthorLabel}<input className={inputClass} name="author" defaultValue={image.author ?? ""} maxLength={255} required /></label>
        <label className={labelClass}>{t.imageLicenseLabel}
          <select className={inputClass} name="license" defaultValue={image.license ?? ""} required>
            <option value="" disabled>{t.managedImages.chooseLicense}</option>
            {wikiImageLicenseOptions.map((license) => <option key={license} value={license}>{formatWikiImageLicense(license)}</option>)}
          </select>
        </label>
        <label className={labelClass}>{t.managedImages.order}<input className={inputClass} name="displayOrder" type="number" min={0} max={2147483647} step={1} defaultValue={image.displayOrder} required /></label>
        <label className={`${labelClass} sm:col-span-2`}>{t.draftImageAltTextLabel}<textarea className={`${inputClass} resize-y`} name="altText" defaultValue={image.altText} rows={2} maxLength={512} /></label>
        {error || invalid ? <p role="alert" className="text-sm text-status-danger sm:col-span-2">{error || t.managedImages.saveFailed}</p> : null}
        <div className="mt-1 flex justify-end gap-2 border-t border-stroke-subtle pt-3 sm:col-span-2">
          <button className={`${buttonClass} border border-stroke-subtle`} type="button" onClick={onCancel}>{t.managedImages.cancel}</button>
          <button className={`${buttonClass} bg-brand-primary text-on-primary`} type="submit">{busy ? t.managedImages.saving : t.managedImages.save}</button>
        </div>
      </fieldset>
    </form>
  );
}
