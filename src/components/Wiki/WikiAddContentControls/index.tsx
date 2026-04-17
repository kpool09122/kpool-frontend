"use client";

import { useState } from "react";
import {
  WIKI_SECTION_MAX_DEPTH,
  type WikiBlockType,
  type WikiSection,
} from "@kpool/wiki";

import { blockTypeLabels, blockTypes } from "../editing";
import { cardSurfaceStyle } from "../styles";

type WikiAddContentControlsProps = {
  section: WikiSection;
  onAddSection: (parentSectionIdentifier: string) => void;
  onAddBlock: (sectionIdentifier: string, blockType: WikiBlockType) => void;
};

export function WikiAddContentControls({
  section,
  onAddSection,
  onAddBlock,
}: WikiAddContentControlsProps) {
  const canAddSection = section.depth < WIKI_SECTION_MAX_DEPTH;
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-dashed border-stroke-subtle p-4" data-testid={`wiki-edit-add-section-${section.sectionIdentifier}`}>
      <div className="flex flex-wrap items-start gap-2">
        <button
          className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-strong disabled:cursor-not-allowed disabled:text-text-muted"
          disabled={!canAddSection}
          onClick={() => onAddSection(section.sectionIdentifier)}
          title={canAddSection ? "Add section" : "Max depth reached"}
          type="button"
        >
          + Section
        </button>
        <div className="relative">
          <button
            aria-expanded={isBlockMenuOpen}
            className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-strong"
            onClick={() => setIsBlockMenuOpen((isOpen) => !isOpen)}
            type="button"
          >
            + Block
          </button>
          {isBlockMenuOpen ? (
            <div className="absolute left-0 z-20 mt-2 grid min-w-44 gap-1 rounded-2xl border border-stroke-subtle bg-surface-raised p-2 shadow-soft" style={cardSurfaceStyle}>
              {blockTypes.map((blockType) => (
                <button
                  className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-text-muted transition hover:bg-brand-highlight/20 hover:text-text-strong"
                  key={blockType}
                  onClick={() => {
                    onAddBlock(section.sectionIdentifier, blockType);
                    setIsBlockMenuOpen(false);
                  }}
                  type="button"
                >
                  {blockTypeLabels[blockType]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {!canAddSection ? (
          <span className="px-2 py-2 text-sm text-text-muted">Max depth reached</span>
        ) : null}
      </div>
    </div>
  );
}
