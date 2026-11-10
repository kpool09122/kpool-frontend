"use client";

import { LocalizedForm } from "@/components/LocalizedForm";
import { useI18n } from "@/i18n/I18nProvider";

import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  isWikiBlock,
  isWikiSection,
  sortWikiSectionContents,
  type WikiBlock,
  type WikiBlockType,
  type WikiContentEditorId,
  type WikiResourceType,
  type WikiSection,
} from "@kpool/wiki";

import { getString } from "../editing";
import { ChevronIcon, EditIcon, TrashIcon } from "../icons";
import { WikiAddContentControls } from "../WikiAddContentControls";
import { WikiBlockEditorItem } from "../WikiBlockEditorItem";
import { WikiFormActions } from "../WikiFormActions";
import { cardSurfaceStyle, sectionArticleClassName, sectionBodyClassName, sectionHeadingClassName } from "../styles";

type WikiSectionEditorProps = {
  disabled?: boolean;
  editingId: string | null;
  language: string;
  sourceWiki?: {
    language: string;
    resourceType: WikiResourceType;
    slug: string;
  };
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
  const { dictionary } = useI18n();
  return (
    <LocalizedForm
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
        {dictionary.wiki.ui.sectionTitle}
        <input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={section.title} name="title" />
      </label>
      <WikiFormActions onCancel={onCancel} />
    </LocalizedForm>
  );
}

export function WikiSectionEditor({
  disabled = false,
  editingId,
  language,
  section,
  sourceWiki,
  onEdit,
  onCancel,
  onSaveSection,
  onSaveBlock,
  onAddSection,
  onAddBlock,
  onDeleteContent,
}: WikiSectionEditorProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.ui;
  const contents = sortWikiSectionContents(section.contents);
  const hasSideHeading = section.depth === 1;
  const sectionEditorId: WikiContentEditorId = `section:${section.sectionIdentifier}`;
  const [isOpen, setIsOpen] = useState(true);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);
  const actionsId = useId();

  useEffect(() => {
    if (!isActionsOpen) return;
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !actionsRef.current?.contains(event.target)) {
        setIsActionsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerDown, true);
  }, [isActionsOpen]);

  return (
    <article
      className={`${sectionArticleClassName}${hasSideHeading ? " lg:grid lg:grid-cols-[160px_minmax(0,800px)] lg:gap-x-12" : ""}`}
      style={{ borderColor: "var(--wiki-card-border, var(--stroke-subtle))" }}
      data-testid={`wiki-edit-section-${section.sectionIdentifier}`}
    >
      <div className={`flex items-center gap-1 text-left sm:gap-2${hasSideHeading ? " lg:flex-wrap lg:content-start lg:self-start" : ""}`}>
        <h2 className={`${sectionHeadingClassName}${hasSideHeading ? " lg:mb-2 lg:basis-full" : ""}`}>
          {section.title}
        </h2>
        <button
          aria-expanded={isOpen}
          aria-label={`${t.toggleSection}: ${section.title}`}
          className="shrink-0 rounded-lg p-2.5 text-text-muted transition hover:bg-text-strong/5 hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted"
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          <span className="block transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : undefined }}>
            <ChevronIcon />
          </span>
        </button>
        <button
          aria-label={`${t.editSection}: ${section.title}`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-text-muted transition hover:bg-text-strong/5 hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          onClick={() => {
            setIsOpen(true);
            onEdit(sectionEditorId);
          }}
          type="button"
        >
          <EditIcon />
          <span>{t.editSectionLabel}</span>
        </button>
        <div
          className="relative shrink-0"
          ref={actionsRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setIsActionsOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsActionsOpen(false);
              actionsButtonRef.current?.focus();
            }
          }}
        >
          <button
            aria-controls={actionsId}
            aria-expanded={isActionsOpen && !disabled}
            aria-label={`${t.sectionActions}: ${section.title}`}
            className="rounded-lg p-2.5 text-text-muted transition hover:bg-text-strong/5 hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled}
            onClick={() => setIsActionsOpen((open) => !open)}
            ref={actionsButtonRef}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" size={18} />
          </button>
          {isActionsOpen && !disabled ? (
            <div className="absolute right-0 z-20 mt-2 min-w-48 rounded-xl border border-stroke-subtle p-1.5 shadow-soft" id={actionsId} style={cardSurfaceStyle}>
              <button
                aria-label={`${t.deleteSection}: ${section.title}`}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-status-danger transition hover:bg-status-danger/10 focus-visible:outline-2 focus-visible:outline-status-danger"
                onClick={() => {
                  setIsActionsOpen(false);
                  onDeleteContent(section.sectionIdentifier);
                }}
                type="button"
              >
                <TrashIcon />
                {t.deleteSection}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {isOpen ? (
        <div
          className={`${sectionBodyClassName} min-w-0 space-y-6${hasSideHeading ? " lg:pt-0" : ""}`}
        >
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
                disabled={disabled}
                isEditing={editingId === `block:${content.blockIdentifier}`}
                key={content.blockIdentifier}
                language={language}
                onCancel={onCancel}
                onDelete={() => onDeleteContent(content.blockIdentifier)}
                onEdit={() => onEdit(`block:${content.blockIdentifier}`)}
                onSave={(changes) => onSaveBlock(content.blockIdentifier, changes)}
                sourceWiki={sourceWiki}
              />
            ) : isWikiSection(content) ? (
              <WikiSectionEditor
                disabled={disabled}
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
                sourceWiki={sourceWiki}
              />
            ) : null,
          )}

          <WikiAddContentControls
            disabled={disabled}
            onAddBlock={onAddBlock}
            onAddSection={onAddSection}
            section={section}
          />
        </div>
      ) : null}
    </article>
  );
}
