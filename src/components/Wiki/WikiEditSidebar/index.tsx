"use client";

import { type WikiDetail } from "@kpool/wiki";

import {
  getWikiResourceTypeFromSlug,
  normalizeWikiSlugForResourceType,
  stripWikiResourcePrefix,
  type WikiResourceType,
  getWikiResourceLabel,
  wikiResourceTypes,
  wikiResourceTypePrefixes,
} from "../../../app/wiki/wikiRouting";
import { type WikiEditorMode, type WikiPreviewMode, themeColorOptions } from "../editing";
import { ChevronLeftIcon } from "../icons";
import { cardSurfaceMutedStyle, cardSurfaceStyle } from "../styles";

function WikiSaveButton({
  disabled,
  onSave,
}: {
  disabled: boolean;
  onSave: () => void;
}) {
  return (
    <button
      aria-label="Save wiki changes"
      className="rounded-full border border-stroke-subtle px-5 py-2 text-sm font-semibold text-text-strong disabled:cursor-not-allowed disabled:text-text-muted"
      disabled={disabled}
      onClick={onSave}
      style={cardSurfaceStyle}
      type="button"
    >
      Save
    </button>
  );
}

function WikiSubmitButton({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <button
      aria-label="Submit wiki for review"
      className="rounded-full border border-stroke-subtle px-5 py-2 text-sm font-semibold text-text-strong disabled:cursor-not-allowed disabled:text-text-muted"
      disabled={disabled}
      onClick={onSubmit}
      style={cardSurfaceStyle}
      type="button"
    >
      Submit for review
    </button>
  );
}

type WikiEditSidebarProps = {
  canPersist: boolean;
  editorMode: WikiEditorMode;
  isBusy: boolean;
  isOpen: boolean;
  onEditorModeChange: (mode: WikiEditorMode) => void;
  onClear: () => void;
  onPreviewModeChange: (mode: WikiPreviewMode) => void;
  onSave: () => void;
  onSubmit: () => void;
  onToggle: () => void;
  onUpdateSettings: (
    settings: Partial<Pick<WikiDetail, "resourceType" | "slug" | "themeColor">>,
  ) => void;
  previewMode: WikiPreviewMode;
  resourceType: WikiDetail["resourceType"];
  slug: string;
  themeColor: string | null | undefined;
};

