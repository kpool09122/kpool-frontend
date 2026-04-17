"use client";

import {
  normalizeWikiSectionContents,
  sortWikiSections,
} from "@kpool/wiki";
import { useId } from "react";

import {
  WikiPublicHeroBasicSection,
  WikiSectionAccordion,
  WikiStatePanel,
  accentBadgeStyle,
  mainBackgroundStyle,
} from "../../../components/Wiki";
import { buildWikiThemeCssVariables } from "./wikiThemePalette";
import { useWikiDetail } from "./useWikiDetail";

type WikiDetailPageProps = {
  slug: string;
  themeColor?: string;
};

export function WikiDetailPage({ slug, themeColor }: WikiDetailPageProps) {
  const wikiDetail = useWikiDetail(slug, { themeColor });
  const flipCardId = useId();

  if (wikiDetail.status === "loading") {
    return (
      <WikiStatePanel
        message="Preparing the public detail view..."
        title="Loading Wiki"
      />
    );
  }

  if (wikiDetail.status === "error") {
    return (
      <WikiStatePanel
        message={wikiDetail.message}
        title="Unable to load wiki"
        tone="danger"
      />
    );
  }

  if (wikiDetail.status === "empty") {
    return (
      <WikiStatePanel
        message="This resource does not have a public wiki detail page at the moment."
        title="No public wiki yet"
      />
    );
  }

  const { data } = wikiDetail;
  const sections = sortWikiSections(data.sections.map(normalizeWikiSectionContents));
  const themeStyles = buildWikiThemeCssVariables(data.themeColor);
  const themeLabel = data.themeColor?.toUpperCase();

  return (
    <main
      className="wiki-theme-scope min-h-screen px-5 py-6 text-text-strong sm:px-8 sm:py-10"
      data-testid="wiki-theme-root"
      style={{
        ...themeStyles,
        ...mainBackgroundStyle,
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-text-strong lg:text-5xl">
              {data.basic.name}
            </h1>
            {themeLabel ? (
              <span
                className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]"
                data-testid="wiki-theme-badge"
                style={accentBadgeStyle}
              >
                Theme {themeLabel}
              </span>
            ) : null}
          </div>
        </header>

        <WikiPublicHeroBasicSection
          basic={data.basic}
          flipCardId={flipCardId}
          heroImage={data.heroImage}
        />

        <section className="space-y-5">
          <div className="space-y-4">
            {sections.map((section) => (
              <WikiSectionAccordion key={section.sectionIdentifier} section={section} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
