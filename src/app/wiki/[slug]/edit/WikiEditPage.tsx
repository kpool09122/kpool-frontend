"use client";

import Image from "next/image";
import {
  getWikiBasicFields,
  isWikiBlock,
  isWikiSection,
  sortWikiSectionContents,
  WIKI_SECTION_MAX_DEPTH,
  type WikiBasic,
  type WikiBlock,
  type WikiBlockType,
  type WikiContentEditorId,
  type WikiDetail,
  type WikiEmbedProvider,
  type WikiListType,
  type WikiSection,
} from "@kpool/wiki";
import { useId, useState, type FormEvent } from "react";

import { buildWikiThemeCssVariables } from "../wikiThemePalette";
import { WikiEmbedFrame } from "../WikiEmbedFrame";
import { WikiRelatedProfiles } from "../WikiRelatedProfiles";
import { useWikiDetail } from "../useWikiDetail";
import { useWikiEditDraft } from "./useWikiEditDraft";

type WikiEditPageProps = {
  slug: string;
  themeColor?: string;
};

type WikiPreviewMode = "light" | "dark";

const blockTypes: WikiBlockType[] = [
  "text",
  "image",
  "image_gallery",
  "embed",
  "quote",
  "list",
  "table",
  "profile_card_list",
];

const blockTypeLabels: Record<WikiBlockType, string> = {
  text: "Text",
  image: "Image",
  image_gallery: "Gallery",
  embed: "Embed",
  quote: "Quote",
  list: "List",
  table: "Table",
  profile_card_list: "Profiles",
};

const themeColorOptions = [
  "#d94f70",
  "#00d084",
  "#4c5cff",
  "#f1a81f",
  "#1f9a8a",
  "#7c3aed",
];

const mainBackgroundStyle = {
  backgroundColor: "var(--background)",
  backgroundImage:
    "var(--wiki-page-background, radial-gradient(circle at top, rgba(255,214,194,0.85), transparent 38%), linear-gradient(180deg, var(--background) 0%, #fff 100%))",
};

const cardSurfaceStyle = {
  backgroundColor: "var(--wiki-card-background, var(--surface-raised))",
  borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
};

const cardSurfaceMutedStyle = {
  backgroundColor: "var(--wiki-card-background-muted, var(--surface-base))",
  borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
};

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m6 6 1 15h10l1-15" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ImageEditableOverlay() {
  return (
    <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
      Editable image
    </span>
  );
}

function FormActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-strong"
        style={cardSurfaceStyle}
        type="submit"
      >
        Save
      </button>
      <button
        className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-muted"
        onClick={onCancel}
        type="button"
      >
        Cancel
      </button>
    </div>
  );
}

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

