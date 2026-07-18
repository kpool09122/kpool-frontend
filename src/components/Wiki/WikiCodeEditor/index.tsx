"use client";

import { cardSurfaceMutedStyle, cardSurfaceStyle } from "../styles";
import { useI18n } from "../../../i18n/I18nProvider";

type WikiCodeEditorProps = {
  code: string;
  disabled?: boolean;
  errorMessage: string | null;
  warnings: string[];
  onChange: (value: string) => void;
  onClear: () => void;
};

export function WikiCodeEditor({
  code,
  disabled = false,
  errorMessage,
  warnings,
  onChange,
  onClear,
}: WikiCodeEditorProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.codeEditor;

  return (
    <section
      className="rounded-[1.75rem] border border-stroke-subtle p-5 shadow-soft"
      data-testid="wiki-code-editor"
      style={cardSurfaceStyle}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-strong">
            {t.title}
          </h2>
          <p className="max-w-3xl text-sm text-text-muted">
            {t.description}
          </p>
        </div>
        {errorMessage ? (
          <button
            className="rounded-full border border-status-danger/30 px-4 py-2 text-sm font-semibold text-status-danger transition hover:bg-status-danger/10 disabled:cursor-not-allowed disabled:text-text-muted"
            disabled={disabled}
            onClick={onClear}
            type="button"
          >
            {t.clearInvalidCode}
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <div
          className="mt-4 rounded-2xl border border-status-danger/30 px-4 py-3 text-sm text-status-danger"
          data-testid="wiki-code-error"
          role="alert"
          style={cardSurfaceMutedStyle}
        >
          {errorMessage}
        </div>
      ) : (
        <>
          <div
            className="mt-4 rounded-2xl border border-stroke-subtle px-4 py-3 text-sm text-text-muted"
            style={cardSurfaceMutedStyle}
          >
            {t.supportedBlocks}
          </div>
          {warnings.length > 0 ? (
            <div
              className="mt-4 rounded-2xl border border-status-warning/30 px-4 py-3 text-sm text-text-strong"
              data-testid="wiki-code-warnings"
              role="status"
              style={cardSurfaceMutedStyle}
            >
              <p className="font-semibold text-status-warning">{t.compatibilityNotes}</p>
              <ul className="mt-2 list-disc pl-5">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <label className="mt-4 grid gap-2 text-sm font-semibold text-text-strong">
        {t.wikiCode}
        <textarea
          aria-label={t.wikiCode}
          className="min-h-[56rem] w-full rounded-[1.5rem] border border-stroke-subtle bg-surface-base px-4 py-4 font-mono text-sm leading-7 outline-none"
          data-testid="wiki-code-textarea"
          disabled={disabled}
          onChange={(event) => {
            if (!disabled) {
              onChange(event.currentTarget.value);
            }
          }}
          spellCheck={false}
          value={code}
        />
      </label>
    </section>
  );
}
