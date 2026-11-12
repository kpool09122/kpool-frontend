"use client";

import { useState } from "react";
import type { WikiHistoryBlock, WikiHistoryEntry } from "@kpool/wiki";
import { ArrowDown, ArrowUp } from "lucide-react";

import { LocalizedForm } from "@/components/LocalizedForm";
import { useI18n } from "@/i18n/I18nProvider";

import { TrashIcon } from "../icons";
import { WikiFormActions } from "../WikiFormActions";

type WikiHistoryBlockFormProps = {
  block: WikiHistoryBlock;
  onCancel: () => void;
  onSave: (changes: Pick<WikiHistoryBlock, "entries">) => void;
};

type HistoryFormRow = Omit<WikiHistoryEntry, "year"> & { id: number; year: number | null };

const inputClassName = "h-9 w-full min-w-0 rounded-lg border border-stroke-subtle bg-surface-base px-2 py-1 leading-6";
const rowActionClassName = "grid h-9 w-7 place-items-center rounded-lg text-text-muted transition enabled:hover:bg-surface-base disabled:cursor-not-allowed disabled:opacity-50 sm:w-8";
const yearPattern = /^[1-9][0-9]{3}$/;
const emptyEntry = { year: null, title: "", detail: null };

const compareYears = (left: { year: number | null }, right: { year: number | null }) =>
  (right.year ?? 0) - (left.year ?? 0);

export function WikiHistoryBlockForm({ block, onCancel, onSave }: WikiHistoryBlockFormProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.blockForm;
  const [rows, setRows] = useState<HistoryFormRow[]>(() =>
    (block.entries.length > 0 ? block.entries : [emptyEntry])
      .map((entry, id) => ({ ...entry, id }))
      .sort(compareYears),
  );
  const [nextId, setNextId] = useState(rows.length);
  const hasRepeatedYear = rows.some(({ year }, index) => year !== null && year === rows[index + 1]?.year);
  const columnsClassName = hasRepeatedYear
    ? "grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_5.25rem] sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_6rem]"
    : "grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_1.75rem] sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_2rem]";
  const rowClassName = `grid min-w-0 items-center gap-2 ${columnsClassName}`;
  const moveActions = [
    { offset: -1, label: t.moveItemUp, Icon: ArrowUp },
    { offset: 1, label: t.moveItemDown, Icon: ArrowDown },
  ] as const;

  const moveRow = (id: number, offset: -1 | 1) => {
    setRows((current) => {
      const index = current.findIndex((row) => row.id === id);
      const targetIndex = index + offset;
      const row = current[index];
      const target = current[targetIndex];
      if (row?.year == null || row.year !== target?.year) return current;

      const reordered = [...current];
      reordered[index] = target;
      reordered[targetIndex] = row;
      return reordered;
    });
  };

  return (
    <LocalizedForm
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const entries = rows
          .map(({ id }): WikiHistoryEntry => ({
            year: Number(fields.get(`year-${id}`)),
            title: String(fields.get(`title-${id}`) ?? "").trim(),
            detail: String(fields.get(`detail-${id}`) ?? "").trim() || null,
          }))
          .sort(compareYears);
        onSave({ entries });
      }}
    >
      <div className="grid gap-2">
        <div aria-hidden="true" className={`${rowClassName} text-sm font-semibold text-text-muted`}>
          <span>{t.historyYear}</span>
          <span>{t.historyTitle}</span>
          <span>{t.historyDetail}</span>
        </div>
        {rows.map(({ year, title, detail, id }, index) => (
          <div aria-label={t.item(index + 1)} className={rowClassName} key={id} role="group">
            <input
              aria-label={t.historyYear}
              className={inputClassName}
              defaultValue={year ?? ""}
              inputMode="numeric"
              maxLength={4}
              name={`year-${id}`}
              onBlur={(event) => {
                const value = event.currentTarget.value;
                const nextYear = yearPattern.test(value) ? Number(value) : null;
                if (nextYear === year) return;

                setRows((current) => current
                  .map((row) => row.id === id ? { ...row, year: nextYear } : row)
                  .sort(compareYears));
              }}
              pattern={yearPattern.source}
              required
            />
            <input
              aria-label={t.historyTitle}
              className={inputClassName}
              defaultValue={title}
              name={`title-${id}`}
              pattern={String.raw`.*\S.*`}
              required
            />
            <textarea
              aria-label={t.historyDetail}
              className={`${inputClassName} resize-none whitespace-pre`}
              defaultValue={detail ?? ""}
              name={`detail-${id}`}
              rows={1}
            />
            <div className="flex justify-end">
              {year !== null && (rows[index - 1]?.year === year || rows[index + 1]?.year === year)
                ? moveActions.map(({ offset, label, Icon }) => (
                  <button
                    aria-label={label}
                    className={rowActionClassName}
                    disabled={rows[index + offset]?.year !== year}
                    key={offset}
                    onClick={() => moveRow(id, offset)}
                    title={label}
                    type="button"
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </button>
                ))
                : null}
              <button
                aria-label={t.removeItem}
                className={`${rowActionClassName} enabled:hover:text-status-danger`}
                disabled={rows.length === 1}
                onClick={() => setRows((current) => current.filter((row) => row.id !== id))}
                title={t.removeItem}
                type="button"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        className="mt-3 rounded-xl border border-stroke-subtle px-3 py-2 text-sm font-semibold text-text-strong"
        onClick={() => {
          setRows((current) => [...current, { ...emptyEntry, id: nextId }]);
          setNextId((current) => current + 1);
        }}
        type="button"
      >
        {t.addItem}
      </button>
      <WikiFormActions onCancel={onCancel} />
    </LocalizedForm>
  );
}
