"use client";

import Link from "next/link";
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
  language: string;
  section: WikiSection;
};

export function WikiSectionAccordion({ editHref, language, section }: WikiSectionAccordionProps) {
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
          <span className="block text-2xl font-semibold tracking-[-0.03em] text-text-strong">
            {section.title}
          </span>
        </span>
        {editHref ? (
          <Link
            aria-label={`Edit section ${section.title}`}
            className="rounded-full border border-stroke-subtle p-3 text-text-strong transition group-hover:bg-brand-highlight/30"
            href={editHref}
            onClick={(event) => event.stopPropagation()}
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
                textClassName="max-w-3xl text-sm leading-7 text-text-muted"
              />
            ) : isWikiSection(content) ? (
              <WikiSectionAccordion
                editHref={editHref}
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
