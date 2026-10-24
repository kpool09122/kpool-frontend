"use client";

import { useState } from "react";
import type { WikiVideoDurationFilter } from "@/gateways/wiki/wikiVideoFilters";
import { useI18n } from "@/i18n/I18nProvider";

export function WikiVideoDurationFilter({
  onSearch,
}: {
  onSearch: (filter: WikiVideoDurationFilter) => void;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.filter;
  const [minimum, setMinimum] = useState(0);
  const [maximum, setMaximum] = useState(40);
  const slider =
    "pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-primary [&::-webkit-slider-thumb]:bg-surface-base [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-primary [&::-moz-range-thumb]:bg-surface-base";
  return (
    <form
      aria-label={t.title}
      className="mb-6 space-y-4 rounded-2xl border border-stroke-subtle p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch({
          ...(minimum > 0 ? { minDurationSeconds: minimum * 60 } : {}),
          ...(maximum < 40 ? { maxDurationSeconds: maximum * 60 } : {}),
        });
      }}
    >
      <fieldset>
        <legend className="text-lg font-semibold">{t.title}</legend>
        <p className="mt-2 text-sm text-text-muted">
          {minimum} {t.minutes} – {maximum === 40 ? t.unlimited : `${maximum} ${t.minutes}`}
        </p>
        <div className="relative mx-2 mt-3 h-8">
          <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-surface-muted" />
          <div
            className="absolute top-3 h-2 rounded-full bg-brand-primary"
            style={{ left: `${minimum * 2.5}%`, right: `${100 - maximum * 2.5}%` }}
          />
          <input
            aria-label={t.minimum}
            aria-valuetext={`${minimum} ${t.minutes}`}
            className={slider}
            style={{ zIndex: minimum >= 39 ? 2 : 1 }}
            type="range"
            min={0}
            max={40}
            step={1}
            value={minimum}
            onChange={(event) => setMinimum(Math.min(Number(event.target.value), maximum))}
          />
          <input
            aria-label={t.maximum}
            aria-valuetext={maximum === 40 ? t.unlimited : `${maximum} ${t.minutes}`}
            className={slider}
            type="range"
            min={0}
            max={40}
            step={1}
            value={maximum}
            onChange={(event) => setMaximum(Math.max(Number(event.target.value), minimum))}
          />
        </div>
        <div aria-hidden="true" className="flex justify-between text-xs text-text-muted">
          {[0, 10, 20, 30, "40+"].map((tick) => <span key={tick}>{tick}</span>)}
        </div>
      </fieldset>
      <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 font-semibold text-on-primary">{t.search}</button>
    </form>
  );
}
