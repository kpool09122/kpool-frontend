"use client";

import Image from "next/image";
import { type WikiDetail } from "@kpool/wiki";

import { getString } from "../editing";
import { EditIcon, ImageEditableOverlay } from "../icons";
import { WikiFormActions } from "../WikiFormActions";
import { cardSurfaceStyle } from "../styles";

type WikiHeroPanelProps = {
  heroImage: WikiDetail["heroImage"];
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (heroImage: WikiDetail["heroImage"]) => void;
};

export function WikiHeroPanel({
  heroImage,
  isEditing,
  onEdit,
  onCancel,
  onSave,
}: WikiHeroPanelProps) {
  if (isEditing) {
    return (
      <form
        className="rounded-[1.75rem] border border-stroke-subtle p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSave({
            src: getString(formData, "src"),
            alt: getString(formData, "alt"),
          });
        }}
        style={cardSurfaceStyle}
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Hero image URL
            <input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={heroImage.src} name="src" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Hero image alt
            <input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={heroImage.alt} name="alt" />
          </label>
        </div>
        <WikiFormActions onCancel={onCancel} />
      </form>
    );
  }

  return (
    <div className="relative h-full min-h-[22rem] overflow-hidden rounded-[1.75rem] border border-stroke-subtle" style={cardSurfaceStyle}>
      <Image
        alt={heroImage.alt}
        className="object-cover"
        fill
        sizes="(min-width: 1024px) 55vw, 100vw"
        src={heroImage.src}
      />
      <ImageEditableOverlay />
      <button
        aria-label="Edit hero image"
        className="absolute right-3 top-3 z-30 rounded-full border border-white/40 bg-black/60 p-3 text-white"
        onClick={onEdit}
        type="button"
      >
        <EditIcon />
      </button>
    </div>
  );
}
