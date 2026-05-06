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
import { useI18n } from "../../i18n/I18nProvider";
import { getWikiResourceLabel } from "../wikiRouting";
import { buildWikiThemeCssVariables } from "./wikiThemePalette";
import { useWikiDetail } from "./useWikiDetail";

type WikiDetailPageProps = {
  language: string;
  slug: string;
  themeColor?: string;
};

export function WikiDetailPage({ language, slug, themeColor }: WikiDetailPageProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki;
  const wikiDetail = useWikiDetail(slug, { language, themeColor });
  const flipCardId = useId();

  if (wikiDetail.status === "loading") {
    return (
      <WikiStatePanel
        message={t.loadingMessage}
        title={t.loadingTitle}
      />
    );
  }

  if (wikiDetail.status === "error") {
    return (
      <WikiStatePanel
        message={wikiDetail.message}
        title={t.loadErrorTitle}
        tone="danger"
      />
    );
  }

  if (wikiDetail.status === "empty") {
    return (
      <WikiStatePanel
        message={t.emptyPublicMessage}
        title={t.emptyPublicTitle}
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
                {t.theme} {themeLabel}
              </span>
            ) : null}
          </div>
        </header>

        <WikiPublicHeroBasicSection
          basic={data.basic}
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