function WikiEditSidebar({
  isBusy,
  isOpen,
  onClear,
  onPreviewModeChange,
  onSave,
  onSubmit,
  onToggle,
  onUpdateSettings,
  previewMode,
  slug,
  themeColor,
}: {
  isBusy: boolean;
  isOpen: boolean;
  onClear: () => void;
  onPreviewModeChange: (mode: WikiPreviewMode) => void;
  onSave: () => void;
  onSubmit: () => void;
  onToggle: () => void;
  onUpdateSettings: (settings: Partial<Pick<WikiDetail, "slug" | "themeColor">>) => void;
  previewMode: WikiPreviewMode;
  slug: string;
  themeColor: string | null | undefined;
}) {
  const customColorValue = themeColor ?? themeColorOptions[2];

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
            <WikiSaveButton disabled={isBusy} onSave={onSave} />
            <WikiSubmitButton disabled={isBusy} onSubmit={onSubmit} />
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
              Slug
              <input
                className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2"
                onChange={(event) => onUpdateSettings({ slug: event.currentTarget.value })}
                value={slug}
              />
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

const getString = (formData: FormData, name: string): string =>
  String(formData.get(name) ?? "");

const getLines = (formData: FormData, name: string): string[] =>
  getString(formData, name)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

function BasicPanel({
  basic,
  isEditing,
  onEdit,
  onCancel,
  onSave,
}: {
  basic: WikiBasic;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (basic: WikiBasic) => void;
}) {
  const fields = getWikiBasicFields(basic);

  if (isEditing) {
    return (
      <form
        className="rounded-[1.75rem] border border-stroke-subtle p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          onSave({
            ...basic,
            name: getString(formData, "name"),
            groupType: getString(formData, "groupType"),
            status: getString(formData, "status"),
            generation: getString(formData, "generation"),
            debutDate: getString(formData, "debutDate"),
            fandomName: getString(formData, "fandomName"),
            representativeSymbol: getString(formData, "representativeSymbol"),
            officialColors: getLines(formData, "officialColors"),
            agencyName: getString(formData, "agencyName") || null,
          });
        }}
        style={cardSurfaceMutedStyle}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
          Basic
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Name
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.name} name="name" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Group Type
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.groupType} name="groupType" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Status
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.status} name="status" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Generation
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.generation} name="generation" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Debut Date
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.debutDate} name="debutDate" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Fandom Name
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.fandomName} name="fandomName" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Representative Symbol
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.representativeSymbol} name="representativeSymbol" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Agency
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.agencyName ?? ""} name="agencyName" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong md:col-span-2">
            Official Colors
            <textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.officialColors.join("\n")} name="officialColors" />
          </label>
        </div>
        <FormActions onCancel={onCancel} />
      </form>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-stroke-subtle p-6" style={cardSurfaceMutedStyle}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
            Basic
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            Group profile
          </p>
        </div>
        <button
          aria-label="Edit basic"
          className="rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30"
          onClick={onEdit}
          style={cardSurfaceStyle}
          type="button"
        >
          <EditIcon />
        </button>
      </div>
      <dl className="mt-6 grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <div
            className="rounded-2xl border border-stroke-subtle bg-surface-raised px-4 py-3"
            key={field.label}
            style={cardSurfaceStyle}
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
              {field.label}
            </dt>
            <dd className="mt-1 text-sm leading-6 text-text-strong">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HeroPanel({
  heroImage,
  isEditing,
  onEdit,
  onCancel,
  onSave,
}: {
  heroImage: WikiDetail["heroImage"];
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (heroImage: WikiDetail["heroImage"]) => void;
}) {
  if (isEditing) {
    return (
      <form
        className="rounded-[1.75rem] border border-stroke-subtle p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSave({
            src: getString(formData, "src"),
            alt: getString(formData, "alt"),
          });
        }}
        style={cardSurfaceStyle}
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Hero image URL
            <input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={heroImage.src} name="src" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Hero image alt
            <input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={heroImage.alt} name="alt" />
          </label>
        </div>
        <FormActions onCancel={onCancel} />
      </form>
    );
  }

  return (
    <div className="relative h-full min-h-[22rem] overflow-hidden rounded-[1.75rem] border border-stroke-subtle" style={cardSurfaceStyle}>
      <Image
        alt={heroImage.alt}
        className="object-cover"
        fill
        sizes="(min-width: 1024px) 55vw, 100vw"
        src={heroImage.src}
      />
      <ImageEditableOverlay />
      <button
        aria-label="Edit hero image"
        className="absolute right-3 top-3 z-30 rounded-full border border-white/40 bg-black/60 p-3 text-white"
        onClick={onEdit}
        type="button"
      >
        <EditIcon />
      </button>
    </div>
  );
}

