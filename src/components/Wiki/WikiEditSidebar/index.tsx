"use client";

import { type WikiDetail } from "@kpool/wiki";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { useState } from "react";

import {
  getWikiResourceTypeFromSlug,
  type WikiResourceType,
  getWikiResourceLabel,
  wikiResourceTypes,
} from "@kpool/wiki";
import { type WikiEditorMode, type WikiPreviewMode, themeColorOptions } from "../editing";
import { ChevronLeftIcon } from "../icons";
import { cardSurfaceMutedStyle, cardSurfaceStyle } from "../styles";

const seoTitleMaxLength = 40;
const metaDescriptionMaxLength = 140;
const seoKeywordMaxLength = 20;
const seoKeywordsMaxItems = 5;

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
  isReviewLocked,
  onSubmit,
}: {
  disabled: boolean;
  isReviewLocked: boolean;
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
      {isReviewLocked ? "Under review" : "Submit for review"}
    </button>
  );
}

type WikiEditSidebarProps = {
  canPersist: boolean;
  editorMode: WikiEditorMode;
  isEditorModeDisabled?: boolean;
  isBusy: boolean;
  isOpen: boolean;
  isReviewLocked?: boolean;
  onEditorModeChange: (mode: WikiEditorMode) => void;
  onClear: () => void;
  onPreviewModeChange: (mode: WikiPreviewMode) => void;
  onSave: () => void;
  onSubmit: () => void;
  onToggle: () => void;
  onUpdateSettings: (
    settings: Partial<Pick<WikiDetail, "resourceType" | "slug" | "themeColor" | "title" | "metaDescription" | "keywords">>,
  ) => void;
  previewMode: WikiPreviewMode;
  resourceType: WikiDetail["resourceType"];
  slug: string;
  themeColor: string | null | undefined;
  title: string | null;
  metaDescription: string | null;
  keywords: string[] | null;
};

