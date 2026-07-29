"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

import {
  type WikiListCardMeta,
  WikiMasterSearchSelect,
} from "../../../components/Wiki";
import type { useI18n } from "../../../i18n/I18nProvider";
import { localeLabels, type Locale } from "../../../i18n/locales";
import { buildWikiThemeCssVariables } from "../../wiki/[slug]/wikiThemePalette";
import type { WikiDraftWiki } from "@/gateways/wiki/draftWiki";
import {
  type WikiMasterSearchItem,
  type WikiResourceType,
  wikiResourceTypes,
} from "@kpool/wiki";
import type { MyPageDraftWikiActionTab, MyPageWikiListItem } from "../useMyPageDraftWikis";

type CreateDraftWikiMode = "manual" | "auto";

export function CreateDraftWikiDialog({
  autoCreatableResourceTypes,
  error,
  isCreating,
  isOpen,
  locale,
  t,
  onClose,
  onSubmit,
}: {
  autoCreatableResourceTypes: WikiResourceType[];
  error: string | null;
  isCreating: boolean;
  isOpen: boolean;
  locale: Locale;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onClose: () => void;
  onSubmit: (input: {
    agencyIdentifier: string | null;
    groupIdentifiers: string[];
    language: Locale;
    mode: CreateDraftWikiMode;
    name: string;
    resourceType: WikiResourceType;
    slug: string;
    talentIdentifiers: string[];
  }) => void;
}) {
  const [mode, setMode] = useState<CreateDraftWikiMode>("manual");
  const [resourceType, setResourceType] = useState<WikiResourceType>("group");
  const [language, setLanguage] = useState<Locale>(locale);
  const [selectedAgency, setSelectedAgency] = useState<WikiMasterSearchItem[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<WikiMasterSearchItem[]>([]);
  const [selectedTalents, setSelectedTalents] = useState<WikiMasterSearchItem[]>([]);
  const canAutoCreate = autoCreatableResourceTypes.length > 0;
  const effectiveMode = mode === "auto" && canAutoCreate ? "auto" : "manual";
  const selectableResourceTypes =
    effectiveMode === "auto" ? autoCreatableResourceTypes : wikiResourceTypes;
  const selectedResourceType = selectableResourceTypes.includes(resourceType)
    ? resourceType
    : selectableResourceTypes[0] ?? "group";

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-label={t.createWikiDialogTitle}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6"
      role="dialog"
    >
      <form
        className="w-full max-w-md rounded-lg border border-stroke-subtle bg-surface-raised p-5 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const language = formData.get("language");
          const name = String(formData.get("name") ?? "").trim();
          const slug = String(formData.get("slug") ?? "").trim();

          if (
            !Object.keys(localeLabels).some((candidate) => candidate === language) ||
            !wikiResourceTypes.some((candidate) => candidate === selectedResourceType)
          ) {
            return;
          }

          onSubmit({
            agencyIdentifier: effectiveMode === "auto" ? selectedAgency[0]?.wikiIdentifier ?? null : null,
            groupIdentifiers: effectiveMode === "auto" ? selectedGroups.map((item) => item.wikiIdentifier) : [],
            language: language as Locale,
            mode: effectiveMode,
            name,
            resourceType: selectedResourceType,
            slug,
            talentIdentifiers: effectiveMode === "auto" ? selectedTalents.map((item) => item.wikiIdentifier) : [],
          });
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{t.createWikiDialogTitle}</h2>
          {canAutoCreate ? (
            <button
              className="rounded-lg border border-stroke-subtle px-3 py-1.5 text-sm font-semibold text-text-muted transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCreating}
              onClick={() => {
                if (effectiveMode === "auto") {
                  setMode("manual");
                  return;
                }

                setMode("auto");
                if (!autoCreatableResourceTypes.includes(resourceType)) {
                  setResourceType(autoCreatableResourceTypes[0] ?? "group");
                }
              }}
              type="button"
            >
              {effectiveMode === "auto" ? t.createWikiManualMode : t.createWikiAutoMode}
            </button>
          ) : null}
        </div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            {t.resourceTypeLabel}
            <select
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              disabled={isCreating}
              name="resourceType"
              onChange={(event) => {
                setResourceType(event.currentTarget.value as WikiResourceType);
                setSelectedAgency([]);
                setSelectedGroups([]);
                setSelectedTalents([]);
              }}
              required
              value={selectedResourceType}
            >
              {selectableResourceTypes.map((resourceType) => (
                <option key={resourceType} value={resourceType}>
                  {getDraftWikiResourceLabel(t, resourceType)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t.languageLabel}
            <select
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              disabled={isCreating}
              name="language"
              onChange={(event) => setLanguage(event.currentTarget.value as Locale)}
              required
              value={language}
            >
              {Object.entries(localeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t.wikiNameLabel}
            <input
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              disabled={isCreating}
              name="name"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t.slugLabel}
            <input
              className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
              disabled={isCreating}
              name="slug"
              pattern="[a-z0-9][a-z0-9-]*"
              required
            />
          </label>
          {effectiveMode === "auto" ? (
            <AutoCreateRelatedWikiFields
              disabled={isCreating}
              language={language}
              resourceType={selectedResourceType}
              selectedAgency={selectedAgency}
              selectedGroups={selectedGroups}
              selectedTalents={selectedTalents}
              setSelectedAgency={setSelectedAgency}
              setSelectedGroups={setSelectedGroups}
              setSelectedTalents={setSelectedTalents}
              t={t}
            />
          ) : null}
          {error ? (
            <p
              className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating}
            onClick={onClose}
            type="button"
          >
            {t.cancelCreateWiki}
          </button>
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? t.creatingWiki : effectiveMode === "auto" ? t.autoCreateWiki : t.createWiki}
          </button>
        </div>
      </form>
    </div>
  );
}


type RejectDraftWikiDialogProps = { isOpen: boolean; isSubmitting: boolean; t: ReturnType<typeof useI18n>["dictionary"]["mypage"]; onClose: () => void; onSubmit: (reason: string) => void };

export function RejectDraftWikiDialog(props: RejectDraftWikiDialogProps) {
  const { isOpen, isSubmitting, onClose, onSubmit, t } = props;
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();

  if (!isOpen) {
    return null;
  }

  return (
    <section
      aria-label={t.rejectDraftWikiDialogTitle}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
    >
      <form
        className="mx-auto w-full max-w-[30rem] rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();

          if (!trimmedReason) {
            return;
          }

          onSubmit(trimmedReason);
          setReason("");
        }}
      >
        <header className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{t.rejectDraftWikiDialogTitle}</h2>
        </header>
        <label className="mt-5 grid gap-2 text-sm font-semibold">
          {t.rejectDraftWikiReasonLabel}
          <textarea
            className="min-h-32 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
            disabled={isSubmitting}
            onChange={(event) => setReason(event.currentTarget.value)}
            required
            value={reason}
          />
        </label>
        {!trimmedReason ? (
          <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
            {t.rejectDraftWikiReasonRequired}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => {
              setReason("");
              onClose();
            }}
            type="button"
          >
            {t.cancelDraftWikiRejectReason}
          </button>
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !trimmedReason}
            type="submit"
          >
            {isSubmitting ? t.draftWikiReviewing : t.submitDraftWikiRejectReason}
          </button>
        </div>
      </form>
    </section>
  );
}

type DraftWikiRejectReasonDialogProps = { reason: string | null; t: ReturnType<typeof useI18n>["dictionary"]["mypage"]; onClose: () => void };

function DraftWikiRejectReasonDialog(props: DraftWikiRejectReasonDialogProps) {
  const { reason, t, onClose } = props;
  if (!reason) {
    return null;
  }

  return (
    <section
      aria-label={t.draftWikiRejectReasonDialogTitle}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
    >
      <div className="mx-auto w-full max-w-[30rem] rounded-xl border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
        <header className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{t.draftWikiRejectReasonDialogTitle}</h2>
          <button
            className="inline-flex rounded-md border border-stroke-subtle px-3 py-1.5 text-sm font-semibold text-text-muted transition hover:bg-brand-highlight/30"
            onClick={onClose}
            type="button"
          >
            {t.closeDraftWikiRejectReason}
          </button>
        </header>
        <p className="mt-4 whitespace-pre-wrap rounded-lg bg-surface-base p-3 text-sm leading-6">
          {reason}
        </p>
      </div>
    </section>
  );
}

function AutoCreateRelatedWikiFields({
  disabled,
  language,
  resourceType,
  selectedAgency,
  selectedGroups,
  selectedTalents,
  setSelectedAgency,
  setSelectedGroups,
  setSelectedTalents,
  t,
}: {
  disabled: boolean;
  language: Locale;
  resourceType: WikiResourceType;
  selectedAgency: WikiMasterSearchItem[];
  selectedGroups: WikiMasterSearchItem[];
  selectedTalents: WikiMasterSearchItem[];
  setSelectedAgency: (items: WikiMasterSearchItem[]) => void;
  setSelectedGroups: (items: WikiMasterSearchItem[]) => void;
  setSelectedTalents: (items: WikiMasterSearchItem[]) => void;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
}) {
  const showsAgency = resourceType === "group" || resourceType === "talent" || resourceType === "song";
  const showsGroups = resourceType === "talent" || resourceType === "song";
  const showsTalents = resourceType === "song";

  if (!showsAgency && !showsGroups && !showsTalents) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {showsAgency ? (
        <WikiMasterSearchSelect
          disabled={disabled}
          language={language}
          label={t.relatedAgencyLabel}
          mode="single"
          onChange={setSelectedAgency}
          resourceType="agency"
          selectedItems={selectedAgency}
        />
      ) : null}
      {showsGroups ? (
        <WikiMasterSearchSelect
          disabled={disabled}
          language={language}
          label={t.relatedGroupLabel}
          mode="multiple"
          onChange={setSelectedGroups}
          resourceType="group"
          selectedItems={selectedGroups}
        />
      ) : null}
      {showsTalents ? (
        <WikiMasterSearchSelect
          disabled={disabled}
          language={language}
          label={t.relatedTalentLabel}
          mode="multiple"
          onChange={setSelectedTalents}
          resourceType="talent"
          selectedItems={selectedTalents}
        />
      ) : null}
    </div>
  );
}

