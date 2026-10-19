"use client";
import { useState, type ReactNode } from "react";
import {
  announcementInputSchema,
  isAnnouncementPublishable,
  type AnnouncementInput,
  type DraftAnnouncement,
} from "@/gateways/site-management/announcements";
import { localeLabels, supportedLocales, type Locale } from "@/i18n/locales";
import type { I18nDictionary } from "@/i18n/dictionaries";
import { AnnouncementBodyEditor } from "./AnnouncementBodyEditor";

export type AnnouncementAction = "save" | "translate" | "publish" | "delete";
export function AnnouncementEditor({
  draft,
  locale,
  allowed,
  busy,
  onAction,
  onClose,
  feedback,
  t,
}: {
  draft: DraftAnnouncement | null;
  locale: Locale;
  allowed: (
    action: "create" | "update" | "translate" | "publish" | "delete",
  ) => boolean;
  busy: boolean;
  onAction: (action: AnnouncementAction, inputs?: AnnouncementInput[]) => void;
  onClose: () => void;
  feedback?: ReactNode;
  t: I18nDictionary["announcements"];
}) {
  const [editingLanguage, setEditingLanguage] = useState<Locale>(
    draft?.sourceLanguage ?? locale,
  );
  const language = draft ? editingLanguage : locale;
  const [category, setCategory] = useState<1 | 2 | 3>(draft?.category ?? 1);
  const [contents, setContents] = useState(draft?.contents ?? {});
  const current = contents[language] ?? { title: "", content: "" };
  const dirty =
    !draft ||
    category !== draft.category ||
    JSON.stringify(contents) !== JSON.stringify(draft.contents);
  const inputs = (draft ? supportedLocales : [language])
    .filter((locale) => {
      const value = contents[locale];
      return (
        value &&
        (category !== draft?.category ||
          JSON.stringify(value) !== JSON.stringify(draft?.contents[locale]))
      );
    })
    .map((locale) => ({
      language: locale,
      category,
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
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && editable && dirty && valid) onAction("save", inputs);
      }}
    >
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        {draft ? (
          <label className="grid gap-2 text-sm font-medium text-text-strong">
            {t.language}
            <select
              aria-label={t.language}
              className="w-full min-w-0 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-text-strong disabled:opacity-60"
              value={language}
              onChange={(event) => setEditingLanguage(event.target.value as Locale)}
            >
              {supportedLocales.map((locale) => (
                <option key={locale} value={locale}>
                  {localeLabels[locale]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="grid gap-2 text-sm font-medium text-text-strong">
          {t.category}
          <select
            className="w-full min-w-0 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-text-strong disabled:opacity-60"
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
        <label className="grid gap-2 text-sm font-medium text-text-strong">
          {t.headline}
          <input
            className="w-full min-w-0 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 text-text-strong disabled:opacity-60"
            disabled={!editable}
            required
            maxLength={64}
            value={current.title}
            onChange={(event) => change("title", event.target.value)}
          />
        </label>
        <AnnouncementBodyEditor
          content={current.content}
          disabled={!editable}
          onChange={(value) => change("content", value)}
          t={t}
        />
        <div className="flex flex-wrap gap-3 border-t border-stroke-subtle pt-5 [&_button]:rounded-lg [&_button]:border [&_button]:border-stroke-subtle [&_button]:px-5 [&_button]:py-2.5 [&_button]:text-sm [&_button]:font-semibold [&_button]:transition [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-40">
          {editable ? (
            <button className="bg-brand-primary text-on-primary hover:brightness-105" disabled={!dirty || !valid} type="submit">
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
      {feedback}
    </form>
  );
}
