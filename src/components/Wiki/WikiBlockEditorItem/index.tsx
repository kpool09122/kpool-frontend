"use client";

import { type WikiBlock } from "@kpool/wiki";

import { EditIcon, TrashIcon } from "../icons";
import { WikiBlockDisplay } from "../WikiBlockDisplay";
import { WikiBlockForm } from "../WikiBlockForm";
import { cardSurfaceMutedStyle } from "../styles";

type WikiBlockEditorItemProps = {
  block: WikiBlock;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (changes: Partial<WikiBlock>) => void;
  onDelete: () => void;
};

export function WikiBlockEditorItem({
  block,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: WikiBlockEditorItemProps) {
  const controls = (
    <div className="flex gap-2">
      <button aria-label={`Edit ${block.blockType} block`} className="rounded-full border border-stroke-subtle p-2" onClick={onEdit} type="button"><EditIcon /></button>
      <button aria-label={`Delete ${block.blockType} block`} className="rounded-full border border-status-danger/30 p-2 text-status-danger transition hover:bg-status-danger/10" onClick={onDelete} type="button"><TrashIcon /></button>
    </div>
  );

  if (isEditing) {
    return (
      <article className="rounded-2xl border border-stroke-subtle p-4" data-testid={`wiki-edit-block-${block.blockIdentifier}`} style={cardSurfaceMutedStyle}>
        <div className="mb-3 flex justify-end">
          {controls}
        </div>
        <WikiBlockForm block={block} onCancel={onCancel} onSave={onSave} />
      </article>
    );
  }

  return (
    <article className="group relative" data-testid={`wiki-edit-block-${block.blockIdentifier}`}>
      <div className="absolute right-0 top-0 z-10 flex gap-2 rounded-full bg-surface-raised/90 p-1 shadow-soft opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        {controls}
      </div>
      <WikiBlockDisplay block={block} showEditableImageOverlay />
    </article>
  );
}
