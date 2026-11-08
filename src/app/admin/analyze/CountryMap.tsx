"use client";
import { useId, useState } from "react";
import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";
import countries from "./worldCountries.json";

export const metricValue = (
  value: string | null | undefined,
  locale: string,
  time = false,
) => {
  if (value == null) return "—";
  if (/^-?\d+$/.test(value)) return BigInt(value).toLocaleString(locale);
  if (time && Number.isFinite(Number(value)))
    return Number(value).toLocaleString(locale, { maximumFractionDigits: 2 });
  return value;
};
export const countryName = (
  code: string | null,
  locale: string,
  t: AnalyzeReportDictionary,
) =>
  code === null
    ? t.unknown
    : /^[A-Z]{2}$/.test(code)
      ? `${new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code} (${code})`
      : code;

export function CountryMap({
  report,
  t,
  locale,
  time,
  actors,
}: {
  report: MetricReport;
  t: AnalyzeReportDictionary;
  locale: string;
  time: boolean;
  actors: boolean;
}) {
  const id = useId();
  const [selected, setSelected] = useState<string | null | undefined>(
    undefined,
  );
  const [focusIndex, setFocusIndex] = useState(0);
  const row =
    selected === undefined
      ? undefined
      : report.countries.find((item) => item.country === selected);
  const detail = (country: string | null, value: string | null | undefined) =>
    `${countryName(country, locale, t)}: ${metricValue(value, locale, time)}${time && value != null ? ` ${t.seconds}` : ""}`;
  return (
    <div className="space-y-2">
      <p id={`${id}-help`} className="text-sm text-text-muted">
        {t.mapHelp}
      </p>
      <svg
        viewBox="0 0 720 360"
        role="group"
        aria-label={t.map}
        aria-describedby={`${id}-help`}
        className="w-full rounded-lg border border-stroke-subtle bg-surface-base"
      >
        {countries.map((country, index) => {
          const measurement = country.code
            ? report.countries.find((item) => item.country === country.code)
            : undefined;
          const value = measurement?.value;
          const label = country.code
            ? detail(country.code, value) +
              (!measurement ? ` — ${t.absent}` : "")
            : country.name;
          return (
            <path
              key={country.name}
              d={country.path}
              fill={
                value == null
                  ? "#9ca3af"
                  : Number(value) === 0
                    ? "#99f6e4"
                    : "#0f766e"
              }
              stroke={
                selected !== undefined &&
                selected !== null &&
                country.code === selected
                  ? "#f59e0b"
                  : "#f9fafb"
              }
              strokeWidth={country.code === selected ? 1.5 : 0.35}
              role={country.code && country.path ? "button" : undefined}
              aria-label={label}
              aria-pressed={
                country.code ? country.code === selected : undefined
              }
              tabIndex={
                country.code && country.path && index === focusIndex ? 0 : -1
              }
              data-country={
                country.path ? (country.code ?? undefined) : undefined
              }
              className="cursor-pointer focus:outline-none focus:stroke-amber-500 focus:stroke-2"
              onPointerEnter={() => country.code && setSelected(country.code)}
              onClick={() => country.code && setSelected(country.code)}
              onFocus={() => {
                if (country.code) {
                  setSelected(country.code);
                  setFocusIndex(index);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelected(country.code);
                }
                if (
                  [
                    "ArrowRight",
                    "ArrowDown",
                    "ArrowLeft",
                    "ArrowUp",
                    "Home",
                    "End",
                  ].includes(event.key)
                ) {
                  event.preventDefault();
                  const paths = Array.from(
                    event.currentTarget.parentElement!.querySelectorAll<SVGPathElement>(
                      "path[data-country]",
                    ),
                  );
                  const current = paths.indexOf(event.currentTarget);
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? paths.length - 1
                        : (current +
                            (event.key === "ArrowLeft" ||
                            event.key === "ArrowUp"
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
      <p className="text-xs text-text-muted">{t.mapLegend}</p>
      {report.countries.some((item) => item.country === null) ? (
        <button
          type="button"
          className="rounded border border-stroke-subtle px-3 py-2"
          onClick={() => setSelected(null)}
        >
          {t.unknown}
        </button>
      ) : null}
      <p
        role="status"
        data-testid="country-detail"
        className="min-h-12 break-words text-sm"
      >
        {selected === undefined ? (
          t.map
        ) : row ? (
          <>
            {detail(row.country, row.value)} · {t.quality}:{" "}
            {row.quality.join(", ") || "—"} · {t.denominator}:{" "}
            {row.denominator ?? "—"}
            {actors
              ? ` · ${t.countryActors}: ${metricValue(row.actorCount, locale)}`
              : ""}
          </>
        ) : (
          <>
            {countryName(selected, locale, t)}: {t.absent}
          </>
        )}
      </p>
    </div>
  );
}
