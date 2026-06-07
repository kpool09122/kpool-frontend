"use client";

import {
  type WikiDetailState,
} from "@kpool/wiki";

import {
  WikiDetailContent,
  WikiStatePanel,
  mainBackgroundStyle,
} from "../../../components/Wiki";
import { useI18n } from "../../../i18n/I18nProvider";
import { buildWikiEditPath } from "@kpool/wiki";
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
  const effectiveThemeColor = themeColor ?? data.themeColor ?? undefined;
  const themeStyles = buildWikiThemeCssVariables(effectiveThemeColor);
  const editHref = `${buildWikiEditPath(language, slug)}?authGate=1`;

  return (
    <main
      className="wiki-theme-scope min-h-screen px-5 py-6 text-text-strong sm:px-8 sm:py-10"
      data-testid="wiki-theme-root"
      style={{
        ...themeStyles,
        ...mainBackgroundStyle,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <WikiDetailContent
          data={data}
          editHref={editHref}
          language={language}
        />
      </div>
    </main>
  );
}
