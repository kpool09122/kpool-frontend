"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MetricReport } from "@/gateways/analyze/analyzeReports";
import type { AnalyzeReportDictionary } from "@/i18n/analyzeReports";
import { countryName, formatMetricValue, metricValue } from "./reportPresentation";
import { chartColors, chartValue, trendDomain } from "./chartPresentation";

type ChartProps = {
  name: string;
  report: MetricReport;
  t: AnalyzeReportDictionary;
  locale: string;
  averageTime: boolean;
  showSubmitters: boolean;
};
const tooltipClass = "rounded-xl border border-stroke-subtle bg-surface-base px-4 py-3 text-sm shadow-lg";
const tooltipIndex = (value: string | number | null | undefined) => value == null ? null : Number.isInteger(Number(value)) ? Number(value) : null;

export function CountryMetricChart({ name, report, t, locale, averageTime, showSubmitters }: ChartProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const rows = report.countries.map((row) => ({ ...row, label: countryName(row.country, locale, t), number: chartValue(row.value, row.denominator, averageTime) }))
    .sort((a, b) => (b.number ?? -1) - (a.number ?? -1))
    .map((row, index) => ({ ...row, fill: row.country === null ? "#94a3b8" : chartColors[index % chartColors.length] }));
  const sum = rows.reduce((total, row) => total + (row.number ?? 0), 0);
  const format = (value: string | null, denominator: number | null) => formatMetricValue(value, locale, { averageTime, denominator, seconds: t.seconds });
  if (!rows.length) return <p className="py-4 text-sm text-text-muted">{t.noCountries}</p>;
  const current = selected !== null ? rows[selected] : undefined;
  const tip = (index: string | number | null | undefined) => {
    const row = rows[tooltipIndex(index) ?? -1];
    return row ? <div className={tooltipClass}><p className="text-text-muted">{row.label}</p><p className="mt-1 font-semibold tabular-nums">{format(row.value, row.denominator)}</p></div> : null;
  };
  return (
    <div className="mt-4 space-y-4" role="region" aria-label={`${name}: ${t.countries}`}>
      {averageTime ? (
        <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 36)} minWidth={0} initialDimension={{ width: 400, height: 240 }}>
          <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 0 }} accessibilityLayer>
            <CartesianGrid horizontal={false} stroke="var(--color-stroke-subtle)" strokeDasharray="3 3" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor" }} />
            <YAxis dataKey="label" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor" }} />
            <Tooltip cursor={{ fill: "var(--color-surface-raised)" }} content={({ active, activeIndex }) => active ? tip(activeIndex) : null} />
            <Bar dataKey="number" radius={[0, 5, 5, 0]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="relative mx-auto h-60 w-full max-w-72">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 288, height: 240 }}>
            <PieChart accessibilityLayer>
              <Pie data={sum > 0 ? rows : [{ number: 1, fill: "#e2e8f0" }]} dataKey="number" nameKey="label"
                innerRadius={70} outerRadius={98} paddingAngle={sum > 0 && rows.filter((row) => (row.number ?? 0) > 0).length > 1 ? 2 : 0}
                cornerRadius={3} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}
                onMouseEnter={(_, index) => setSelected(index)} onClick={(_, index) => setSelected(index)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-16 text-center">
            <span className="max-w-32 truncate text-xs text-text-muted">{current?.label ?? name}</span>
            <strong className="text-base tabular-nums">{current && sum > 0 ? `${((current.number ?? 0) / sum * 100).toLocaleString(locale, { maximumFractionDigits: 1 })}%` : rows.every((row) => row.number === null) ? "—" : sum > 0 ? "100%" : "0%"}</strong>
          </div>
        </div>
      )}
      <ul className="grid gap-1 sm:grid-cols-2">
        {rows.map((row, index) => <li key={row.country ?? "unknown"}>
          <button type="button" onClick={() => setSelected(index)} onPointerEnter={() => setSelected(index)} onFocus={() => setSelected(index)}
            aria-pressed={selected === index} className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-brand-primary ${selected === index ? "bg-surface-raised" : ""}`}>
            <span className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.fill }} /><span className="truncate">{row.label}</span></span>
            <span className="shrink-0 font-semibold tabular-nums">{format(row.value, row.denominator)}</span>
          </button>
        </li>)}
      </ul>
      {current && showSubmitters ? <p role="status" className="text-sm text-text-muted">
        {t.submitters}: {metricValue(current.actorCount, locale)}
      </p> : null}
    </div>
  );
}

export function DailyMetricChart({ name, report, t, locale, averageTime }: ChartProps) {
  const rows = report.days.map((row) => ({ ...row, number: chartValue(row.value, row.denominator, averageTime) }));
  if (!rows.length) return <p className="py-4 text-sm text-text-muted">{t.noDays}</p>;
  const domain = trendDomain(rows.map((row) => row.number), averageTime);
  const format = (value: string | null, denominator: number | null) => formatMetricValue(value, locale, { averageTime, denominator, seconds: t.seconds });
  return (
    <div className="mt-4 min-w-0 space-y-3" role="region" aria-label={`${name}: ${t.trend}`}>
      <ResponsiveContainer width="100%" height={260} minWidth={0} initialDimension={{ width: 400, height: 260 }}>
        <LineChart data={rows} margin={{ left: 0, right: 16, top: 16, bottom: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--color-stroke-subtle)" strokeDasharray="3 3" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} minTickGap={36} tickMargin={10}
            tick={{ fontSize: 11, fill: "currentColor" }} tickFormatter={(day: string) => day.slice(5).replace("-", "/")} />
          <YAxis domain={domain} allowDataOverflow allowDecimals={averageTime} width={72} tickCount={5} axisLine={false} tickLine={false}
            tick={{ fontSize: 11, fill: "currentColor" }} tickFormatter={(value: number) => value.toLocaleString(locale, {
              notation: domain[1] >= 1e7 && domain[1] - domain[0] > domain[1] * 0.1 ? "compact" : "standard", maximumFractionDigits: averageTime ? 2 : 0,
            })} />
          <Tooltip filterNull={false} cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }} content={({ active, activeIndex }) => {
            const row = rows[tooltipIndex(activeIndex) ?? -1];
            return active && row ? <div className={tooltipClass}><p className="text-text-muted">{row.day}</p><p className="mt-1 font-semibold tabular-nums">{format(row.value, row.denominator)}</p></div> : null;
          }} />
          <Line type="linear" dataKey="number" name={name} connectNulls={false} stroke="#0d9488" strokeWidth={2.5}
            dot={rows.length <= 45 ? { r: 3, strokeWidth: 0, fill: "#0d9488" } : false} activeDot={{ r: 5, fill: "#0d9488", stroke: "var(--color-surface-base)", strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

    </div>
  );
}