export function WikiEditSidebar({
  canPersist,
  editorMode,
  isEditorModeDisabled = false,
  isBusy,
  isOpen,
  isReviewLocked = false,
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
  title,
  metaDescription,
  keywords,
}: WikiEditSidebarProps) {
  const customColorValue = themeColor ?? themeColorOptions[2];
  const isActionDisabled = isBusy || !canPersist || isReviewLocked;
  const isEditControlDisabled = isBusy || isReviewLocked;
  const isEditorModeControlDisabled = isEditControlDisabled || isEditorModeDisabled;
  const [keywordInputs, setKeywordInputs] = useState<string[]>(
    () => keywords && keywords.length > 0 ? keywords : [""],
  );
  const updateSettings = (
    settings: Partial<Pick<WikiDetail, "resourceType" | "slug" | "themeColor" | "title" | "metaDescription" | "keywords">>,
  ) => {
    if (!isEditControlDisabled) {
      onUpdateSettings(settings);
    }
  };
  const resolvedResourceType =
    (resourceType as WikiResourceType | undefined) ??
    getWikiResourceTypeFromSlug(slug) ??
    "group";
  const updateKeywords = (nextKeywords: string[]) => {
    setKeywordInputs(nextKeywords);
    updateSettings({ keywords: nextKeywords });
  };
  const removeKeyword = (index: number) => {
    const nextKeywords =
      keywordInputs.length > 1
        ? keywordInputs.filter((_, currentIndex) => currentIndex !== index)
        : [""];

    updateKeywords(nextKeywords);
  };

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
            <WikiSubmitButton
              disabled={isActionDisabled}
              isReviewLocked={isReviewLocked}
              onSubmit={onSubmit}
            />
            <button
              aria-label="Clear wiki changes"
              className="rounded-full border border-stroke-subtle px-5 py-2 text-sm font-semibold text-text-muted disabled:cursor-not-allowed"
              disabled={isEditControlDisabled}
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
                    className="rounded-full px-3 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-text-muted transition aria-pressed:bg-surface-raised aria-pressed:text-text-strong aria-pressed:shadow-soft disabled:cursor-not-allowed"
                    disabled={isEditorModeControlDisabled}
                    key={mode}
                    onClick={() => {
                      if (!isEditorModeControlDisabled) {
                        onEditorModeChange(mode);
                      }
                    }}
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
                disabled={isEditControlDisabled}
                onChange={(event) =>
                  updateSettings({
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

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-text-strong">Theme color</legend>
              <div className="grid grid-cols-4 gap-2">
                <button
                  aria-pressed={!themeColor}
                  className="h-9 rounded-xl border border-stroke-subtle bg-surface-base text-xs font-semibold text-text-muted disabled:cursor-not-allowed"
                  disabled={isEditControlDisabled}
                  onClick={() => updateSettings({ themeColor: null })}
                  type="button"
                >
                  Default
                </button>
                {themeColorOptions.map((color) => (
                  <button
                    aria-label={`Set theme color ${color}`}
                    aria-pressed={themeColor?.toLowerCase() === color}
                    className="h-9 rounded-xl border border-stroke-subtle ring-offset-2 ring-offset-surface-raised aria-pressed:ring-2 aria-pressed:ring-text-strong disabled:cursor-not-allowed"
                    disabled={isEditControlDisabled}
                    key={color}
                    onClick={() => updateSettings({ themeColor: color })}
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
                  disabled={isEditControlDisabled}
                  onChange={(event) => updateSettings({ themeColor: event.currentTarget.value })}
                  type="color"
                  value={customColorValue}
                />
              </label>
            </fieldset>

            <div className="mt-2 grid gap-4 border-t border-stroke-subtle pt-5">
              <label className="grid gap-2 text-sm font-semibold text-text-strong">
                Title
                <input
                  aria-label="Metadata title"
                  className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2"
                  disabled={isEditControlDisabled}
                  maxLength={seoTitleMaxLength}
                  onChange={(event) => updateSettings({ title: event.currentTarget.value })}
                  value={title ?? ""}
                />
                <span className="text-right text-xs font-medium text-text-muted">
                  {(title ?? "").length} / {seoTitleMaxLength}
                </span>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-text-strong">
                Meta description
                <textarea
                  aria-label="Metadata meta description"
                  className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2"
                  disabled={isEditControlDisabled}
                  maxLength={metaDescriptionMaxLength}
                  onChange={(event) => updateSettings({ metaDescription: event.currentTarget.value })}
                  value={metaDescription ?? ""}
                />
                <span className="text-right text-xs font-medium text-text-muted">
                  {(metaDescription ?? "").length} / {metaDescriptionMaxLength}
                </span>
              </label>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-semibold text-text-strong">Keywords</legend>
                <div className="mt-2 grid gap-2">
                  {keywordInputs.map((keyword, index) => (
                    <div className="grid gap-1" key={index}>
                      <div className="flex overflow-hidden rounded-xl border border-stroke-subtle bg-surface-base">
                        <input
                          aria-label={`Keyword ${index + 1}`}
                          className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
                          disabled={isEditControlDisabled}
                          maxLength={seoKeywordMaxLength}
                          onChange={(event) => {
                            const nextKeywords = [...keywordInputs];
                            nextKeywords[index] = event.currentTarget.value;
                            updateKeywords(nextKeywords);
                          }}
                          value={keyword}
                        />
                        <button
                          aria-label={`Remove keyword ${index + 1}`}
                          className="grid w-9 place-items-center text-text-muted disabled:cursor-not-allowed disabled:text-text-muted/50"
                          disabled={isEditControlDisabled}
                          onClick={() => removeKeyword(index)}
                          type="button"
                        >
                          <Cross2Icon />
                        </button>
                      </div>
                      <span className="text-right text-xs font-medium text-text-muted">
                        {keyword.length} / {seoKeywordMaxLength}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  aria-label="Add keyword"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-stroke-subtle pb-0.5 text-lg font-semibold leading-none text-text-strong disabled:cursor-not-allowed disabled:text-text-muted"
                  disabled={isEditControlDisabled || keywordInputs.length >= seoKeywordsMaxItems}
                  onClick={() => setKeywordInputs([...keywordInputs, ""])}
                  style={cardSurfaceMutedStyle}
                  type="button"
                >
                  <PlusIcon />
                </button>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
