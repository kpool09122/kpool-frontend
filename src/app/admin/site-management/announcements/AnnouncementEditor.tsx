"use client";
import { useState } from "react";
import {
  announcementInputSchema,
  isAnnouncementPublishable,
  type AnnouncementInput,
  type DraftAnnouncement,
} from "@/gateways/site-management/announcements";
import { localeLabels, supportedLocales, type Locale } from "@/i18n/locales";
import type { I18nDictionary } from "@/i18n/dictionaries";

export type AnnouncementAction = "save" | "translate" | "publish" | "delete";
export function AnnouncementEditor({
  draft,
  allowed,
  busy,
  onAction,
  onClose,
  t,
}: {
  draft: DraftAnnouncement | null;
  allowed: (
    action: "create" | "update" | "translate" | "publish" | "delete",
  ) => boolean;
  busy: boolean;
  onAction: (action: AnnouncementAction, inputs?: AnnouncementInput[]) => void;
  onClose: () => void;
  t: I18nDictionary["announcements"];
}) {
  const [language, setLanguage] = useState<Locale>(
    draft?.sourceLanguage ?? "ja",
  );
  const [category, setCategory] = useState<1 | 2 | 3>(draft?.category ?? 1);
  const [date, setDate] = useState(draft?.publishedDate ?? "");
  const [contents, setContents] = useState(draft?.contents ?? {});
  const current = contents[language] ?? { title: "", content: "" };
  const dirty =
    !draft ||
    category !== draft.category ||
    date !== draft.publishedDate ||
    JSON.stringify(contents) !== JSON.stringify(draft.contents);
  const inputs = (draft ? supportedLocales : [language])
    .filter((locale) => {
      const value = contents[locale];
      return (
        value &&
        (category !== draft?.category ||
          date !== draft?.publishedDate ||
          JSON.stringify(value) !== JSON.stringify(draft?.contents[locale]))
      );
    })
    .map((locale) => ({
      language: locale,
      category,
      publishedDate: date,
      ...contents[locale]!,
    }));
  const valid =
    inputs.length > 0 &&
    inputs.every((input) => announcementInputSchema.safeParse(input).success);
  const editable = allowed(draft ? "update" : "create");
  const change = (field: "title" | "content", value: string) =>
    setContents({ ...contents, [language]: { ...current, [field]: value } });
  return (
    <form
      noValidate
      className="space-y-4 rounded-lg border border-stroke-subtle p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && editable && dirty && valid) onAction("save", inputs);
      }}
    >
      <fieldset disabled={busy} className="space-y-4 min-w-0">
        <label className="block">
          {draft ? t.language : t.sourceLanguage}
          <select
            aria-label={draft ? t.language : t.sourceLanguage}
            className="block w-full border p-2"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Locale)}
          >
            {supportedLocales.map((locale) => (
              <option key={locale} value={locale}>
                {localeLabels[locale]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          {t.category}
          <select
            className="block w-full border p-2"
            disabled={!editable}
            value={category}
            onChange={(event) =>
              setCategory(Number(event.target.value) as 1 | 2 | 3)
            }
          >
            <option value={1}>{t.news}</option>
            <option value={2}>{t.updates}</option>
            <option value={3}>{t.maintenance}</option>
          </select>
        </label>
        <label className="block">
          {t.date}
          <input
            className="block w-full border p-2"
            disabled={!editable}
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="block">
          {t.headline}
          <input
            className="block w-full border p-2"
            disabled={!editable}
            required
            maxLength={64}
            value={current.title}
            onChange={(event) => change("title", event.target.value)}
          />
        </label>
        <label className="block">
          {t.content}
          <textarea
            className="block w-full border p-2"
            disabled={!editable}
            required
            rows={10}
            maxLength={2048}
            value={current.content}
            onChange={(event) => change("content", event.target.value)}
          />
        </label>
        {dirty ? <p role="status">{t.unsaved}</p> : null}
        {draft && !isAnnouncementPublishable(draft) ? (
          <p>{t.incomplete}</p>
        ) : null}
        <div className="flex flex-wrap gap-4 [&_button]:rounded [&_button]:border [&_button]:px-4 [&_button]:py-2 [&_button:disabled]:opacity-40">
          {editable ? (
            <button disabled={!dirty || !valid} type="submit">
              {draft ? t.save : t.create}
            </button>
          ) : null}
          {draft && allowed("translate") ? (
            <button
              type="button"
              disabled={dirty}
              onClick={() => onAction("translate")}
            >
              {t.translate}
            </button>
          ) : null}
          {draft && allowed("publish") ? (
            <button
              type="button"
              disabled={dirty || !isAnnouncementPublishable(draft)}
              onClick={() => {
                if (window.confirm(t.confirmPublish)) onAction("publish");
              }}
            >
              {t.publish}
            </button>
          ) : null}
          {draft && allowed("delete") ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t.confirmDelete)) onAction("delete");
              }}
            >
              {t.delete}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!dirty || window.confirm(t.discard)) onClose();
            }}
          >
            {t.close}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
