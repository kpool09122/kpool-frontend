"use client";

import type { ReactNode } from "react";

export function ContactCard({
  name,
  date,
  category,
  content,
  replied,
  statusLabel,
  expanded,
  disabled = false,
  onToggle,
  children,
}: {
  name?: string;
  date: ReactNode;
  category: string;
  content: string;
  replied: boolean;
  statusLabel: string;
  expanded: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-stroke-subtle bg-surface-raised">
      <button
        aria-expanded={expanded}
        className="w-full p-4 text-left transition hover:border-brand-primary hover:bg-brand-highlight/10 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={onToggle}
        type="button"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="w-full shrink-0 text-sm text-text-muted sm:w-auto">{date}</span>
            {name !== undefined ? <span className="max-w-full truncate text-sm font-semibold text-text-strong sm:max-w-48">{name}</span> : null}
            <span className="shrink-0 rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-900">{category}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-text-muted">{content}</span>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${replied ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>
            {statusLabel}
          </span>
        </div>
      </button>
      {expanded ? <section className="border-t border-stroke-subtle bg-surface-base p-4 text-text-strong">{children}</section> : null}
    </article>
  );
}
