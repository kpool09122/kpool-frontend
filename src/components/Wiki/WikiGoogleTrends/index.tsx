"use client";

import { useCallback, useId, useState } from "react";
import {
  buildGoogleTrendsEmbedUrl,
  buildGoogleTrendsExploreUrl,
  googleTrendsOrigin,
  wikiGoogleTrendsSettingsSchema,
  type WikiGoogleTrendsBlock,
  type WikiGoogleTrendsSettings,
} from "@kpool/wiki";
import { useI18n } from "@/i18n/I18nProvider";

const selectClassName =
  "min-w-0 rounded-lg border border-stroke-subtle bg-surface-base px-2 py-2 text-text-strong";

function GoogleTrendsFrame({
  settings,
  language,
}: {
  settings: WikiGoogleTrendsSettings;
  language: string;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.googleTrends;
  const id = useId();
  const [status, setStatus] = useState<"loading" | "ready" | "unconfirmed">(
    "loading",
  );
  const attach = useCallback(
    (frame: HTMLIFrameElement | null) => {
      if (!frame) return;
      const timer = window.setTimeout(() => setStatus("unconfirmed"), 15000);
      const receive = (event: MessageEvent<unknown>) => {
        if (
          event.origin !== googleTrendsOrigin ||
          event.source !== frame.contentWindow ||
          !event.data ||
          typeof event.data !== "object"
        )
          return;
        const data = event.data as {
          uniqueID?: unknown;
          isReady?: unknown;
          height?: unknown;
        };
        if (data.uniqueID !== id) return;
        if (data.isReady === true) {
          window.clearTimeout(timer);
          setStatus("ready");
        }
        if (typeof data.height === "number" && Number.isFinite(data.height))
          frame.style.height = `${Math.max(300, Math.min(800, data.height))}px`;
      };
      window.addEventListener("message", receive);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("message", receive);
      };
    },
    [id],
  );

  return (
    <>
      <iframe
        ref={attach}
        className="block w-full border-0"
        style={{ height: 420 }}
        title={`Google Trends: ${settings.searchTerm}`}
        src={buildGoogleTrendsEmbedUrl(settings, language)}
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={(event) =>
          event.currentTarget.contentWindow?.postMessage(
            { uniqueID: id },
            googleTrendsOrigin,
          )
        }
        onError={() => setStatus("unconfirmed")}
      />
      {status !== "ready" ? (
        <p role="status" className="text-sm text-text-muted">
          {status === "loading" ? t.loading : t.failed}
        </p>
      ) : null}
    </>
  );
}

function GoogleTrendsViewer({
  block,
  language,
}: {
  block: WikiGoogleTrendsBlock;
  language: string;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.googleTrends;
  const [region, setRegion] = useState(block.region);
  const [timeRange, setTimeRange] = useState(block.timeRange);
  const [attempt, setAttempt] = useState(0);
  const settings = { searchTerm: block.searchTerm, region, timeRange };
  const regions = [
    ...new Set<WikiGoogleTrendsSettings["region"]>(
      language === "en"
        ? ["", "JP", "KR"]
        : [language === "ko" ? "KR" : "JP", "", block.region],
    ),
  ];
  return (
    <figure
      className="min-w-0 space-y-3"
      aria-label={`Google Trends: ${block.searchTerm}`}
    >
      <div className="flex min-w-0 flex-wrap gap-3">
        <label className="grid min-w-0 gap-1 text-sm">
          {t.region}
          <select
            aria-label={t.region}
            className={selectClassName}
            value={region}
            onChange={(event) => {
              const parsed =
                wikiGoogleTrendsSettingsSchema.shape.region.safeParse(
                  event.target.value,
                );
              if (parsed.success) setRegion(parsed.data);
            }}
          >
            {regions.map((value) => (
              <option key={value} value={value}>
                {value ? t[value] : t.world}
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
            onChange={(event) => {
              const parsed =
                wikiGoogleTrendsSettingsSchema.shape.timeRange.safeParse(
                  event.target.value,
                );
              if (parsed.success) setTimeRange(parsed.data);
            }}
          >
            <option value="today 12-m">{t.year}</option>
            <option value="today 5-y">{t.fiveYears}</option>
          </select>
        </label>
      </div>
      <p className="text-sm text-text-muted">{t.regionHelp}</p>
      <GoogleTrendsFrame
        key={JSON.stringify([settings, language, attempt])}
        settings={settings}
        language={language}
      />
      <figcaption className="space-y-2 break-words text-sm text-text-muted">
        <p>{t.explanation}</p>
        <p>{t.fallback}</p>
        <div className="flex flex-wrap gap-3">
          <a
            className="text-text-strong underline"
            href={buildGoogleTrendsExploreUrl(settings, language)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.open}
          </a>
          <button
            className="text-text-strong underline"
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
  block,
  language,
}: {
  block: WikiGoogleTrendsBlock;
  language: string;
}) {
  const { dictionary } = useI18n();
  if (!wikiGoogleTrendsSettingsSchema.safeParse(block).success)
    return <p role="status">{dictionary.wiki.googleTrends.invalid}</p>;
  return (
    <GoogleTrendsViewer
      key={JSON.stringify([
        block.blockKey,
        block.searchTerm,
        block.region,
        block.timeRange,
        language,
      ])}
      block={block}
      language={language}
    />
  );
}