function HeroBasicFlipCard({
  heroImage,
  basic,
  isFlipped,
  flipCardId,
  isHeroEditing,
  isBasicEditing,
  onFlipChange,
  onEditHero,
  onEditBasic,
  onCancel,
  onSaveHero,
  onSaveBasic,
}: {
  heroImage: WikiDetail["heroImage"];
  basic: WikiBasic;
  isFlipped: boolean;
  flipCardId: string;
  isHeroEditing: boolean;
  isBasicEditing: boolean;
  onFlipChange: (isFlipped: boolean) => void;
  onEditHero: () => void;
  onEditBasic: () => void;
  onCancel: () => void;
  onSaveHero: (heroImage: WikiDetail["heroImage"]) => void;
  onSaveBasic: (basic: WikiBasic) => void;
}) {
  const fields = getWikiBasicFields(basic);

  return (
    <div className="grid gap-4 lg:hidden">
      <input
        checked={isFlipped}
        className="sr-only"
        data-testid="wiki-edit-flip-input"
        id={flipCardId}
        onChange={(event) => onFlipChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <div
        aria-label="Flip wiki edit card"
        className="block"
        data-testid="wiki-edit-flip-trigger"
        role="group"
      >
        <div className="relative h-[34rem] [perspective:1400px]">
          <div
            className={`relative h-full rounded-[2rem] shadow-soft transition duration-700 [transform-style:preserve-3d] ${
              isFlipped ? "[transform:rotateY(180deg)]" : ""
            }`}
            data-testid="wiki-edit-flip-card"
          >
            <div className="absolute inset-0 overflow-hidden rounded-[2rem] [backface-visibility:hidden]">
              <HeroPanel
                heroImage={heroImage}
                isEditing={isHeroEditing}
                onCancel={onCancel}
                onEdit={onEditHero}
                onSave={onSaveHero}
              />
            </div>
            {!isHeroEditing ? (
              <label
                aria-label="Flip wiki edit card to basic details"
                className={`absolute inset-0 z-20 rounded-[1.75rem] ${
                  isFlipped ? "pointer-events-none" : "cursor-pointer"
                }`}
                data-testid="wiki-edit-flip-front-toggle"
                htmlFor={flipCardId}
              />
            ) : null}

            <div
              className={`absolute inset-0 z-20 flex h-full flex-col overflow-hidden rounded-[2rem] border border-stroke-subtle bg-surface-raised p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                isFlipped ? "pointer-events-auto" : "pointer-events-none"
              }`}
              onClick={() => {
                if (!isBasicEditing) {
                  onFlipChange(false);
                }
              }}
              style={cardSurfaceStyle}
            >
              {isBasicEditing ? (
                <div
                  className="min-h-0 flex-1 overflow-y-auto pr-1"
                  onClick={(event) => event.stopPropagation()}
                >
                <BasicPanel
                  basic={basic}
                  isEditing={isBasicEditing}
                  onCancel={onCancel}
                  onEdit={onEditBasic}
                  onSave={onSaveBasic}
                />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                        Basic
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                        Group profile
                      </p>
                    </div>
                    <button
                      aria-label="Edit basic"
                      className="rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditBasic();
                      }}
                      style={cardSurfaceMutedStyle}
                      type="button"
                    >
                      <EditIcon />
                    </button>
                  </div>
                  <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                    <dl className="grid gap-4">
                      {fields.map((field) => (
                        <div
                          className="rounded-2xl border border-stroke-subtle bg-surface-base px-4 py-3"
                          key={field.label}
                          style={cardSurfaceMutedStyle}
                        >
                          <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                            {field.label}
                          </dt>
                          <dd className="mt-1 text-sm leading-6 text-text-strong">{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-text-muted">
        <span className={isFlipped ? "hidden" : ""}>
          Tap the card to flip to the basic details.
        </span>
        <span className={isFlipped ? "inline" : "hidden"}>
          Tap outside the form area to return to the cover image.
        </span>
      </p>
    </div>
  );
}

function SectionForm({
  section,
  onCancel,
  onSave,
}: {
  section: WikiSection;
  onCancel: () => void;
  onSave: (changes: Pick<WikiSection, "title">) => void;
}) {
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSave({
          title: getString(formData, "title"),
        });
      }}
    >
      <label className="grid gap-2 text-sm font-semibold text-text-strong">
        Section title
        <input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={section.title} name="title" />
      </label>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function BlockDisplay({ block }: { block: WikiBlock }) {
  switch (block.blockType) {
    case "text":
      return <p className="text-sm leading-7 text-text-muted">{block.content}</p>;
    case "image":
      return (
        <figure>
          <div className="relative min-h-64 overflow-hidden rounded-2xl border border-stroke-subtle">
            <Image alt={block.alt ?? ""} className="object-cover" fill sizes="100vw" src={block.imageSrc} />
            <ImageEditableOverlay />
          </div>
          {block.caption ? <figcaption className="mt-2 text-sm text-text-muted">{block.caption}</figcaption> : null}
        </figure>
      );
    case "image_gallery":
      return (
        <figure>
          <div className="grid gap-3 sm:grid-cols-2">
            {block.images.map((image) => (
              <div className="relative min-h-40 overflow-hidden rounded-2xl border border-stroke-subtle" key={image.imageIdentifier}>
                <Image alt={image.alt ?? ""} className="object-cover" fill sizes="50vw" src={image.imageSrc} />
                <ImageEditableOverlay />
              </div>
            ))}
          </div>
          {block.caption ? <figcaption className="mt-2 text-sm text-text-muted">{block.caption}</figcaption> : null}
        </figure>
      );
    case "embed":
      return <WikiEmbedFrame block={block} />;
    case "quote":
      return (
        <blockquote className="border-l-4 border-text-muted/30 pl-4 text-base leading-8 text-text-strong">
          {block.content}
          {block.source ? <cite className="mt-2 block text-sm text-text-muted">{block.source}</cite> : null}
        </blockquote>
      );
    case "list":
      return block.listType === "numbered" ? (
        <ol className="list-decimal space-y-2 pl-6 text-sm leading-7 text-text-muted">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ol>
      ) : (
        <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-text-muted">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            {block.headers ? (
              <thead>
                <tr>{block.headers.map((header) => <th className="border-b border-stroke-subtle px-3 py-2" key={header}>{header}</th>)}</tr>
              </thead>
            ) : null}
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("|")}>{row.map((cell) => <td className="border-b border-stroke-subtle px-3 py-2 text-text-muted" key={cell}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "profile_card_list":
      return <WikiRelatedProfiles block={block} />;
  }
}

function BlockForm({
  block,
  onCancel,
  onSave,
}: {
  block: WikiBlock;
  onCancel: () => void;
  onSave: (changes: Partial<WikiBlock>) => void;
}) {
  const submit = (
    event: FormEvent<HTMLFormElement>,
    getChanges: (formData: FormData) => Partial<WikiBlock>,
  ) => {
    event.preventDefault();
    onSave(getChanges(new FormData(event.currentTarget)));
  };

  switch (block.blockType) {
    case "text":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ content: getString(data, "content") }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">Text<textarea className="min-h-28 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.content} name="content" /></label>
          <FormActions onCancel={onCancel} />
        </form>
      );
    case "image":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ imageIdentifier: getString(data, "imageIdentifier"), imageSrc: getString(data, "imageSrc"), caption: getString(data, "caption") || null, alt: getString(data, "alt") || null }))}>
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Image identifier<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.imageIdentifier} name="imageIdentifier" /></label>
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Image URL<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.imageSrc} name="imageSrc" /></label>
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Alt<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.alt ?? ""} name="alt" /></label>
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Caption<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.caption ?? ""} name="caption" /></label>
          </div>
          <FormActions onCancel={onCancel} />
        </form>
      );
    case "image_gallery":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ images: getLines(data, "images").map((line, index) => ({ imageIdentifier: line, imageSrc: block.images[index]?.imageSrc ?? block.images[0]?.imageSrc ?? "", alt: block.images[index]?.alt ?? line })), caption: getString(data, "caption") || null }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">Image identifiers<textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.images.map((image) => image.imageIdentifier).join("\n")} name="images" /></label>
          <label className="mt-3 grid gap-2 text-sm font-semibold text-text-strong">Caption<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.caption ?? ""} name="caption" /></label>
          <FormActions onCancel={onCancel} />
        </form>
      );
    case "embed":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ provider: getString(data, "provider") as WikiEmbedProvider, embedId: getString(data, "embedId"), caption: getString(data, "caption") || null }))}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Provider<select className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.provider} name="provider"><option value="youtube">youtube</option><option value="spotify">spotify</option><option value="x">x</option><option value="tiktok">tiktok</option></select></label>
            <label className="grid gap-2 text-sm font-semibold text-text-strong">Embed ID<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.embedId} name="embedId" /></label>
            <label className="grid gap-2 text-sm font-semibold text-text-strong sm:col-span-2">Caption<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.caption ?? ""} name="caption" /></label>
          </div>
          <FormActions onCancel={onCancel} />
        </form>
      );
    case "quote":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ content: getString(data, "content"), source: getString(data, "source") || null }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">Quote<textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.content} name="content" /></label>
          <label className="mt-3 grid gap-2 text-sm font-semibold text-text-strong">Source<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.source ?? ""} name="source" /></label>
          <FormActions onCancel={onCancel} />
        </form>
      );
    case "list":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ listType: getString(data, "listType") as WikiListType, items: getLines(data, "items") }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">List type<select className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.listType} name="listType"><option value="bullet">bullet</option><option value="numbered">numbered</option></select></label>
          <label className="mt-3 grid gap-2 text-sm font-semibold text-text-strong">Items<textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.items.join("\n")} name="items" /></label>
          <FormActions onCancel={onCancel} />
        </form>
      );
    case "table":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ headers: getLines(data, "headers"), rows: getLines(data, "rows").map((row) => row.split(",").map((cell) => cell.trim())) }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">Headers<textarea className="min-h-20 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={(block.headers ?? []).join("\n")} name="headers" /></label>
          <label className="mt-3 grid gap-2 text-sm font-semibold text-text-strong">Rows<textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.rows.map((row) => row.join(", ")).join("\n")} name="rows" /></label>
          <FormActions onCancel={onCancel} />
        </form>
      );
    case "profile_card_list":
      return (
        <form onSubmit={(event) => submit(event, (data) => ({ title: getString(data, "title") || null, wikiIdentifiers: getLines(data, "wikiIdentifiers") }))}>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">Title<input className="rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.title ?? ""} name="title" /></label>
          <label className="mt-3 grid gap-2 text-sm font-semibold text-text-strong">Wiki slugs<textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-base px-3 py-2" defaultValue={block.wikiIdentifiers.join("\n")} name="wikiIdentifiers" /></label>
          <FormActions onCancel={onCancel} />
        </form>
      );
  }
}

