"use client";

import {
  type WikiDetailState,
  normalizeWikiSectionContents,
  sortWikiSections,
} from "@kpool/wiki";
import { useId } from "react";

import {
  WikiPublicHeroImage,
  WikiSectionAccordion,
  WikiStatePanel,
  mainBackgroundStyle,
} from "../../../components/Wiki";
import { useI18n } from "../../../i18n/I18nProvider";
import { buildWikiEditPath, getWikiResourceLabel } from "@kpool/wiki";
import { buildWikiThemeCssVariables } from "./wikiThemePalette";

type WikiDetailPageProps = {
  language: string;
  slug: string;
  themeColor?: string;
  wikiState: WikiDetailState;
};

export function WikiDetailPage({
  language,
  slug,
  themeColor,
  wikiState,
}: WikiDetailPageProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki;
  const flipCardId = useId();

  if (wikiState.status === "loading") {
    return (
      <WikiStatePanel
        message={t.loadingMessage}
        title={t.loadingTitle}
      />
    );
  }

  if (wikiState.status === "error") {
    return (
      <WikiStatePanel
        message={wikiState.message}
        title={t.loadErrorTitle}
        tone="danger"
      />
    );
  }

  if (wikiState.status === "empty") {
    return (
      <WikiStatePanel
        message={t.emptyPublicMessage}
        title={t.emptyPublicTitle}
      />
    );
  }

  const { data } = wikiState;
  const sections = sortWikiSections(data.sections.map(normalizeWikiSectionContents));
  const effectiveThemeColor = themeColor ?? data.themeColor ?? undefined;
  const themeStyles = buildWikiThemeCssVariables(effectiveThemeColor);

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
          </div>
        </header>

        <WikiPublicHeroImage
          basic={data.basic}
          editHref={`${buildWikiEditPath(language, slug)}?authGate=1`}
          flipCardId={flipCardId}
          heroImage={data.heroImage}
          profileLabel={`${getWikiResourceLabel(data.resourceType)} ${t.profileSuffix}`}
        />

        <section className="space-y-5">
          <div className="space-y-4">
            {sections.map((section) => (
              <WikiSectionAccordion
                key={section.sectionIdentifier}
                language={language}
                section={section}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
