"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";
import {
  buildGoogleTrendsExploreUrl,
  googleTrendsOrigin,
  googleTrendsTimeRangeOptions,
  wikiGoogleTrendsSettingsSchema,
  type WikiGoogleTrendsSettings,
} from "@kpool/wiki";
import {
  getGoogleTrendsLoaderUrl,
  isGoogleTrendsLoaderReady,
  renderGoogleTrendsWidget,
} from "@/gateways/wiki/googleTrendsWidget";
import { useI18n } from "@/i18n/I18nProvider";

const selectClassName =
  "min-w-0 rounded-lg border border-stroke-subtle bg-surface-base px-2 py-2 text-text-strong";

function GoogleTrendsFrame({
  settings,
  language,
  attempt,
}: {
  settings: WikiGoogleTrendsSettings;
  language: string;
  attempt: number;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.googleTrends;
  const { searchTerm, region, timeRange } = settings;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "unconfirmed">(
    "loading",
  );
  const attach = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;
    containerRef.current = container;
    const timer = window.setTimeout(() => setStatus("unconfirmed"), 15000);
    // Observe readiness for the fallback UI only. The official loader owns the
    // handshake and frame sizing; a load event alone can also mean an error page.
    const receive = (event: MessageEvent<unknown>) => {
      const frame = container.querySelector("iframe");
      if (
        !frame ||
        event.origin !== googleTrendsOrigin ||
        event.source !== frame.contentWindow ||
        !event.data ||
        typeof event.data !== "object" ||
        !("isReady" in event.data) ||
        event.data.isReady !== true
      ) return;
      window.clearTimeout(timer);
      setStatus("ready");
    };
    window.addEventListener("message", receive);
    // Cached scripts can already be ready when an accordion or React remounts.
    if (isGoogleTrendsLoaderReady()) {
      initialized.current = renderGoogleTrendsWidget(
        container,
        { searchTerm, region, timeRange },
        language,
      );
      if (!initialized.current) setStatus("unconfirmed");
    }
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", receive);
      container.replaceChildren();
      containerRef.current = null;
      initialized.current = false;
    };
  }, [searchTerm, region, timeRange, language]);

  const renderWidget = () => {
    const container = containerRef.current;
    if (!container || initialized.current) return;
    initialized.current = renderGoogleTrendsWidget(container, settings, language);
    if (!initialized.current) setStatus("unconfirmed");
  };

  return (
    <>
      <Script
        src={getGoogleTrendsLoaderUrl(attempt)}
        onLoad={renderWidget}
        onReady={renderWidget}
        onError={() => setStatus("unconfirmed")}
      />
      <div
        ref={attach}
        className="min-h-[300px] min-w-0 overflow-hidden rounded-xl [&_iframe]:block [&_iframe]:w-full [&_iframe]:border-0"
      />
      {status !== "ready" ? (
        <div role="status" className="space-y-1 text-sm text-text-muted">
          <p>{status === "loading" ? t.loading : t.failed}</p>
          {status === "unconfirmed" ? <p>{t.fallback}</p> : null}
        </div>
      ) : null}
    </>
  );
}

function GoogleTrendsViewer({
  searchTerm,
  language,
  disabled = false,
}: {
  searchTerm: string;
  language: string;
  disabled?: boolean;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.googleTrends;
  const [region, setRegion] = useState<WikiGoogleTrendsSettings["region"]>(language === "ja" ? "JP" : language === "ko" ? "KR" : "all");
  const [timeRange, setTimeRange] = useState<WikiGoogleTrendsSettings["timeRange"]>("today 10-y");
  const [attempt, setAttempt] = useState(0);
  const settings = { searchTerm, region, timeRange };
  const regions: WikiGoogleTrendsSettings["region"][] = language === "en"
    ? ["all", "JP", "KR"]
    : [language === "ko" ? "KR" : "JP", "all"];
  return (
    <figure
      className="min-w-0 space-y-3"
      aria-label={`Google Trends: ${searchTerm}`}
    >
      <div className="flex min-w-0 flex-wrap gap-3">
        <label className="grid min-w-0 gap-1 text-sm">
          {t.region}
          <select
            aria-label={t.region}
            className={selectClassName}
            value={region}
            disabled={disabled}
            onChange={(event) => {
              const parsed =
                wikiGoogleTrendsSettingsSchema.shape.region.safeParse(
                  event.target.value,
                );
              if (parsed.success) {
                setRegion(parsed.data);
              }
            }}
          >
            {regions.map((value) => (
              <option key={value} value={value}>
                {value === "all" ? t.world : t[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">
          {t.timeRange}
          <select
            aria-label={t.timeRange}
            className={selectClassName}
            value={timeRange}
            disabled={disabled}
            onChange={(event) => {
              const parsed =
                wikiGoogleTrendsSettingsSchema.shape.timeRange.safeParse(
                  event.target.value,
                );
              if (parsed.success) {
                setTimeRange(parsed.data);
              }
            }}
          >
            {googleTrendsTimeRangeOptions.map(({ value, label }) => (
              <option key={value} value={value}>{t[label]}</option>
            ))}
          </select>
        </label>
      </div>
      <GoogleTrendsFrame
        key={JSON.stringify([settings, language, attempt])}
        settings={settings}
        language={language}
        attempt={attempt}
      />
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 break-words text-xs text-text-muted">
        <p>{t.explanation}</p>
        <div className="flex flex-wrap gap-3">
          <a
            className="underline underline-offset-2 transition hover:text-text-strong"
            href={buildGoogleTrendsExploreUrl(settings, language)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.open}
          </a>
          <button
            className="underline underline-offset-2 transition hover:text-text-strong"
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t.retry}
          </button>
        </div>
      </figcaption>
    </figure>
  );
}

export function WikiGoogleTrends({
  searchTerm,
  language,
  disabled,
}: {
  searchTerm: string;
  language: string;
  disabled?: boolean;
}) {
  const { dictionary } = useI18n();
  if (!wikiGoogleTrendsSettingsSchema.shape.searchTerm.safeParse(searchTerm).success)
    return <p role="status">{dictionary.wiki.googleTrends.invalid}</p>;
  return (
    <GoogleTrendsViewer
      key={JSON.stringify([
        searchTerm,
        language,
      ])}
      searchTerm={searchTerm}
      language={language}
      disabled={disabled}
    />
  );
}
