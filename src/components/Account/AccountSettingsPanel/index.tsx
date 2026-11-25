"use client";

import type { ReactNode } from "react";

export function AccountSettingsPanel({
  action,
  children,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="mt-5 rounded-lg border border-stroke-subtle bg-surface-raised p-5 shadow-soft">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2">
        <h2 className="min-w-0 text-xl font-semibold">{title}</h2>
        {action ? <div className="col-start-2 row-start-1 justify-self-end">{action}</div> : null}
        {description ? (
          <p className="col-span-2 whitespace-pre-line text-sm leading-6 text-text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
