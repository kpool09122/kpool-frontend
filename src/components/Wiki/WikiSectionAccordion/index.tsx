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

import { sectionArticleClassName, sectionBodyClassName, sectionHeadingClassName } from "../styles";
import { ChevronIcon, EditIcon } from "../icons";
import { WikiBlockDisplay } from "../WikiBlockDisplay";

type WikiSectionAccordionProps = {
  editHref?: string;
  onEdit?: MouseEventHandler<HTMLAnchorElement>;
  language: string;
  openByDefault?: boolean;
  section: WikiSection;
};

export function WikiSectionAccordion({
  editHref,
  onEdit,
  language,
  openByDefault = false,
  section,
}: WikiSectionAccordionProps) {
  const { dictionary } = useI18n();
  const [openOverride, setOpenOverride] = useState<boolean>();
  const isOpen = openOverride ?? openByDefault;
  const contents = sortWikiSectionContents(section.contents);
  const hasSideHeading = section.depth === 1;

  return (
    <details
      className={`section-accordion flow-root ${sectionArticleClassName}`}
      data-testid={`section-${section.sectionIdentifier}`}
      open={isOpen}
      style={{ borderColor: "var(--wiki-card-border, var(--stroke-subtle))" }}
    >
      <summary
        className={`flex list-none cursor-pointer items-center gap-1 text-left sm:gap-2${hasSideHeading ? " @min-[56rem]/wiki-content:float-left @min-[56rem]/wiki-content:w-40 @min-[56rem]/wiki-content:flex-wrap" : ""}`}
        data-testid={`section-toggle-${section.sectionIdentifier}`}
        onClick={(event) => {
          event.preventDefault();
          setOpenOverride(!isOpen);
        }}
      >
        <span className={`${sectionHeadingClassName}${hasSideHeading ? " @min-[56rem]/wiki-content:mb-2 @min-[56rem]/wiki-content:basis-full" : ""}`}>{section.title}</span>
        <span className="section-accordion__chevron shrink-0 rounded-lg p-2.5 text-text-muted transition-transform">
          <ChevronIcon />
        </span>
        {editHref ? (
          <Link
            aria-label={`${dictionary.wiki.ui.editSection}: ${section.title}`}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-text-muted transition hover:bg-text-strong/5 hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted"
            href={editHref}
            onClick={(event) => { event.stopPropagation(); onEdit?.(event); }}
          >
            <EditIcon />
            <span>{dictionary.wiki.ui.editSectionLabel}</span>
          </Link>
        ) : null}
      </summary>

      {isOpen ? (
        <div
          className={`${sectionBodyClassName} min-w-0 space-y-6${hasSideHeading ? " @min-[56rem]/wiki-content:ml-52 @min-[56rem]/wiki-content:max-w-[800px] @min-[56rem]/wiki-content:pt-0" : ""}`}
        >
          {contents.map((content) =>
            isWikiBlock(content) ? (
              <WikiBlockDisplay
                block={content}
                key={content.blockIdentifier}
                language={language}
                textClassName="text-base leading-[30px] text-text-strong"
              />
            ) : isWikiSection(content) ? (
              <WikiSectionAccordion
                editHref={editHref}
                onEdit={onEdit}
                key={content.sectionIdentifier}
                language={language}
                openByDefault={openByDefault}
                section={content}
              />
            ) : null,
          )}
        </div>
      ) : null}
    </details>
  );
}