function BlockEditorItem({
  block,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  block: WikiBlock;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (changes: Partial<WikiBlock>) => void;
  onDelete: () => void;
}) {
  const controls = (
    <div className="flex gap-2">
      <button aria-label={`Edit ${block.blockType} block`} className="rounded-full border border-stroke-subtle p-2" onClick={onEdit} type="button"><EditIcon /></button>
      <button aria-label={`Delete ${block.blockType} block`} className="rounded-full border border-status-danger/30 p-2 text-status-danger transition hover:bg-status-danger/10" onClick={onDelete} type="button"><TrashIcon /></button>
    </div>
  );

  if (isEditing) {
    return (
      <article className="rounded-2xl border border-stroke-subtle p-4" data-testid={`wiki-edit-block-${block.blockIdentifier}`} style={cardSurfaceMutedStyle}>
        <div className="mb-3 flex justify-end">
          {controls}
        </div>
        <BlockForm block={block} onCancel={onCancel} onSave={onSave} />
      </article>
    );
  }

  return (
    <article className="group relative" data-testid={`wiki-edit-block-${block.blockIdentifier}`}>
      <div className="absolute right-0 top-0 z-10 flex gap-2 rounded-full bg-surface-raised/90 p-1 shadow-soft opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        {controls}
      </div>
      <BlockDisplay block={block} />
    </article>
  );
}

