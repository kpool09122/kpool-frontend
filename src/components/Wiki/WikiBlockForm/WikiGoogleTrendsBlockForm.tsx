"use client";

import { useState } from "react";
import {
  wikiGoogleTrendsSettingsSchema,
  type WikiGoogleTrendsBlock,
  type WikiGoogleTrendsSettings,
} from "@kpool/wiki";
import { LocalizedForm } from "@/components/LocalizedForm";
import { useI18n } from "@/i18n/I18nProvider";
import { WikiFormActions } from "../WikiFormActions";

const inputClassName =
  "w-full min-w-0 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2";

export function WikiGoogleTrendsBlockForm({
  block,
  onSave,
  onCancel,
}: {
  block: WikiGoogleTrendsBlock;
  onSave: (settings: WikiGoogleTrendsSettings) => void;
  onCancel: () => void;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.googleTrends;
  const [invalid, setInvalid] = useState(false);
  return (
    <LocalizedForm
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const settings = wikiGoogleTrendsSettingsSchema.safeParse({
          searchTerm: String(fields.get("searchTerm") ?? "").trim(),
          region: fields.get("region"),
          timeRange: fields.get("timeRange"),
        });
        if (!settings.success) {
          setInvalid(true);
          return;
        }
        onSave(settings.data);
      }}
    >
      <div className="grid min-w-0 gap-3">
        <label className="grid gap-1">
          {t.searchTerm}
          <input
            className={inputClassName}
            name="searchTerm"
            required
            defaultValue={block.searchTerm}
            onChange={() => setInvalid(false)}
          />
        </label>
        <label className="grid gap-1">
          {t.region}
          <select
            aria-label={t.region}
            className={inputClassName}
            name="region"
            defaultValue={block.region}
          >
            <option value="JP">{t.JP}</option>
            <option value="KR">{t.KR}</option>
            <option value="">{t.world}</option>
          </select>
        </label>
        <p className="text-sm text-text-muted">{t.regionHelp}</p>
        <label className="grid gap-1">
          {t.timeRange}
          <select
            aria-label={t.timeRange}
            className={inputClassName}
            name="timeRange"
            defaultValue={block.timeRange}
          >
            <option value="today 12-m">{t.year}</option>
            <option value="today 5-y">{t.fiveYears}</option>
          </select>
        </label>
        {invalid ? <p role="alert">{t.invalid}</p> : null}
      </div>
      <WikiFormActions onCancel={onCancel} />
    </LocalizedForm>
  );
}
