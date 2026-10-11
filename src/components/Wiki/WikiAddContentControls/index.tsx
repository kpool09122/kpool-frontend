"use client";

import { useEffect, useRef, useState } from "react";
import {
  WIKI_SECTION_MAX_DEPTH,
  type WikiBlockType,
  type WikiSection,
} from "@kpool/wiki";

import { blockTypes } from "../editing";
import { cardSurfaceStyle } from "../styles";
import { useI18n } from "../../../i18n/I18nProvider";

type WikiAddContentControlsProps = {
  section: WikiSection;
  disabled?: boolean;
  onAddSection: (parentSectionIdentifier: string) => void;
  onAddBlock: (sectionIdentifier: string, blockType: WikiBlockType) => void;
};

export function WikiAddContentControls({
  section,
  disabled = false,
  onAddSection,
  onAddBlock,
}: WikiAddContentControlsProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.addContentControls;
  const canAddSection = section.depth < WIKI_SECTION_MAX_DEPTH;
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);
  const blockMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isBlockMenuOpen) return;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !blockMenuRef.current?.contains(event.target)) {
        setIsBlockMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerDown, true);
  }, [isBlockMenuOpen]);

  return (
    <div className="rounded-2xl border border-dashed border-stroke-subtle p-4" data-testid={`wiki-edit-add-section-${section.sectionIdentifier}`}>
      <div className="flex flex-wrap items-start gap-2">
        <button
          className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-strong disabled:cursor-not-allowed disabled:text-text-muted"
          disabled={disabled || !canAddSection}
          onClick={() => onAddSection(section.sectionIdentifier)}
          title={canAddSection ? t.addSectionTitle : t.maxDepthReached}
          type="button"
        >
          {t.addSection}
        </button>
        <div className="relative" ref={blockMenuRef}>
          <button
            aria-expanded={isBlockMenuOpen}
            className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-strong disabled:cursor-not-allowed disabled:text-text-muted"
            disabled={disabled}
            onClick={() => setIsBlockMenuOpen((isOpen) => !isOpen)}
            type="button"
          >
            {t.addBlock}
          </button>
          {isBlockMenuOpen ? (
            <div className="absolute left-0 z-20 mt-2 grid min-w-44 gap-1 rounded-2xl border border-stroke-subtle bg-surface-raised p-2 shadow-soft" style={cardSurfaceStyle}>
              {blockTypes.map((blockType) => (
                <button
                  className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-text-muted transition hover:bg-brand-highlight/20 hover:text-text-strong"
                  disabled={disabled}
                  key={blockType}
                  onClick={() => {
                    onAddBlock(section.sectionIdentifier, blockType);
                    setIsBlockMenuOpen(false);
                  }}
                  type="button"
                >
                  {dictionary.wiki.blockTypes[blockType]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {!canAddSection ? (
          <span className="px-2 py-2 text-sm text-text-muted">{t.maxDepthReached}</span>
        ) : null}
      </div>
    </div>
  );
}