function AddContentControls({
  section,
  onAddSection,
  onAddBlock,
}: {
  section: WikiSection;
  onAddSection: (parentSectionIdentifier: string) => void;
  onAddBlock: (sectionIdentifier: string, blockType: WikiBlockType) => void;
}) {
  const canAddSection = section.depth < WIKI_SECTION_MAX_DEPTH;
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-dashed border-stroke-subtle p-4" data-testid={`wiki-edit-add-section-${section.sectionIdentifier}`}>
      <div className="flex flex-wrap items-start gap-2">
        <button
          className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-strong disabled:cursor-not-allowed disabled:text-text-muted"
          disabled={!canAddSection}
          onClick={() => onAddSection(section.sectionIdentifier)}
          title={canAddSection ? "Add section" : "Max depth reached"}
          type="button"
        >
          + Section
        </button>
        <div className="relative">
          <button
            aria-expanded={isBlockMenuOpen}
            className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-strong"
            onClick={() => setIsBlockMenuOpen((isOpen) => !isOpen)}
            type="button"
          >
            + Block
          </button>
          {isBlockMenuOpen ? (
            <div className="absolute left-0 z-20 mt-2 grid min-w-44 gap-1 rounded-2xl border border-stroke-subtle bg-surface-raised p-2 shadow-soft" style={cardSurfaceStyle}>
              {blockTypes.map((blockType) => (
                <button
                  className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-text-muted transition hover:bg-brand-highlight/20 hover:text-text-strong"
                  key={blockType}
                  onClick={() => {
                    onAddBlock(section.sectionIdentifier, blockType);
                    setIsBlockMenuOpen(false);
                  }}
                  type="button"
                >
                  {blockTypeLabels[blockType]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {!canAddSection ? (
          <span className="px-2 py-2 text-sm text-text-muted">Max depth reached</span>
        ) : null}
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  editingId,
  onEdit,
  onCancel,
  onSaveSection,
  onSaveBlock,
  onAddSection,
  onAddBlock,
  onDeleteContent,
}: {
  section: WikiSection;
  editingId: string | null;
  onEdit: (id: WikiContentEditorId) => void;
  onCancel: () => void;
  onSaveSection: (sectionIdentifier: string, changes: Pick<WikiSection, "title">) => void;
  onSaveBlock: (blockIdentifier: string, changes: Partial<WikiBlock>) => void;
  onAddSection: (parentSectionIdentifier: string) => void;
  onAddBlock: (sectionIdentifier: string, blockType: WikiBlockType) => void;
  onDeleteContent: (identifier: string) => void;
}) {
  const contents = sortWikiSectionContents(section.contents);
  const sectionEditorId: WikiContentEditorId = `section:${section.sectionIdentifier}`;

  return (
    <details className="rounded-[1.75rem] border border-stroke-subtle shadow-soft" data-testid={`wiki-edit-section-${section.sectionIdentifier}`} open style={cardSurfaceStyle}>
      <summary className="flex list-none items-start gap-3 p-5 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-2xl font-semibold tracking-[-0.03em] text-text-strong">{section.title}</span>
        </span>
        <button aria-label={`Edit section ${section.title}`} className="rounded-full border border-stroke-subtle p-3 text-text-strong" onClick={(event) => { event.preventDefault(); onEdit(sectionEditorId); }} style={cardSurfaceMutedStyle} type="button"><EditIcon /></button>
        <button aria-label={`Delete section ${section.title}`} className="rounded-full border border-status-danger/30 p-3 text-status-danger transition hover:bg-status-danger/10" onClick={(event) => { event.preventDefault(); onDeleteContent(section.sectionIdentifier); }} type="button"><TrashIcon /></button>
      </summary>
      <div className="space-y-6 border-t border-stroke-subtle px-5 pb-5 pt-5" style={{ borderColor: "var(--wiki-card-border, var(--stroke-subtle))" }}>
        {editingId === sectionEditorId ? (
          <SectionForm
            onCancel={onCancel}
            onSave={(changes) => onSaveSection(section.sectionIdentifier, changes)}
            section={section}
          />
        ) : null}

        {contents.map((content) =>
          isWikiBlock(content) ? (
            <BlockEditorItem
              block={content}
              isEditing={editingId === `block:${content.blockIdentifier}`}
              key={content.blockIdentifier}
              onCancel={onCancel}
              onDelete={() => onDeleteContent(content.blockIdentifier)}
              onEdit={() => onEdit(`block:${content.blockIdentifier}`)}
              onSave={(changes) => onSaveBlock(content.blockIdentifier, changes)}
            />
          ) : isWikiSection(content) ? (
            <SectionEditor
              editingId={editingId}
              key={content.sectionIdentifier}
              onAddBlock={onAddBlock}
              onAddSection={onAddSection}
              onCancel={onCancel}
              onDeleteContent={onDeleteContent}
              onEdit={onEdit}
              onSaveBlock={onSaveBlock}
              onSaveSection={onSaveSection}
              section={content}
            />
          ) : null,
        )}

        <AddContentControls
          onAddBlock={onAddBlock}
          onAddSection={onAddSection}
          section={section}
        />
      </div>
    </details>
  );
}

function StatePanel({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen bg-surface-base px-6 py-12 text-text-strong sm:px-10">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-stroke-subtle bg-surface-raised p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-text-muted">
          {title}
        </p>
        <p className="mt-4 text-lg leading-7 text-text-muted">{message}</p>
      </div>
    </main>
  );
}

function WikiEditContent({ data }: { data: WikiDetail }) {
  const flipCardId = useId();
  const [isBasicFlipped, setIsBasicFlipped] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState<WikiPreviewMode>("light");
  const {
    draft,
    editingId,
    saveState,
    clearDraft,
    requestPublication,
    saveDraft,
    setEditingId,
    updateBasic,
    updateHeroImage,
    updateSettings,
    updateSection,
    updateBlock,
    addSection,
    addBlock,
    deleteContent,
  } = useWikiEditDraft(data);
  const themeStyles = buildWikiThemeCssVariables(draft.themeColor);
  const themeLabel = draft.themeColor?.toUpperCase();
  const closeEditor = () => setEditingId(null);
  const editHeroImage = () => {
    setIsBasicFlipped(false);
    setEditingId("hero");
  };
  const editBasic = () => {
    setIsBasicFlipped(true);
    setEditingId("basic");
  };
  const isBusy = saveState.status === "saving" || saveState.status === "submitting";
  const clearChanges = () => {
    if (!window.confirm("Discard unsaved wiki changes?")) {
      return;
    }

    setIsBasicFlipped(false);
    clearDraft();
  };

  return (
      <main
        className="wiki-theme-scope min-h-screen px-5 py-6 text-text-strong sm:px-8 sm:py-10"
        data-theme={previewMode}
        data-testid="wiki-edit-root"
        style={{
        ...themeStyles,
        ...mainBackgroundStyle,
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-text-strong lg:text-5xl">
              {draft.basic.name}
            </h1>
          </div>
        </header>

        <div className="flex min-w-0 flex-col gap-8">
          {themeLabel ? (
            <div>
              <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]" data-testid="wiki-edit-theme-badge" style={cardSurfaceStyle}>
                Theme {themeLabel}
              </span>
            </div>
          ) : null}

          <section>
            <HeroBasicFlipCard
              basic={draft.basic}
              flipCardId={flipCardId}
              heroImage={draft.heroImage}
              isBasicEditing={editingId === "basic"}
              isFlipped={isBasicFlipped}
              isHeroEditing={editingId === "hero"}
              onCancel={closeEditor}
              onEditBasic={editBasic}
              onEditHero={editHeroImage}
              onFlipChange={setIsBasicFlipped}
              onSaveBasic={(basic) => {
                updateBasic(basic);
                closeEditor();
              }}
              onSaveHero={(heroImage) => {
                updateHeroImage(heroImage);
                closeEditor();
              }}
            />
            <div className="hidden gap-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
              <HeroPanel
                heroImage={draft.heroImage}
                isEditing={editingId === "hero"}
                onCancel={closeEditor}
                onEdit={editHeroImage}
                onSave={(heroImage) => {
                  updateHeroImage(heroImage);
                  closeEditor();
                }}
              />
              <BasicPanel
                basic={draft.basic}
                isEditing={editingId === "basic"}
                onCancel={closeEditor}
                onEdit={editBasic}
                onSave={(basic) => {
                  updateBasic(basic);
                  closeEditor();
                }}
              />
            </div>
          </section>

          <section className="space-y-5">
            {draft.sections.map((section) => (
              <SectionEditor
                editingId={editingId}
                key={section.sectionIdentifier}
                onAddBlock={addBlock}
                onAddSection={addSection}
                onCancel={closeEditor}
                onDeleteContent={deleteContent}
                onEdit={setEditingId}
                onSaveBlock={(blockIdentifier, changes) => {
                  updateBlock(blockIdentifier, changes);
                  closeEditor();
                }}
                onSaveSection={(sectionIdentifier, changes) => {
                  updateSection(sectionIdentifier, changes);
                  closeEditor();
                }}
                section={section}
              />
            ))}
            <button
              className="w-full rounded-[1.5rem] border border-dashed border-stroke-subtle p-5 text-sm font-semibold uppercase tracking-[0.18em] text-text-muted"
              onClick={() => addSection()}
              style={cardSurfaceStyle}
              type="button"
            >
              + Section
            </button>
          </section>
        </div>

        <WikiEditSidebar
          isBusy={isBusy}
          isOpen={isSidebarOpen}
          onClear={clearChanges}
          onPreviewModeChange={setPreviewMode}
          onSave={saveDraft}
          onSubmit={requestPublication}
          onToggle={() => setIsSidebarOpen((isOpen) => !isOpen)}
          onUpdateSettings={updateSettings}
          previewMode={previewMode}
          slug={draft.slug}
          themeColor={draft.themeColor}
        />
      </div>
    </main>
  );
}

export function WikiEditPage({ slug, themeColor }: WikiEditPageProps) {
  const wikiDetail = useWikiDetail(slug, { themeColor });

  if (wikiDetail.status === "loading") {
    return (
      <StatePanel
        message="Preparing the wiki editor..."
        title="Loading Wiki Editor"
      />
    );
  }

  if (wikiDetail.status === "error") {
    return <StatePanel message={wikiDetail.message} title="Unable to load wiki" />;
  }

  if (wikiDetail.status === "empty") {
    return (
      <StatePanel
        message="This resource does not have a wiki draft to edit at the moment."
        title="No wiki draft"
      />
    );
  }

  return <WikiEditContent data={wikiDetail.data} />;
}
