"use client";

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
  section: WikiSection;
};

export function WikiSectionAccordion({ section }: WikiSectionAccordionProps) {
  const contents = sortWikiSectionContents(section.contents);

  return (
    <details
      className="section-accordion rounded-[1.75rem] border border-stroke-subtle bg-surface-raised shadow-soft"
      data-testid={`section-${section.sectionIdentifier}`}
      style={cardSurfaceStyle}
    >
      <summary
        className="flex list-none cursor-pointer items-center gap-3 p-5 text-left"
        data-testid={`section-toggle-${section.sectionIdentifier}`}
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
        <span
          aria-label={`Edit section ${section.title}`}
          className="rounded-full border border-stroke-subtle p-3 text-text-strong transition group-hover:bg-brand-highlight/30"
          role="img"
          style={cardSurfaceMutedStyle}
        >
          <EditIcon />
        </span>
      </summary>

      <div
        className="space-y-4 border-t border-stroke-subtle px-5 pb-5 pt-4"
        style={{ borderColor: "var(--wiki-card-border, var(--stroke-subtle))" }}
      >
        {contents.map((content) =>
          isWikiBlock(content) ? (
            <WikiBlockDisplay
              block={content}
              key={content.blockIdentifier}
              textClassName="max-w-3xl text-sm leading-7 text-text-muted"
            />
          ) : isWikiSection(content) ? (
            <WikiSectionAccordion key={content.sectionIdentifier} section={content} />
          ) : null,
        )}
      </div>
    </details>
  );
}