export function DraftWikiRejectionReasonButton({
  reason,
  t,
}: {
  reason: string | null;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
}) {
  const [isRejectionReasonOpen, setIsRejectionReasonOpen] = useState(false);

  if (!reason) {
    return null;
  }

  return (
    <>
      <button
        aria-label={t.showDraftWikiRejectReason}
        className="grid size-8 place-items-center text-yellow-500 transition hover:text-yellow-600"
        onClick={() => setIsRejectionReasonOpen(true)}
        type="button"
      >
        <ExclamationTriangleIcon aria-hidden="true" className="size-6" />
      </button>
      <DraftWikiRejectReasonDialog
        reason={isRejectionReasonOpen ? reason : null}
        t={t}
        onClose={() => setIsRejectionReasonOpen(false)}
      />
    </>
  );
}

export const getDraftWikiRejectionReason = (wiki: MyPageWikiListItem): string | null => {
  const reason = "rejectionReason" in wiki ? wiki.rejectionReason : null;

  return typeof reason === "string" && reason.trim() ? reason : null;
};

const isDraftWikiListItem = (wiki: MyPageWikiListItem): wiki is WikiDraftWiki =>
  ["approved", "pending", "rejected", "under_review"].includes(
    typeof (wiki as { status?: unknown }).status === "string"
      ? (wiki as { status: string }).status
      : "",
  );

