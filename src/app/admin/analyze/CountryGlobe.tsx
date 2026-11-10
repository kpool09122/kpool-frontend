"use client";

import { memo, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";
import { countryName, formatMetricValue } from "./reportPresentation";
import { supportedMapCountry } from "./regionalProjection";
import { createCountryFillScale } from "./countryColorPalette";
import { createCountryRanks } from "./countryRanks";
import { createCountryColorScale, overallMetricKey, type CountryGlobeMetric } from "./countryColorScale";
import {
  dragGlobe,
  getInitialGlobeRotation,
  projectGlobe,
  type GlobeRotation,
} from "./globeProjection";

type Selection = {
  country: string | null;
  pinned: boolean;
};

function CountryGlobeView({ metrics, t, locale, initialCountry = null, onCountryChange, onDomesticView }: {
  metrics: CountryGlobeMetric[];
  onDomesticView?: (country: string) => void;
  initialCountry?: string | null;
  onCountryChange?: (country: string | null | undefined) => void;
  t: AnalyzeReportDictionary;
  locale: string;
}) {
  const id = useId();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [colorKey, setColorKey] = useState(overallMetricKey);
  const [homeRotation] = useState(() => getInitialGlobeRotation(initialCountry));
  const [rotation, setRotation] = useState<GlobeRotation>(homeRotation);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    rotation: GlobeRotation;
    sensitivity: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const globe = useMemo(() => projectGlobe(rotation), [rotation]);
  const [focusIndex, setFocusIndex] = useState(0);
  const tabStop = globe.countries.some((country) => country.code && country.index === focusIndex)
    ? focusIndex : globe.countries.find((country) => country.code)?.index;
  const finishDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    suppressClick.current = drag.current.moved;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const isOverall = colorKey === overallMetricKey;
  const metric = isOverall ? undefined : metrics.find((item) => item.key === colorKey) ?? metrics[0];
  const colors = useMemo(() => createCountryColorScale(metrics, colorKey), [metrics, colorKey]);
  const ranks = useMemo(
    () => new Map(metrics.map((item) => [item.key, createCountryRanks(item.report, item.averageTime)])),
    [metrics],
  );
  const fills = useMemo(
    () => createCountryFillScale(colors, metric ? ranks.get(metric.key) : undefined),
    [colors, metric, ranks],
  );
  const format = (item: CountryGlobeMetric, value: string | null | undefined, denominator: number | null) =>
    formatMetricValue(value, locale, { averageTime: item.averageTime, denominator, seconds: t.seconds });
  const selectCountry = (country: string | null, pinned = false) => {
    if (!pinned && selection?.pinned) return;
    setSelection({ country, pinned });
    if (pinned) onCountryChange?.(country);
  };
  const groups = Array.from(new Set(metrics.map((item) => item.group)));
  return (
    <section aria-label={t.map} className="min-w-0 scroll-mt-24 space-y-3 rounded-2xl bg-surface-base">
      <div
        className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]"
        onPointerLeave={() => setSelection((current) => current?.pinned ? current : null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setSelection((current) => current?.pinned ? current : null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setSelection(null);
            onCountryChange?.(undefined);
          }
        }}
      >
        <svg
          viewBox="0 0 540 540"
          tabIndex={0}
          data-rotation={rotation.join(",")}
          role="group"
          aria-label={t.map}
          className={`block aspect-square max-h-[65dvh] min-h-72 w-full touch-none select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          onPointerDown={(event) => {
            if (event.button !== 0 || event.isPrimary === false || drag.current) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            suppressClick.current = false;
            drag.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              rotation,
              sensitivity: 180 / Math.max(1, Math.min(bounds.width, bounds.height)),
              moved: false,
            };
          }}
          onPointerMove={(event) => {
            const current = drag.current;
            if (!current || current.pointerId !== event.pointerId) return;
            const dx = event.clientX - current.x;
            const dy = event.clientY - current.y;
            if (!current.moved && Math.hypot(dx, dy) < 5) return;
            if (!current.moved) {
              current.moved = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(true);
              setSelection((current) => current?.pinned ? current : null);
            }
            event.preventDefault();
            setRotation(dragGlobe(current.rotation, dx, dy, current.sensitivity));
          }}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
          onClickCapture={(event) => {
            if (suppressClick.current) {
              event.stopPropagation();
              event.preventDefault();
              suppressClick.current = false;
            }
          }}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            const changes: Record<string, [number, number]> = {
              ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, 15], ArrowDown: [0, -15],
            };
            if (changes[event.key]) {
              event.preventDefault();
              const [dx, dy] = changes[event.key];
              setRotation(dragGlobe(rotation, dx, dy, 1));
              setSelection((current) => current?.pinned ? current : null);
            }
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelection(null);
              onCountryChange?.(undefined);
            }
          }}
        >
          <defs>
            <radialGradient id={`${id}-ocean`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="75%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </radialGradient>
          </defs>
          <circle cx="270" cy="270" r="252" fill="#38bdf8" opacity="0.12" pointerEvents="none" />
          <circle cx="270" cy="270" r="248" fill={`url(#${id}-ocean)`} pointerEvents="none" />
          <path d={globe.graticule} fill="none" stroke="#0284c7" strokeOpacity="0.15" strokeWidth="0.5" pointerEvents="none" />
          {globe.countries.map((country) => {
            const index = country.index;
            const measurement = country.code ? metric?.report.countries.find((row) => row.country === country.code) : undefined;
            const intensity = country.code ? colors.get(country.code) : undefined;
            const selected = !!selection && country.code === selection.country;
            const label = country.code
              ? `${countryName(country.code, locale, t)}: ${isOverall ? intensity == null ? t.noData : t.overall : metric && measurement ? format(metric, measurement.value, measurement.denominator) : t.noData}`
              : country.name;
            return (
              <path
                key={country.name}
                d={country.path}
                fill={(country.code ? fills.get(country.code) : undefined) ?? "#cbd5e1"}
                stroke={selected ? "#f59e0b" : "#fff"}
                strokeWidth={selected ? 1.5 : 0.4}
                role={country.code && country.path ? "button" : undefined}
                aria-label={label}
                aria-pressed={country.code ? selected : undefined}
                aria-describedby={selected ? `${id}-summary` : undefined}
                tabIndex={country.code && country.path && index === tabStop ? 0 : -1}
                data-country={country.path ? country.code ?? undefined : undefined}
                className="transition-colors focus:outline-none focus:stroke-amber-500 focus:stroke-2"
                onPointerEnter={() => {
                  if (country.code && !drag.current) selectCountry(country.code);
                }}
                onClick={() => {
                  if (country.code) selectCountry(country.code, true);
                }}
                onFocus={() => {
                  if (country.code) {
                    setFocusIndex(index);
                    selectCountry(country.code);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (country.code) selectCountry(country.code, true);
                  }
                  if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) {
                    event.preventDefault();
                    const paths = Array.from(event.currentTarget.parentElement!.querySelectorAll<SVGPathElement>("path[data-country]"));
                    const current = paths.indexOf(event.currentTarget);
                    const next = event.key === "Home" ? 0 : event.key === "End" ? paths.length - 1
                      : (current + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) + paths.length) % paths.length;
                    paths[next]?.focus();
                  }
                }}
              />
            );
          })}
        </svg>
        <div className="min-w-0 space-y-3">
          <select
            aria-label={t.mapMetric}
            value={isOverall ? overallMetricKey : metric?.key ?? ""}
            onChange={(event) => setColorKey(event.currentTarget.value)}
            className="block w-full rounded border border-stroke-subtle bg-surface-base p-2"
          >
            <option value={overallMetricKey}>{t.overall}</option>
            {metrics.map((item) => (
              <option key={item.key} value={item.key}>{item.group} · {item.name}</option>
            ))}
          </select>
          <section
            id={`${id}-summary`}
            aria-label={t.countrySummary}
            data-testid={selection ? "country-detail" : "country-summary"}
            className="min-w-0 rounded-xl border border-stroke-subtle bg-surface-base p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold" aria-live="polite">
                {selection ? countryName(selection.country, locale, t) : t.all}
              </h4>
            </div>
            <div className="mt-3 max-h-[60dvh] space-y-3 overflow-auto">
              {groups.map((group) => (
                <section key={group} aria-label={group}>
                  <h5 className="mb-1 text-xs font-semibold text-text-muted">{group}</h5>
                  <dl className="space-y-2 text-sm">
                    {metrics.filter((item) => item.group === group).map((item) => {
                      const row = selection
                        ? item.report.countries.find((entry) => entry.country === selection.country)
                        : undefined;
                      const rank = selection?.country ? ranks.get(item.key)?.get(selection.country) : undefined;
                      return (
                        <div key={item.key}>
                          <div className="flex justify-between gap-3">
                            <dt>{item.name}</dt>
                            <dd className="min-h-9 shrink-0 text-right tabular-nums">
                              <span className="font-semibold">{selection ? row ? format(item, row.value, row.denominator) : t.noData : format(item, item.report.total, item.report.denominator)}</span>
                              {rank !== undefined ? (
                                <span className="block text-xs text-text-muted">
                                  {t.countryRank.replace("{rank}", rank.toLocaleString(locale))}
                                </span>
                              ) : null}
                            </dd>
                          </div>
                        </div>
                      );
                    })}
                  </dl>
                </section>
              ))}
            </div>
            {onDomesticView ? <div className="min-h-[54px]">{selection?.pinned && selection.country && supportedMapCountry(selection.country) ? <button data-domestic-entry type="button" className="mt-4 inline-flex items-center gap-1 rounded-lg border border-stroke-subtle p-2 text-sm focus-visible:outline-2 focus-visible:outline-brand-primary" onClick={() => onDomesticView(selection.country!)}>{t.regionalLink}<ChevronRightIcon aria-hidden="true" className="shrink-0" /></button> : null}</div> : null}
          </section>
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded border border-stroke-subtle px-3 py-2 text-sm"
              onClick={() => {
                setRotation(homeRotation);
                setSelection(null);
                onCountryChange?.(undefined);
              }}
            >
              {t.resetView}
            </button>
          </div>
        </div>
      </div>

    </section>
  );
}

export const CountryGlobe = memo(CountryGlobeView);
