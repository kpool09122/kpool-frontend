"use client";

import { cardSurfaceMutedStyle, cardSurfaceStyle } from "../styles";

type WikiCodeEditorProps = {
  code: string;
  errorMessage: string | null;
  onChange: (value: string) => void;
  onClear: () => void;
};

export function WikiCodeEditor({
  code,
  errorMessage,
  onChange,
  onClear,
}: WikiCodeEditorProps) {
  return (
    <section
      className="rounded-[1.75rem] border border-stroke-subtle p-5 shadow-soft"
      data-testid="wiki-code-editor"
      style={cardSurfaceStyle}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-strong">
            Code mode
          </h2>
          <p className="max-w-3xl text-sm text-text-muted">
            Edit the whole section tree with headings like
            {" "}
            <code>= Overview =</code>
            {" "}
            and
            {" "}
            <code>== Style ==</code>
            .
          </p>
        </div>
        {errorMessage ? (
          <button
            className="rounded-full border border-status-danger/30 px-4 py-2 text-sm font-semibold text-status-danger transition hover:bg-status-danger/10"
            onClick={onClear}
            type="button"
          >
            Clear invalid code
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
        <div
          className="mt-4 rounded-2xl border border-stroke-subtle px-4 py-3 text-sm text-text-muted"
          style={cardSurfaceMutedStyle}
        >
          Supported blocks: plain text, quotes with <code>&gt;</code>, lists, tables,
          and structured macros for image, gallery, embed, and profiles.
        </div>
      )}

      <label className="mt-4 grid gap-2 text-sm font-semibold text-text-strong">
        Wiki code
        <textarea
          aria-label="Wiki code"
          className="min-h-[56rem] w-full rounded-[1.5rem] border border-stroke-subtle bg-surface-base px-4 py-4 font-mono text-sm leading-7 outline-none"
          data-testid="wiki-code-textarea"
          onChange={(event) => onChange(event.currentTarget.value)}
          spellCheck={false}
          value={code}
        />
      </label>
    </section>
  );
}
