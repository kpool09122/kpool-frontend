"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { AnnouncementMarkdown } from "@/components/Announcement/AnnouncementMarkdown";
import type { I18nDictionary } from "@/i18n/dictionaries";

export function AnnouncementBodyEditor({
  content,
  disabled,
  onChange,
  t,
}: {
  content: string;
  disabled: boolean;
  onChange: (value: string) => void;
  t: I18nDictionary["announcements"];
}) {
  const id = useId();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const editTab = useRef<HTMLButtonElement>(null);
  const previewTab = useRef<HTMLButtonElement>(null);
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home"
      ? "edit"
      : event.key === "End"
        ? "preview"
        : activeTab === "edit" ? "preview" : "edit";
    setActiveTab(next);
    (next === "edit" ? editTab : previewTab).current?.focus();
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-text-strong" htmlFor={`${id}-content`}>
        {t.content}
      </label>
      <div
        role="tablist"
        aria-label={`${t.content}: ${t.edit} / ${t.preview}`}
        className="flex border-b border-stroke-subtle md:hidden"
      >
        {(["edit", "preview"] as const).map((tab) => (
          <button
            key={tab}
            ref={tab === "edit" ? editTab : previewTab}
            id={`${id}-${tab}-tab`}
            role="tab"
            type="button"
            aria-controls={`${id}-${tab}-panel`}
            aria-selected={activeTab === tab}
            tabIndex={activeTab === tab ? 0 : -1}
            className={`border-b-2 px-4 py-2 text-sm font-semibold ${activeTab === tab ? "border-brand-primary text-text-strong" : "border-transparent text-text-muted"}`}
            onClick={() => setActiveTab(tab)}
            onKeyDown={onTabKeyDown}
          >
            {tab === "edit" ? t.edit : t.preview}
          </button>
        ))}
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <div
          id={`${id}-edit-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-edit-tab`}
          className={`min-w-0 space-y-2 ${activeTab === "edit" ? "block" : "hidden"} md:flex md:flex-col`}
        >
          <p className="hidden text-sm font-medium text-text-muted md:block">{t.edit}</p>
          <textarea
            id={`${id}-content`}
            className="block min-h-64 flex-1 w-full min-w-0 resize-y rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2 font-mono text-sm leading-7 text-text-strong disabled:opacity-60"
            disabled={disabled}
            required
            rows={10}
            maxLength={2048}
            value={content}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        <div
          id={`${id}-preview-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-preview-tab`}
          tabIndex={0}
          className={`min-w-0 space-y-2 ${activeTab === "preview" ? "block" : "hidden"} md:flex md:flex-col`}
        >
          <p className="hidden text-sm font-medium text-text-muted md:block">{t.preview}</p>
          <div className="min-h-64 flex-1 rounded-lg border border-stroke-subtle bg-surface-base p-3">
            {content.trim() ? (
              <AnnouncementMarkdown content={content} />
            ) : (
              <p className="text-sm text-text-muted">{t.previewEmpty}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
