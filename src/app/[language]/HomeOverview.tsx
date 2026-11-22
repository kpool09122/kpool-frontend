import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import type { WikiStatistics } from "@/gateways/wiki/wikiStatistics";
import { homeOverviewCopy } from "@/i18n/homeOverview";
import { dictionaries } from "@/i18n/dictionaries";
import { localeLabels, supportedLocales, type Locale } from "@/i18n/locales";

type BreakdownItem = { key: string; label: string; count: number; color: string };
const colors = ["var(--brand-primary)", "#c87660", "#b58a2e", "#66968b"];

function Breakdown({ title, items, locale }: { title: string; items: BreakdownItem[]; locale: Locale }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold text-text-muted">{title}</h3>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.key}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span>{item.label}</span><span className="font-medium tabular-nums">{item.count.toLocaleString(locale)}</span>
            </div>
            <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-brand-primary/5">
              <div className="h-full rounded-full" style={{ width: `${item.count / max * 100}%`, background: item.color }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeOverview({ locale, statistics }: { locale: Locale; statistics: WikiStatistics | null }) {
  const t = homeOverviewCopy[locale];
  const localizedStatistics = statistics?.byLanguage[locale];
  const groupTotal = localizedStatistics?.resourceTypes.group ?? 0;
  const groups = localizedStatistics ? Object.entries(localizedStatistics.groupTypes).map(([key, count], index) => ({
    key, count, color: colors[index], label: t.groupLabels[key as keyof typeof t.groupLabels],
  })) : [];
  let offset = 0;
  const gradient = groups.map((item) => {
    const start = offset;
    offset += groupTotal > 0 ? item.count / groupTotal * 100 : 0;
    return `${item.color} ${start}% ${offset}%`;
  }).join(", ");

  return (
    <section aria-labelledby="home-introduction" className="grid gap-8 py-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12 lg:py-8">
      <div className="max-w-lg">
        <p className="mb-5 text-[10px] font-semibold tracking-[0.22em] text-brand-primary">{t.eyebrow}</p>
        <h1 id="home-introduction" className="text-5xl font-semibold tracking-tight sm:text-6xl">k-pool<span className="text-brand-secondary">.</span></h1>
        <p className="mt-5 whitespace-pre-line text-2xl font-medium leading-relaxed tracking-tight sm:text-3xl">{t.title}</p>
        <p className="mt-4 max-w-sm text-sm leading-7 text-text-muted">{t.description}</p>
        <Link href={`/${locale}/wiki`} className="mt-7 inline-flex items-center gap-4 rounded-full bg-brand-primary px-5 py-3 text-sm font-medium text-on-primary hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">
          {t.explore}<ArrowUpRight aria-hidden="true" size={16} />
        </Link>
      </div>
      <section aria-labelledby="wiki-statistics-title" className="min-w-0 rounded-3xl border border-stroke-subtle bg-surface-raised p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-2 text-text-muted"><BookOpen aria-hidden="true" size={15} /><h2 id="wiki-statistics-title" className="text-xs font-medium">{t.stats}</h2></div>
        {statistics ? <>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <p className="flex items-baseline gap-3 text-xs text-text-muted">{t.total}<span className="text-5xl font-semibold tracking-tight tabular-nums text-text-strong">{statistics.total.toLocaleString(locale)}</span></p>
            <p className="flex items-baseline gap-3 text-xs text-text-muted">{t.localTotal}<span className="text-5xl font-semibold tracking-tight tabular-nums text-text-strong">{statistics.languages[locale].toLocaleString(locale)}</span></p>
          </div>
          {statistics.total === 0 && <p className="mt-3 text-sm text-text-muted">{t.empty}</p>}
          <div className="my-6 grid grid-cols-2 gap-6 border-t border-stroke-subtle pt-5">
            <Breakdown title={t.languages} locale={locale} items={supportedLocales.map((key, index) => ({ key, label: localeLabels[key], count: statistics.languages[key], color: colors[index] }))} />
            <Breakdown title={t.resources} locale={locale} items={Object.entries(statistics.byLanguage[locale].resourceTypes).map(([key, count], index) => ({ key, label: dictionaries[locale].home.resourceLabels[key as keyof typeof statistics.resourceTypes], count, color: colors[index] }))} />
          </div>
          <div className="border-t border-stroke-subtle pt-5">
            <h3 className="mb-3 text-xs font-semibold text-text-muted">{t.groups}</h3>
            {groupTotal > 0 ? <div className="flex items-center gap-5">
              <div aria-hidden="true" className="flex size-20 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${gradient})` }}><div className="size-14 rounded-full bg-surface-raised" /></div>
              <ul className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
                {groups.map((item) => <li key={item.key} className="text-xs"><div className="flex items-center gap-1.5 text-text-muted"><span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />{item.label}</div><p className="mt-1 font-medium tabular-nums">{item.count.toLocaleString(locale)} <span className="font-normal text-text-muted">({(item.count / groupTotal * 100).toLocaleString(locale, { maximumFractionDigits: 1 })}%)</span></p></li>)}
              </ul>
            </div> : <p className="text-xs text-text-muted">{t.noGroups}</p>}
          </div>
          <p className="mt-5 text-[10px] leading-relaxed text-text-muted">{t.note}</p>
        </> : <p className="py-12 text-sm leading-7 text-text-muted">{t.unavailable}</p>}
      </section>
    </section>
  );
}