export function WikiEditSidebar({
  canPersist,
  editorMode,
  isBusy,
  isOpen,
  onEditorModeChange,
  onClear,
  onPreviewModeChange,
  onSave,
  onSubmit,
  onToggle,
  onUpdateSettings,
  previewMode,
  resourceType,
  slug,
  themeColor,
}: WikiEditSidebarProps) {
  const customColorValue = themeColor ?? themeColorOptions[2];
  const isActionDisabled = isBusy || !canPersist;
  const resolvedResourceType =
    (resourceType as WikiResourceType | undefined) ??
    getWikiResourceTypeFromSlug(slug) ??
    "group";
  const slugPrefix = wikiResourceTypePrefixes[resolvedResourceType];
  const slugSuffix = stripWikiResourcePrefix(slug);

  return (
    <aside
      className={`fixed bottom-0 right-0 top-20 z-30 w-72 max-w-[calc(100vw-2rem)] transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
      data-testid="wiki-edit-sidebar"
    >
      <button
        aria-label={isOpen ? "Collapse editor sidebar" : "Expand editor sidebar"}
        aria-expanded={isOpen}
        className="absolute -left-11 top-6 z-10 grid h-20 w-11 place-items-center rounded-l-2xl border-y border-l border-stroke-subtle text-text-strong shadow-soft transition hover:bg-brand-highlight/20"
        onClick={onToggle}
        style={cardSurfaceStyle}
        type="button"
      >
        <span className={`transition-transform ${isOpen ? "" : "rotate-180"}`}>
          <ChevronLeftIcon />
        </span>
      </button>

      <div className="relative h-full overflow-y-auto border border-r-0 border-stroke-subtle p-4 shadow-soft" style={cardSurfaceStyle}>
        <div className={isOpen ? "block" : "pointer-events-none invisible"}>
          <div className="grid gap-2">
            <WikiSaveButton disabled={isActionDisabled} onSave={onSave} />
            <WikiSubmitButton disabled={isActionDisabled} onSubmit={onSubmit} />
            <button
              aria-label="Clear wiki changes"
              className="rounded-full border border-stroke-subtle px-5 py-2 text-sm font-semibold text-text-muted"
              onClick={onClear}
              style={cardSurfaceMutedStyle}
              type="button"
            >
              Clear
            </button>
          </div>

          <div className="mt-5 grid gap-4 border-t border-stroke-subtle pt-5" style={{ borderColor: "var(--wiki-card-border, var(--stroke-subtle))" }}>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-text-strong">Editor mode</legend>
              <div className="grid grid-cols-2 gap-2 rounded-full border border-stroke-subtle bg-surface-base p-1">
                {(["gui", "code"] as const).map((mode) => (
                  <button
                    aria-pressed={editorMode === mode}
                    className="rounded-full px-3 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-text-muted transition aria-pressed:bg-surface-raised aria-pressed:text-text-strong aria-pressed:shadow-soft"
                    key={mode}
                    onClick={() => onEditorModeChange(mode)}
                    type="button"
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-text-strong">Preview mode</legend>
              <div className="grid grid-cols-2 gap-2 rounded-full border border-stroke-subtle bg-surface-base p-1">
                {(["light", "dark"] as const).map((mode) => (
                  <button
                    aria-pressed={previewMode === mode}
                    className="rounded-full px-3 py-2 text-sm font-semibold text-text-muted transition aria-pressed:bg-surface-raised aria-pressed:text-text-strong aria-pressed:shadow-soft"
                    key={mode}
                    onClick={() => onPreviewModeChange(mode)}
                    type="button"
                  >
                    {mode === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="grid gap-2 text-sm font-semibold text-text-strong">
              Resource type
              <select
                className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2"
                onChange={(event) =>
                  onUpdateSettings({
                    resourceType: event.currentTarget.value as WikiResourceType,
                  })
                }
                value={resolvedResourceType}
              >
                {wikiResourceTypes.map((nextResourceType) => (
                  <option key={nextResourceType} value={nextResourceType}>
                    {getWikiResourceLabel(nextResourceType)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-text-strong">
              Slug
              <div className="flex overflow-hidden rounded-xl border border-stroke-subtle bg-surface-base">
                <span className="border-r border-stroke-subtle bg-surface-raised px-3 py-2 text-text-muted">
                  {slugPrefix}
                </span>
                <input
                  aria-label="Slug"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2"
                  onChange={(event) =>
                    onUpdateSettings({
                      slug: normalizeWikiSlugForResourceType(
                        event.currentTarget.value,
                        resolvedResourceType,
                      ),
                    })
                  }
                  value={slugSuffix}
                />
              </div>
            </label>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-text-strong">Theme color</legend>
              <div className="grid grid-cols-4 gap-2">
                <button
                  aria-pressed={!themeColor}
                  className="h-9 rounded-xl border border-stroke-subtle bg-surface-base text-xs font-semibold text-text-muted"
                  onClick={() => onUpdateSettings({ themeColor: null })}
                  type="button"
                >
                  Default
                </button>
                {themeColorOptions.map((color) => (
                  <button
                    aria-label={`Set theme color ${color}`}
                    aria-pressed={themeColor?.toLowerCase() === color}
                    className="h-9 rounded-xl border border-stroke-subtle ring-offset-2 ring-offset-surface-raised aria-pressed:ring-2 aria-pressed:ring-text-strong"
                    key={color}
                    onClick={() => onUpdateSettings({ themeColor: color })}
                    style={{ backgroundColor: color }}
                    type="button"
                  />
                ))}
              </div>
              <label className="grid gap-2 text-sm font-semibold text-text-strong">
                Custom color
                <input
                  aria-label="Theme color"
                  className="h-11 w-full rounded-xl border border-stroke-subtle bg-surface-base p-1"
                  onChange={(event) => onUpdateSettings({ themeColor: event.currentTarget.value })}
                  type="color"
                  value={customColorValue}
                />
              </label>
            </fieldset>
          </div>
        </div>
      </div>
    </aside>
  );
}
