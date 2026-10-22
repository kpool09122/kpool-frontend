"use client";

import { useI18n } from "@/i18n/I18nProvider";

import Link from "next/link";
import type { MouseEventHandler } from "react";
import { useState } from "react";
import {
  isWikiBlock,
  isWikiSection,
  sortWikiSectionContents,
  type WikiSection,
} from "@kpool/wiki";

import { cardSurfaceMutedStyle, cardSurfaceStyle } from "../styles";
import { ChevronIcon, EditIcon } from "../icons";
import { WikiBlockDisplay } from "../WikiBlockDisplay";

type WikiSectionAccordionProps = {
  editHref?: string;
  onEdit?: MouseEventHandler<HTMLAnchorElement>;
  language: string;
  section: WikiSection;
};

export function WikiSectionAccordion({ editHref, onEdit, language, section }: WikiSectionAccordionProps) {
  const { dictionary } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const contents = sortWikiSectionContents(section.contents);

  return (
    <details
      className="section-accordion rounded-[1.75rem] border border-stroke-subtle bg-surface-raised shadow-soft"
      data-testid={`section-${section.sectionIdentifier}`}
      open={isOpen}
      style={cardSurfaceStyle}
    >
      <summary
        className="flex list-none cursor-pointer items-center gap-3 p-5 text-left"
        data-testid={`section-toggle-${section.sectionIdentifier}`}
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((open) => !open);
        }}
      >
        <span
          className="section-accordion__chevron rounded-full border border-stroke-subtle p-2 text-text-muted transition-transform"
          style={cardSurfaceMutedStyle}
        >
          <ChevronIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="wiki-title block text-2xl font-semibold tracking-[-0.03em]">
            {section.title}
          </span>
        </span>
        {editHref ? (
          <Link
            aria-label={`${dictionary.wiki.ui.editSection}: ${section.title}`}
            className="rounded-full border border-stroke-subtle p-3 text-text-strong transition group-hover:bg-brand-highlight/30"
            href={editHref}
            onClick={(event) => { event.stopPropagation(); onEdit?.(event); }}
            style={cardSurfaceMutedStyle}
          >
            <EditIcon />
          </Link>
        ) : null}
      </summary>

      {isOpen ? (
        <div
          className="space-y-4 border-t border-stroke-subtle px-5 pb-5 pt-4"
          style={{ borderColor: "var(--wiki-card-border, var(--stroke-subtle))" }}
        >
          {contents.map((content) =>
            isWikiBlock(content) ? (
              <WikiBlockDisplay
                block={content}
                key={content.blockIdentifier}
                language={language}
                textClassName="text-base leading-7 text-text-muted"
              />
            ) : isWikiSection(content) ? (
              <WikiSectionAccordion
                editHref={editHref}
                onEdit={onEdit}
                key={content.sectionIdentifier}
                language={language}
                section={content}
              />
            ) : null,
          )}
        </div>
      ) : null}
    </details>
  );
}