export const getDraftWikiListCardHref = (wiki: MyPageWikiListItem, tab: MyPageDraftWikiActionTab): string =>
  tab === "untranslatedWikis"
    ? `/wiki/${encodeURIComponent(wiki.language)}/${encodeURIComponent(wiki.slug)}`
    : `/wiki/${encodeURIComponent(wiki.language)}/${encodeURIComponent(wiki.slug)}/edit`;

export const getDraftWikiListCardMeta = ({
  locale,
  t,
  wiki,
}: {
  locale: Locale;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  wiki: MyPageWikiListItem;
}): WikiListCardMeta[] => {
  if (isDraftWikiListItem(wiki)) {
    return [
      {
        label: t.draftWikiStatusLabel,
        value: getDraftWikiStatusLabel(t, wiki.status),
      },
      {
        label: t.draftWikiEditedAtLabel,
        value: formatDraftDate(wiki.editedAt, locale),
      },
    ];
  }

  return [
    {
      label: t.untranslatedWikiVersionLabel,
      value: String(wiki.version),
    },
    {
      label: t.untranslatedWikiUpdatedAtLabel,
      value: formatDraftDate(wiki.updatedAt, locale),
    },
  ];
};

export const buildDraftWikiListCardStyle = (wiki: MyPageWikiListItem): CSSProperties | undefined => {
  if (wiki.isHidden !== true && wiki.imageUrl) {
    return {
      backgroundColor: "#15243b",
      backgroundImage: `linear-gradient(180deg, rgba(21, 36, 59, 0.78) 0%, rgba(21, 36, 59, 0.68) 48%, rgba(21, 36, 59, 0.9) 100%), url("${wiki.imageUrl.replaceAll("\"", "%22")}")`,
      borderColor: "rgba(255, 255, 255, 0.22)",
    };
  }

  const themeVariables = buildWikiThemeCssVariables(wiki.themeColor);

  if (!themeVariables) {
    return undefined;
  }

  return {
    ...themeVariables,
    backgroundColor: "var(--wiki-card-background, var(--surface-raised))",
    backgroundImage: "var(--wiki-page-background)",
    borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
  };
};

export const getDraftWikiResourceLabel = (
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"],
  resourceType: string,
): string => (t.draftWikiResourceLabels as Record<string, string>)[resourceType] ?? resourceType;

const getDraftWikiStatusLabel = (
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"],
  status: WikiDraftWiki["status"],
): string => (t.draftWikiStatusLabels as Record<string, string>)[status] ?? status;

export const formatDraftDate = (value: string | null, locale: Locale): string => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        day: "numeric",
        hour: "numeric",
        hour12: false,
        minute: "2-digit",
        month: "numeric",
        second: "2-digit",
        timeZone: "Asia/Tokyo",
        year: "numeric",
      }).format(date);
};
