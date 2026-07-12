"use client";

import type { WikiDetailState, WikiDraftDetail } from "@kpool/wiki";

import {
  WikiDetailContent,
  WikiStatePanel,
  mainBackgroundStyle,
} from "../../../components/Wiki";
import { useI18n } from "../../../i18n/I18nProvider";
import { buildWikiThemeCssVariables } from "./wikiThemePalette";

type WikiDiffPageProps = {
  draftWikiState:
    | { status: "success"; data: WikiDraftDetail }
    | { status: "empty" }
    | { status: "error"; message: string }
    | { status: "loading" };
  language: string;
  publicWikiState: WikiDetailState;
  themeColor?: string;
};

export function WikiDiffPage({
  draftWikiState,
  language,
  publicWikiState,
  themeColor,
}: WikiDiffPageProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki;

  if (publicWikiState.status === "loading" || draftWikiState.status === "loading") {
    return (
      <WikiStatePanel
        message={t.loadingMessage}
        title={t.loadingTitle}
      />
    );
  }

  if (publicWikiState.status === "error") {
    return (
      <WikiStatePanel
        message={publicWikiState.message}
        title={t.loadErrorTitle}
        tone="danger"
      />
    );
  }

  if (draftWikiState.status === "error") {
    return (
      <WikiStatePanel
        message={draftWikiState.message}
        title={t.loadErrorTitle}
        tone="danger"
      />
    );
  }

  if (publicWikiState.status === "empty") {
    return (
      <WikiStatePanel
        message={t.emptyPublicMessage}
        title={t.emptyPublicTitle}
      />
    );
  }

  if (draftWikiState.status === "empty") {
    return (
      <WikiStatePanel
        message={t.emptyDraftMessage}
        title={t.emptyDraftTitle}
      />
    );
  }

  const publicThemeStyles = {
    ...buildWikiThemeCssVariables(publicWikiState.data.themeColor ?? themeColor ?? undefined, publicWikiState.data.fontStyle),
    ...mainBackgroundStyle,
  };
  const draftThemeStyles = {
    ...buildWikiThemeCssVariables(draftWikiState.data.themeColor ?? themeColor ?? undefined, draftWikiState.data.fontStyle),
    ...mainBackgroundStyle,
  };

  return (
    <main
      className="min-h-screen bg-surface-base p-0 text-text-strong"
    >
      <div className="w-full">
        <div className="grid min-h-screen gap-0 xl:grid-cols-2 xl:items-start">
          <section
            aria-labelledby="wiki-diff-public-heading"
            className="wiki-theme-scope min-w-0 space-y-4 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
            data-testid="wiki-diff-public-theme-root"
            style={publicThemeStyles}
          >
            <h2
              className="text-lg font-semibold text-text-strong"
              id="wiki-diff-public-heading"
            >
              {t.beforeWikiLabel}
            </h2>
            <WikiDetailContent
              data={publicWikiState.data}
              language={language}
            />
          </section>

          <section
            aria-labelledby="wiki-diff-draft-heading"
            className="wiki-theme-scope min-w-0 space-y-4 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
            data-testid="wiki-diff-draft-theme-root"
            style={draftThemeStyles}
          >
            <h2
              className="text-lg font-semibold text-text-strong"
              id="wiki-diff-draft-heading"
            >
              {t.afterWikiLabel}
            </h2>
            <WikiDetailContent
              data={draftWikiState.data}
              language={language}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
