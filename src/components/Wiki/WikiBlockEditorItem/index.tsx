"use client";

import { useI18n } from "@/i18n/I18nProvider";

import { type WikiBlock, type WikiResourceType } from "@kpool/wiki";

import { EditIcon, TrashIcon } from "../icons";
import { WikiBlockDisplay } from "../WikiBlockDisplay";
import { WikiBlockForm } from "../WikiBlockForm";
import { cardSurfaceMutedStyle, youtubeEmbedClassName } from "../styles";
import type { WikiImagePicker } from "../WikiImageLibrary/types";
import { toBlockImage } from "../WikiImageLibrary/wikiBlockImage";

type WikiBlockEditorItemProps = {
  block: WikiBlock;
  disabled?: boolean;
  isEditing: boolean;
  language: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (changes: Partial<WikiBlock>) => void;
  onDelete: () => void;
  onRequestImage?: WikiImagePicker;
  sourceWiki?: {
    language: string;
    resourceType: WikiResourceType;
    slug: string;
  };
};

export function WikiBlockEditorItem({
  block,
  disabled = false,
  isEditing,
  language,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onRequestImage,
  sourceWiki,
}: WikiBlockEditorItemProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.ui;
  const blockLabel = dictionary.wiki.blockTypes[block.blockType];
  const controls = (
    <div className="flex gap-2">
      <button aria-label={`${t.editBlock}: ${blockLabel}`} className="rounded-lg p-2 text-text-muted transition hover:bg-text-strong/5 hover:text-text-strong disabled:cursor-not-allowed disabled:opacity-40" disabled={disabled} onClick={onEdit} type="button"><EditIcon /></button>
      <button aria-label={`${t.deleteBlock}: ${blockLabel}`} className="rounded-lg p-2 text-text-muted transition hover:bg-status-danger/10 hover:text-status-danger disabled:cursor-not-allowed disabled:opacity-40" disabled={disabled} onClick={onDelete} type="button"><TrashIcon /></button>
    </div>
  );

  if (isEditing) {
    return (
      <article className="rounded-2xl border border-stroke-subtle p-4" data-testid={`wiki-edit-block-${block.blockIdentifier}`} style={cardSurfaceMutedStyle}>
        <div className="mb-3 flex justify-end">
          {controls}
        </div>
        <WikiBlockForm block={block} onCancel={onCancel} onSave={onSave} onRequestImage={disabled ? undefined : onRequestImage} sourceWiki={sourceWiki} />
      </article>
    );
  }

  return (
    <article
      className={`group relative${block.blockType === "embed" && block.provider === "youtube" ? ` ${youtubeEmbedClassName}` : ""}`}
      data-testid={`wiki-edit-block-${block.blockIdentifier}`}
    >
      <div className="mb-2 flex justify-end gap-2 transition sm:absolute sm:right-0 sm:top-0 sm:z-10 sm:mb-0 sm:rounded-lg sm:bg-surface-raised/95 sm:p-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        {controls}
      </div>
      <WikiBlockDisplay
        block={block}
        language={language}
        showEditableImageOverlay
        onSelectImage={!disabled && onRequestImage ? (index) => {
          onRequestImage((image) => {
            const selected = toBlockImage(image);
            if (block.blockType === "image") onSave(selected);
            if (block.blockType === "image_gallery") onSave({ images: block.images.map((entry, entryIndex) => entryIndex === index ? selected : entry) });
          });
        } : undefined}
        textClassName="text-base leading-[30px] text-text-strong"
      />
    </article>
  );
}
