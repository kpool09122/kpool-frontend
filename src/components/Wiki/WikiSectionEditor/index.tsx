"use client";

import {
  isWikiBlock,
  isWikiSection,
  sortWikiSectionContents,
  type WikiBlock,
  type WikiBlockType,
  type WikiContentEditorId,
  type WikiSection,
} from "@kpool/wiki";

import { getString } from "../editing";
import { ChevronIcon, EditIcon, TrashIcon } from "../icons";
import { WikiAddContentControls } from "../WikiAddContentControls";
import { WikiBlockEditorItem } from "../WikiBlockEditorItem";
import { WikiFormActions } from "../WikiFormActions";
import { cardSurfaceMutedStyle, cardSurfaceStyle } from "../styles";

type WikiSectionEditorProps = {
  editingId: string | null;
  language: string;
  section: WikiSection;
  onEdit: (id: WikiContentEditorId) => void;
  onCancel: () => void;
  onSaveSection: (sectionIdentifier: string, changes: Pick<WikiSection, "title">) => void;
  onSaveBlock: (blockIdentifier: string, changes: Partial<WikiBlock>) => void;
  onAddSection: (parentSectionIdentifier: string) => void;
  onAddBlock: (sectionIdentifier: string, blockType: WikiBlockType) => void;
  onDeleteContent: (identifier: string) => void;
};

function WikiSectionForm({
  section,
  onCancel,
  onSave,
}: {
  section: WikiSection;
  onCancel: () => void;
  onSave: (changes: Pick<WikiSection, "title">) => void;
}) {
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSave({
          title: getString(formData, "title"),
        });
      }}
    >
      <label className="grid gap-2 text-sm font-semibold text-text-strong">
        Section title
        <input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={section.title} name="title" />
      </label>
      <WikiFormActions onCancel={onCancel} />
    </form>
  );
}

export function WikiSectionEditor({
  editingId,
  language,
  section,
  onEdit,
  onCancel,
  onSaveSection,
  onSaveBlock,
  onAddSection,
  onAddBlock,
  onDeleteContent,
}: WikiSectionEditorProps) {
  const contents = sortWikiSectionContents(section.contents);
  const sectionEditorId: WikiContentEditorId = `section:${section.sectionIdentifier}`;

  return (
    <details className="section-accordion rounded-[1.75rem] border border-stroke-subtle shadow-soft" data-testid={`wiki-edit-section-${section.sectionIdentifier}`} open style={cardSurfaceStyle}>
      <summary className="flex list-none items-center gap-3 p-5 text-left">
        <span
          className="section-accordion__chevron rounded-full border border-stroke-subtle p-2 text-text-muted transition-transform"
          style={cardSurfaceMutedStyle}
        >
          <ChevronIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-2xl font-semibold tracking-[-0.03em] text-text-strong">{section.title}</span>
        </span>
        <button aria-label={`Edit section ${section.title}`} className="rounded-full border border-stroke-subtle p-3 text-text-strong" onClick={(event) => { event.preventDefault(); onEdit(sectionEditorId); }} style={cardSurfaceMutedStyle} type="button"><EditIcon /></button>
        <button aria-label={`Delete section ${section.title}`} className="rounded-full border border-status-danger/30 p-3 text-status-danger transition hover:bg-status-danger/10" onClick={(event) => { event.preventDefault(); onDeleteContent(section.sectionIdentifier); }} type="button"><TrashIcon /></button>
      </summary>
      <div className="space-y-6 border-t border-stroke-subtle px-5 pb-5 pt-5" style={{ borderColor: "var(--wiki-card-border, var(--stroke-subtle))" }}>
        {editingId === sectionEditorId ? (
          <WikiSectionForm
            onCancel={onCancel}
            onSave={(changes) => onSaveSection(section.sectionIdentifier, changes)}
            section={section}
          />
        ) : null}

        {contents.map((content) =>
          isWikiBlock(content) ? (
            <WikiBlockEditorItem
              block={content}
              isEditing={editingId === `block:${content.blockIdentifier}`}
              key={content.blockIdentifier}
              language={language}
              onCancel={onCancel}
              onDelete={() => onDeleteContent(content.blockIdentifier)}
              onEdit={() => onEdit(`block:${content.blockIdentifier}`)}
              onSave={(changes) => onSaveBlock(content.blockIdentifier, changes)}
            />
          ) : isWikiSection(content) ? (
            <WikiSectionEditor
              editingId={editingId}
              key={content.sectionIdentifier}
              language={language}
              onAddBlock={onAddBlock}
              onAddSection={onAddSection}
              onCancel={onCancel}
              onDeleteContent={onDeleteContent}
              onEdit={onEdit}
              onSaveBlock={onSaveBlock}
              onSaveSection={onSaveSection}
              section={content}
            />
          ) : null,
        )}

        <WikiAddContentControls
          onAddBlock={onAddBlock}
          onAddSection={onAddSection}
          section={section}
        />
      </div>
    </details>
  );
}
