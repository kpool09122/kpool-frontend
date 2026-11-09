"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RegionalMetricReport } from "@/gateways/analyze/analyzeReports";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";
import { createCountryColorScale, overallMetricKey } from "./countryColorScale";
import { createCountryFillScale } from "./countryColorPalette";
import { countryName, formatMetricValue } from "./reportPresentation";
import { projectRegions } from "./regionalProjection";
import { regionName } from "./regionPresentation";
export type RegionalMapMetric = {
  key: string;
  name: string;
  group: string;
  report: RegionalMetricReport;
  averageTime?: boolean;
};
export function DomesticMap({
  country,
  region,
  level,
  onLevelChange,
  metrics,
  summaries,
  onSelect,
  onBack,
  t,
  locale,
}: {
  country: string;
  region?: string | null;
  metrics: RegionalMapMetric[];
  summaries: RegionalMapMetric[];
  level: string;
  onLevelChange: (level: string) => void;
  onSelect: (region: string | null | undefined) => void;
  onBack: () => void;
  t: AnalyzeReportDictionary;
  locale: string;
}) {
  const [colorKey, setColorKey] = useState(overallMetricKey);
  const backButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    backButton.current?.focus();
  }, []);
  const [focusIndex, setFocusIndex] = useState(0);
  const shapes = useMemo(
    () => projectRegions(country, level),
    [country, level],
  );
  const codes = useMemo(
    () => new Set(shapes.map((shape) => shape.code)),
    [shapes],
  );
  const chartMetrics = useMemo(
    () =>
      metrics.map((metric) => ({
        ...metric,
        report: {
          ...metric.report,
          countries: metric.report.regions
            .filter((row) => row.region && codes.has(row.region))
            .map((row) => ({ ...row, country: row.region })),
        },
      })),
    [metrics, codes],
  );
  const fills = useMemo(
    () =>
      createCountryFillScale(createCountryColorScale(chartMetrics, colorKey)),
    [chartMetrics, colorKey],
  );
  const metric = metrics.find((metric) => metric.key === colorKey);
  const format = (
    metric: RegionalMapMetric,
    value: string | null | undefined,
    denominator: number | null,
  ) =>
    formatMetricValue(value, locale, {
      averageTime: metric.averageTime,
      denominator,
      seconds: t.seconds,
    });
  return (
    <section
      aria-label={t.domesticMap}
      className="min-w-0 space-y-3 rounded-xl border border-stroke-subtle p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">{countryName(country, locale, t)}</h3>
        <button
          ref={backButton}
          type="button"
          onClick={onBack}
          className="rounded border border-stroke-subtle p-2 text-sm"
        >
          {t.backToGlobe}
        </button>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {country === "PH" ? (
            <label>
              {t.regionLayer}
              <select
                aria-label={t.regionLayer}
                value={level}
                onChange={(event) => {
                  onLevelChange(event.target.value);
                  setFocusIndex(0);
                  onSelect(undefined);
                }}
                className="m-2 rounded border border-stroke-subtle bg-surface-base p-2"
              >
                <option value="area">{t.localAreas}</option>
                <option value="region">{t.parentRegions}</option>
              </select>
            </label>
          ) : null}
          <svg
            viewBox="0 0 700 460"
            role="group"
            aria-label={t.domesticMap}
            className="block max-h-[65dvh] w-full rounded-xl bg-surface-raised"
            onKeyDown={(event) => {
              if (event.key === "Escape") onSelect(undefined);
            }}
          >
            {shapes.map((shape, index) => {
              const row = metric?.report.regions.find(
                (row) => row.region === shape.code,
              );
              const label = `${regionName(shape.code, locale, t)}: ${colorKey === overallMetricKey ? (fills.has(shape.code) ? t.overall : t.noData) : metric && row ? format(metric, row.value, row.denominator) : t.noData}`;
              return (
                <path
                  key={shape.code}
                  data-region={shape.code}
                  d={shape.path}
                  fill={fills.get(shape.code) ?? "#cbd5e1"}
                  stroke={region === shape.code ? "#f59e0b" : "#fff"}
                  strokeWidth={region === shape.code ? 2 : 0.6}
                  role="button"
                  aria-label={label}
                  aria-pressed={region === shape.code}
                  onFocus={() => setFocusIndex(index)}
                  tabIndex={index === focusIndex ? 0 : -1}
                  className="cursor-pointer focus:outline-none focus:stroke-amber-500 focus:stroke-2"
                  onClick={() =>
                    onSelect(region === shape.code ? undefined : shape.code)
                  }
                  onKeyDown={(event) => {
                    if (["Enter", " "].includes(event.key)) {
                      event.preventDefault();
                      onSelect(region === shape.code ? undefined : shape.code);
                    }
                    if (
                      [
                        "ArrowRight",
                        "ArrowLeft",
                        "ArrowDown",
                        "ArrowUp",
                        "Home",
                        "End",
                      ].includes(event.key)
                    ) {
                      event.preventDefault();
                      const paths = Array.from(
                        event.currentTarget.parentElement!.querySelectorAll<SVGPathElement>(
                          "path[data-region]",
                        ),
                      );
                      const next =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? paths.length - 1
                            : (index +
                                (["ArrowLeft", "ArrowUp"].includes(event.key)
                                  ? -1
                                  : 1) +
                                paths.length) %
                              paths.length;
                      paths[next]?.focus();
                    }
                  }}
                >
                  <title>{label}</title>
                </path>
              );
            })}
          </svg>
          <p className="text-xs text-text-muted">{t.regionalNote}</p>
          <details className="mt-2 text-xs text-text-muted">
            <summary>{t.mapSource}</summary>
            <p>
              Natural Earth (public domain), ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
              >
                OpenStreetMap contributors
              </a>{" "}
              ·{" "}
              <a
                href="https://opendatacommons.org/licenses/odbl/1-0/"
                target="_blank"
                rel="noreferrer"
              >
                ODbL 1.0
              </a>
              . {t.mapNotice}
            </p>
          </details>
        </div>
        <div className="min-w-0 space-y-3">
          <select
            aria-label={t.mapMetric}
            value={colorKey}
            onChange={(event) => setColorKey(event.target.value)}
            className="w-full rounded border border-stroke-subtle bg-surface-base p-2"
          >
            <option value={overallMetricKey}>{t.overall}</option>
            {metrics.map((item) => (
              <option key={item.key} value={item.key}>
                {item.group} · {item.name}
              </option>
            ))}
          </select>
          <section
            aria-label={t.regionSummary}
            className="rounded border border-stroke-subtle p-3"
          >
            <h4 aria-live="polite" className="font-semibold">
              {region === undefined
                ? countryName(country, locale, t)
                : regionName(region, locale, t)}
            </h4>
            <dl className="mt-3 space-y-2 text-sm">
              {summaries.map((item) => (
                <div key={item.key} className="flex justify-between gap-2">
                  <dt>{item.name}</dt>
                  <dd className="font-semibold tabular-nums">
                    {format(item, item.report.total, item.report.denominator)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          {region !== undefined ? (
            <button
              type="button"
              onClick={() => onSelect(undefined)}
              className="rounded border border-stroke-subtle p-2 text-sm"
            >
              {t.clearRegion}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
