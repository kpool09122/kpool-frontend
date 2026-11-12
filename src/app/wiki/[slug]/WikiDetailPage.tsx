"use client";

import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";

import {
  type WikiDetailState,
} from "@kpool/wiki";

import {
  WikiDetailContent,
  WikiStatePanel,
  mainBackgroundStyle,
} from "../../../components/Wiki";
import { useI18n } from "../../../i18n/I18nProvider";
import { buildWikiEditEntryPath } from "@kpool/wiki";
import { buildWikiThemeCssVariables } from "./wikiThemePalette";
import { WikiVideoPanel } from "@/components/Wiki/WikiVideoPanel";
import { PublicWikiAnalytics } from "@/components/Analytics/PublicWikiAnalytics";

import { useWikiEditEntry } from "./useWikiEditEntry";

// Match the public Wiki layout's Tailwind lg breakpoint.
const desktopQuery = "(min-width: 64rem)";
const subscribeToDesktopViewport = (onChange: () => void) => {
  const media = window.matchMedia?.(desktopQuery);
  media?.addEventListener("change", onChange);
  return () => media?.removeEventListener("change", onChange);
};
const getDesktopSnapshot = () => window.matchMedia?.(desktopQuery).matches ?? false;
const getServerDesktopSnapshot = () => false;

type WikiDetailPageProps = {
  language: string;
  slug: string;
  themeColor?: string;
  wikiState: WikiDetailState;
  resumeEditing?: boolean;
};

export function WikiDetailPage({
  language,
  slug,
  themeColor,
  wikiState,
  resumeEditing = false,
}: WikiDetailPageProps) {
  const { dictionary } = useI18n();
  const searchParams = useSearchParams();
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopViewport,
    getDesktopSnapshot,
    getServerDesktopSnapshot,
  );
  const t = dictionary.wiki;
  const editEntry = useWikiEditEntry({ language, slug, themeColor }, resumeEditing && wikiState.status === "success");

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
  const themeStyles = buildWikiThemeCssVariables(effectiveThemeColor, data.fontStyle);
  const editHref = buildWikiEditEntryPath(language, slug, themeColor);

  return (
    <main
      className="wiki-theme-scope wiki-page-theme [--wiki-page-gradient-height:750px] flex-1 px-5 py-6 text-text-strong sm:px-8 sm:py-10"
      data-testid="wiki-theme-root"
      style={{
        ...themeStyles,
        ...mainBackgroundStyle,
      }}
    >
      <div className="mx-auto max-w-6xl">
        {editEntry.isStarting ? <p className="mb-4 text-text-muted" role="status">{t.preparingEditMessage}</p> : null}
        {editEntry.error ? <p className="mb-4 text-status-danger" role="alert">{editEntry.error}</p> : null}
        <PublicWikiAnalytics wiki={data}>
          <WikiDetailContent
            key={`${data.language}:${data.resourceType}:${data.slug}`}
            data={data}
            sectionsOpenByDefault={isDesktop}
            activeTabId={searchParams.get("tab") === "video" ? "video" : "wiki"}
            onTabChange={(tabId) => {
              const url = new URL(window.location.href);
              if (tabId === "video") url.searchParams.set("tab", "video");
              else url.searchParams.delete("tab");
              const href = `${url.pathname}${url.search}${url.hash}`;
              if (href !== `${window.location.pathname}${window.location.search}${window.location.hash}`)
                window.history.pushState(null, "", href);
            }}
            videoPanel={
              <WikiVideoPanel
                wikiIdentifier={data.wikiIdentifier}
                isOfficial={data.isOfficial === true}
                wikiTitle={data.basic.name}
                language={data.language}
                resourceType={data.resourceType}
                slug={data.slug}
              />
            }
            editHref={editHref}
            onEdit={editEntry.startEditing}
            language={language}
          />
        </PublicWikiAnalytics>
      </div>
    </main>
  );
}
