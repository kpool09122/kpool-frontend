"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Image from "next/image";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

import { WikiMasterSearchSelect } from "../../../components/Wiki/WikiMasterSearchSelect";
import type { useI18n } from "../../../i18n/I18nProvider";
import { localeLabels, type Locale } from "../../../i18n/locales";
import { buildWikiThemeCssVariables } from "../../wiki/[slug]/wikiThemePalette";
import type { WikiDraftWiki, WikiDraftWorkflowAction } from "@/gateways/wiki/draftWiki";
import {
  buildWikiPath,
  isSafeWikiSourceUrl,
  toSafeWikiImageUrl,
  type WikiDraftImage,
  type WikiImageDeletionRequestListItem,
  type WikiMasterSearchItem,
  type WikiResourceType,
  wikiResourceTypes,
} from "@kpool/wiki";
import type { DraftImageListState } from "../useMyPageDraftImageReview";
import type { ImageDeletionRequestListState } from "../useMyPageImageDeletionRequestReview";
import type { DraftWikiListState, MyPageDraftWikiActionTab, MyPageWikiListItem } from "../useMyPageDraftWikis";

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

export function DraftWikiListPanel({
  locale,
  reviewError,
  deletingWikiIdentifier,
  reviewingWikiIdentifier,
  state,
  t,
  tab,
  onLoadMore,
  onReload,
  onDeleteDraftWiki,
  onReviewDraftWiki,
  onWithdrawDraftWiki,
}: {
  locale: Locale;
  reviewError: string | null;
  deletingWikiIdentifier: string | null;
  reviewingWikiIdentifier: string | null;
  state: DraftWikiListState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  tab: MyPageDraftWikiActionTab;
  onLoadMore: () => void;
  onReload: () => void;
  onDeleteDraftWiki: (wiki: MyPageWikiListItem) => void;
  onReviewDraftWiki: (wiki: MyPageWikiListItem, action: WikiDraftWorkflowAction, reason?: string) => void;
  onWithdrawDraftWiki: (wiki: MyPageWikiListItem) => void;
}) {
  const canLoadMore = state.pageInfo
    ? state.pageInfo.current_page < state.pageInfo.last_page
    : false;
  const isBusy = state.isInitialLoading || state.isLoadingMore;
  const messages = getDraftWikiListMessages(t, tab);

  if (state.loadError) {
    return (
      <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <p role="alert" className="font-semibold">{state.loadError}</p>
        <button
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold transition hover:bg-red-100"
          onClick={onReload}
          type="button"
        >
          {t.reloadDraftWikis}
        </button>
      </div>
    );
  }

  if (state.isInitialLoading) {
    return (
      <div className="mt-5 grid min-h-40 place-items-center rounded-lg border border-dashed border-stroke-subtle text-sm font-semibold text-text-muted">
        {messages.loading}
      </div>
    );
  }

  if (state.wikis.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-stroke-subtle p-6 text-center">
        <p className="font-semibold">{messages.emptyTitle}</p>
        <p className="mt-2 text-sm text-text-muted">{messages.emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {state.pageInfo ? (
        <p className="text-sm font-semibold text-text-muted">
          {messages.total(state.pageInfo.total)}
        </p>
      ) : null}
      {reviewError && (
        tab === "editingWikis" ||
        tab === "submittedWikis" ||
        tab === "unapprovedWikis" ||
        tab === "approvedWikis" ||
        tab === "untranslatedWikis"
      ) ? (
        <p
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          {reviewError}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {state.wikis.map((wiki) => (
          <DraftWikiCard
            isDeleting={deletingWikiIdentifier === wiki.wikiIdentifier}
            isReviewing={reviewingWikiIdentifier === wiki.wikiIdentifier}
            key={wiki.wikiIdentifier}
            locale={locale}
            showDeleteAction={isDeletableDraftWiki(wiki, tab)}
            showPublishAction={tab === "approvedWikis"}
            showReviewActions={tab === "unapprovedWikis"}
            showTranslateAction={tab === "untranslatedWikis"}
            showWithdrawAction={tab === "submittedWikis"}
            t={t}
            tab={tab}
            wiki={wiki}
            onDeleteDraftWiki={onDeleteDraftWiki}
            onReviewDraftWiki={onReviewDraftWiki}
            onWithdrawDraftWiki={onWithdrawDraftWiki}
          />
        ))}
      </div>
      <div className="flex justify-center">
        {canLoadMore ? (
          <button
            className="rounded-lg border border-stroke-subtle px-5 py-2.5 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onLoadMore}
            type="button"
          >
            {state.isLoadingMore ? t.draftWikiListLoadingMore : t.loadMoreDraftWikis}
          </button>
        ) : (
          <p className="text-sm font-semibold text-text-muted">{t.allDraftWikisLoaded}</p>
        )}
      </div>
    </div>
  );
}

function DraftWikiCard({
  isDeleting,
  isReviewing,
  locale,
  showDeleteAction,
  showReviewActions,
  showPublishAction,
  showTranslateAction,
  showWithdrawAction,
  t,
  tab,
  wiki,
  onDeleteDraftWiki,
  onReviewDraftWiki,
  onWithdrawDraftWiki,
}: {
  isDeleting: boolean;
  isReviewing: boolean;
  locale: Locale;
  showDeleteAction: boolean;
  showPublishAction: boolean;
  showReviewActions: boolean;
  showTranslateAction: boolean;
  showWithdrawAction: boolean;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  tab: MyPageDraftWikiActionTab;
  wiki: MyPageWikiListItem;
  onDeleteDraftWiki: (wiki: MyPageWikiListItem) => void;
  onReviewDraftWiki: (wiki: MyPageWikiListItem, action: WikiDraftWorkflowAction, reason?: string) => void;
  onWithdrawDraftWiki: (wiki: MyPageWikiListItem) => void;
}) {
  const hasImage = wiki.isHidden !== true && Boolean(wiki.imageUrl);
  const href = getDraftWikiHref(wiki, tab);
  const isDraftWiki = isDraftWikiListItem(wiki);
  const diffHref = getDraftWikiDiffHref(wiki);
  const canOpenDiff = isDraftWiki && wiki.publishedWikiIdentifier !== null;
  const rejectionReason = getDraftWikiRejectionReason(wiki);
  const [isRejectionReasonOpen, setIsRejectionReasonOpen] = useState(false);
  const cardClassName =
    "wiki-theme-scope min-w-0 rounded-lg border border-stroke-subtle bg-surface-base bg-cover bg-center p-4 shadow-soft";
  const cardStyle = buildDraftWikiCardStyle(wiki);

  return (
    <article
      className={cardClassName}
      style={cardStyle}
    >
    <div className="relative z-10">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold">
            <a
              className="text-brand-primary underline underline-offset-4"
              href={href}
              style={{ color: hasImage ? "#fffaf4" : undefined }}
            >
              {wiki.name}
            </a>
          </h3>
          <p
            className="mt-1 text-xs font-semibold uppercase text-text-muted"
            style={{ color: hasImage ? "rgba(255, 250, 244, 0.78)" : undefined }}
          >
            {wiki.language}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rejectionReason ? (
            <button
              aria-label={t.showDraftWikiRejectReason}
              className="grid size-8 place-items-center text-yellow-500 transition hover:text-yellow-600"
              onClick={() => setIsRejectionReasonOpen(true)}
              type="button"
            >
              <ExclamationTriangleIcon aria-hidden="true" className="size-6" />
            </button>
          ) : null}
          <span
            className="rounded-full border border-stroke-subtle px-2.5 py-1 text-xs font-semibold text-text-muted"
            style={{
              backgroundColor: hasImage
                ? "rgba(255, 255, 255, 0.86)"
                : wiki.themeColor
                  ? "var(--wiki-accent-background, rgba(255, 214, 194, 0.6))"
                  : undefined,
              color: hasImage
                ? "#15243b"
                : wiki.themeColor
                  ? "var(--wiki-accent-text)"
                  : undefined,
            }}
          >
            {getDraftWikiResourceLabel(t, wiki.resourceType)}
          </span>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        {isDraftWiki ? (
          <DraftWikiMeta
            isOnImage={hasImage}
            label={t.draftWikiStatusLabel}
            value={getDraftWikiStatusLabel(t, wiki.status)}
          />
        ) : (
          <DraftWikiMeta
            isOnImage={hasImage}
            label={t.untranslatedWikiVersionLabel}
            value={String(wiki.version)}
          />
        )}
        <DraftWikiMeta
          isOnImage={hasImage}
          label={isDraftWiki ? t.draftWikiEditedAtLabel : t.untranslatedWikiUpdatedAtLabel}
          value={formatDraftDate(isDraftWiki ? wiki.editedAt : wiki.updatedAt, locale)}
        />
      </dl>
      {showReviewActions ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onReviewDraftWiki(wiki, "approve")}
            type="button"
          >
            {isReviewing ? t.draftWikiReviewing : t.approveDraftWiki}
          </button>
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onReviewDraftWiki(wiki, "reject")}
            style={{
              backgroundColor: hasImage ? "rgba(255, 255, 255, 0.88)" : undefined,
              color: hasImage ? "#15243b" : undefined,
            }}
            type="button"
          >
            {isReviewing ? t.draftWikiReviewing : t.rejectDraftWiki}
          </button>
          {canOpenDiff ? (
            <a
              className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30"
              href={diffHref}
              style={{
                backgroundColor: hasImage ? "rgba(255, 255, 255, 0.88)" : undefined,
                color: hasImage ? "#15243b" : undefined,
              }}
            >
              {t.compareDraftWikiDiff}
            </a>
          ) : (
            <button
              className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold opacity-60 disabled:cursor-not-allowed"
              disabled
              style={{
                backgroundColor: hasImage ? "rgba(255, 255, 255, 0.88)" : undefined,
                color: hasImage ? "#15243b" : undefined,
              }}
              type="button"
            >
              {t.compareDraftWikiDiff}
            </button>
          )}
        </div>
      ) : null}
      {showDeleteAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting || isReviewing}
            onClick={() => onDeleteDraftWiki(wiki)}
            type="button"
          >
            {isDeleting ? t.draftWikiDeleting : t.deleteDraftWiki}
          </button>
        </div>
      ) : null}
      {showWithdrawAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onWithdrawDraftWiki(wiki)}
            style={{
              backgroundColor: hasImage ? "rgba(255, 255, 255, 0.88)" : undefined,
              color: hasImage ? "#15243b" : undefined,
            }}
            type="button"
          >
            {isReviewing ? t.draftWikiWithdrawing : t.withdrawDraftWiki}
          </button>
        </div>
      ) : null}
      {showPublishAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onReviewDraftWiki(wiki, "publish")}
            type="button"
          >
            {isReviewing ? t.draftWikiPublishing : t.publishDraftWiki}
          </button>
        </div>
      ) : null}
      {showTranslateAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onReviewDraftWiki(wiki, "translate")}
            type="button"
          >
            {isReviewing ? t.draftWikiTranslating : t.translateDraftWiki}
          </button>
        </div>
      ) : null}
    </div>
      <DraftWikiRejectReasonDialog
        reason={isRejectionReasonOpen ? rejectionReason : null}
        t={t}
        onClose={() => setIsRejectionReasonOpen(false)}
      />
    </article>
  );
}


export function ImageDeletionRequestListPanel({
  locale,
  reviewError,
  reviewingImageIdentifier,
  state,
  t,
  onLoadMore,
  onReload,
  onReviewImageDeletionRequest,
}: {
  locale: Locale;
  reviewError: string | null;
  reviewingImageIdentifier: string | null;
  state: ImageDeletionRequestListState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onLoadMore: () => void;
  onReload: () => void;
  onReviewImageDeletionRequest: (imageIdentifier: string, action: "approve" | "reject", rejectReason?: string) => void;
}) {
  const canLoadMore = state.pageInfo
    ? state.pageInfo.current_page < state.pageInfo.last_page
    : false;
  const isBusy = state.isInitialLoading || state.isLoadingMore;

  if (state.loadError) {
    return (
      <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <p role="alert" className="font-semibold">{state.loadError}</p>
        <button
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold transition hover:bg-red-100"
          onClick={onReload}
          type="button"
        >
          {t.reloadImageDeletionRequests}
        </button>
      </div>
    );
  }

  if (state.isInitialLoading) {
    return (
      <div className="mt-5 grid min-h-40 place-items-center rounded-lg border border-dashed border-stroke-subtle text-sm font-semibold text-text-muted">
        {t.imageDeletionRequestListLoading}
      </div>
    );
  }

  if (state.images.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-stroke-subtle p-6 text-center">
        <p className="font-semibold">{t.imageDeletionRequestListEmptyTitle}</p>
        <p className="mt-2 text-sm text-text-muted">{t.imageDeletionRequestListEmptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {state.pageInfo ? (
        <p className="text-sm font-semibold text-text-muted">
          {t.imageDeletionRequestListTotal(state.pageInfo.total)}
        </p>
      ) : null}
      {reviewError ? (
        <p
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          {reviewError}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {state.images.map((image) => (
          <ImageDeletionRequestCard
            image={image}
            isReviewing={reviewingImageIdentifier === image.imageIdentifier}
            key={image.imageIdentifier}
            locale={locale}
            t={t}
            onReviewImageDeletionRequest={onReviewImageDeletionRequest}
          />
        ))}
      </div>
      <div className="flex justify-center">
        {canLoadMore ? (
          <button
            className="rounded-lg border border-stroke-subtle px-5 py-2.5 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onLoadMore}
            type="button"
          >
            {state.isLoadingMore ? t.imageDeletionRequestListLoadingMore : t.loadMoreImageDeletionRequests}
          </button>
        ) : (
          <p className="text-sm font-semibold text-text-muted">{t.allImageDeletionRequestsLoaded}</p>
        )}
      </div>
    </div>
  );
}

function ImageDeletionRequestCard({
  image,
  isReviewing,
  locale,
  t,
  onReviewImageDeletionRequest,
}: {
  image: WikiImageDeletionRequestListItem;
  isReviewing: boolean;
  locale: Locale;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onReviewImageDeletionRequest: (imageIdentifier: string, action: "approve" | "reject", rejectReason?: string) => void;
}) {
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const trimmedRejectReason = rejectReason.trim();
  const safeImageUrl = toSafeWikiImageUrl(image.url);
  const closeDialog = () => {
    if (isReviewing) {
      return;
    }

    setIsRejectDialogOpen(false);
    setRejectReason("");
  };
  const submitDialog = () => {
    if (!trimmedRejectReason) {
      return;
    }

    onReviewImageDeletionRequest(image.imageIdentifier, "reject", trimmedRejectReason);
    setIsRejectDialogOpen(false);
    setRejectReason("");
  };

  return (
    <article className="overflow-hidden rounded-lg border border-stroke-subtle bg-surface-base">
      <div className="relative aspect-[4/3] bg-black/10">
        {safeImageUrl ? (
          <Image
            alt={image.altText || image.sourceName || image.imageIdentifier}
            className="object-cover"
            fill
            sizes="(min-width: 768px) 40vw, 90vw"
            src={safeImageUrl}
            unoptimized
          />
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-sm font-semibold text-text-muted">
            {t.imageDeletionRequestImageUnavailable}
          </div>
        )}
      </div>
      <div className="grid gap-4 p-4 text-sm">
        <dl className="grid gap-3">
          <DraftImageSourceNameMeta
            label={t.draftImageSourceNameLabel}
            sourceName={image.sourceName}
            sourceUrl={image.sourceUrl}
          />
          <DraftImageMeta label={t.draftImageAltTextLabel} value={image.altText || t.draftImageNoAltText} />
          <DraftImageMeta
            label={t.draftImageUploadedAtLabel}
            value={formatDraftDate(image.uploadedAt, locale)}
          />
          <DraftImageMeta
            label={t.imageDeletionRequestRequesterNameLabel}
            value={image.name}
          />
          <DraftImageMeta
            label={t.imageDeletionRequestRequesterEmailLabel}
            value={image.email}
          />
          <DraftImageMeta
            label={t.imageDeletionRequestReasonLabel}
            value={image.reason}
          />
        </dl>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => onReviewImageDeletionRequest(image.imageIdentifier, "approve")}
            type="button"
          >
            {isReviewing ? t.imageDeletionRequestReviewing : t.approveImageDeletionRequest}
          </button>
          <button
            className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isReviewing}
            onClick={() => setIsRejectDialogOpen(true)}
            type="button"
          >
            {isReviewing ? t.imageDeletionRequestReviewing : t.rejectImageDeletionRequest}
          </button>
        </div>
      </div>
      {isRejectDialogOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-labelledby="image-deletion-review-dialog-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-stroke-subtle bg-surface-raised p-5 shadow-soft">
            <h2 className="text-xl font-semibold" id="image-deletion-review-dialog-title">
              {t.rejectImageDeletionRequestDialogTitle}
            </h2>
            <label className="mt-4 grid gap-2 text-sm font-semibold">
              {t.imageDeletionRequestRejectReasonLabel}
              <textarea
                className="min-h-28 rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
                disabled={isReviewing}
                onChange={(event) => setRejectReason(event.currentTarget.value)}
                value={rejectReason}
              />
            </label>
            {!trimmedRejectReason ? (
              <p className="mt-2 text-sm font-semibold text-text-muted">
                {t.imageDeletionRequestRejectReasonRequired}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isReviewing}
                onClick={closeDialog}
                type="button"
              >
                {t.cancelImageDeletionRequestReview}
              </button>
              <button
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isReviewing || !trimmedRejectReason}
                onClick={submitDialog}
                type="button"
              >
                {isReviewing ? t.imageDeletionRequestReviewing : t.submitImageDeletionRequestReview}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function DraftImageListPanel({
  locale,
  reviewError,
  reviewingImageIdentifier,
  state,
  t,
  onLoadMore,
  onReload,
  onReviewDraftImage,
}: {
  locale: Locale;
  reviewError: string | null;
  reviewingImageIdentifier: string | null;
  state: DraftImageListState;
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"];
  onLoadMore: () => void;
  onReload: () => void;
  onReviewDraftImage: (imageIdentifier: string, action: "approve" | "reject") => void;
}) {
  const canLoadMore = state.pageInfo
    ? state.pageInfo.current_page < state.pageInfo.last_page
    : false;
  const isBusy = state.isInitialLoading || state.isLoadingMore;

  if (state.loadError) {
    return (
      <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <p role="alert" className="font-semibold">{state.loadError}</p>
        <button
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold transition hover:bg-red-100"
          onClick={onReload}
          type="button"
        >
          {t.reloadDraftImages}
        </button>
      </div>
    );
  }

  if (state.isInitialLoading) {
    return (
      <div className="mt-5 grid min-h-40 place-items-center rounded-lg border border-dashed border-stroke-subtle text-sm font-semibold text-text-muted">
        {t.draftImageListLoading}
      </div>
    );
  }

  if (state.images.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-stroke-subtle p-6 text-center">
        <p className="font-semibold">{t.draftImageListEmptyTitle}</p>
        <p className="mt-2 text-sm text-text-muted">{t.draftImageListEmptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {state.pageInfo ? (
        <p className="text-sm font-semibold text-text-muted">
          {t.draftImageListTotal(state.pageInfo.total)}
        </p>
      ) : null}
      {reviewError ? (
        <p
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          {reviewError}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {state.images.map((image) => {
          const wiki = getDraftImageWikiDisplay(image, locale);
          const isReviewing = reviewingImageIdentifier === image.imageIdentifier;

          return (
            <article
              className="overflow-hidden rounded-lg border border-stroke-subtle bg-surface-base"
              key={image.imageIdentifier}
            >
              <div className="relative aspect-[4/3] bg-black/10">
                <Image
                  alt={image.altText || image.sourceName || image.imageIdentifier}
                  className="object-cover"
                  fill
                  sizes="(min-width: 768px) 40vw, 90vw"
                  src={image.url}
                  unoptimized
                />
              </div>
              <div className="grid gap-4 p-4 text-sm">
                <dl className="grid gap-3">
                  <DraftImageSourceNameMeta
                    label={t.draftImageSourceNameLabel}
                    sourceName={image.sourceName}
                    sourceUrl={image.sourceUrl}
                  />
                  <DraftImageMeta label={t.draftImageAltTextLabel} value={image.altText || t.draftImageNoAltText} />
                  <DraftImageWikiMeta
                    href={wiki.href}
                    label={t.draftImageRelatedWikiLabel}
                    name={wiki.name}
                  />
                  <DraftImageMeta
                    label={t.draftImageUploadedAtLabel}
                    value={formatDraftDate(image.uploadedAt, locale)}
                  />
                </dl>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isReviewing}
                    onClick={() => onReviewDraftImage(image.imageIdentifier, "approve")}
                    type="button"
                  >
                    {isReviewing ? t.draftImageReviewing : t.approveDraftImage}
                  </button>
                  <button
                    className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isReviewing}
                    onClick={() => onReviewDraftImage(image.imageIdentifier, "reject")}
                    type="button"
                  >
                    {isReviewing ? t.draftImageReviewing : t.rejectDraftImage}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex justify-center">
        {canLoadMore ? (
          <button
            className="rounded-lg border border-stroke-subtle px-5 py-2.5 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onLoadMore}
            type="button"
          >
            {state.isLoadingMore ? t.draftImageListLoadingMore : t.loadMoreDraftImages}
          </button>
        ) : (
          <p className="text-sm font-semibold text-text-muted">{t.allDraftImagesLoaded}</p>
        )}
      </div>
    </div>
  );
}

function DraftWikiMeta({
  isOnImage = false,
  label,
  value,
}: {
  isOnImage?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt
        className="font-semibold text-text-muted"
        style={{ color: isOnImage ? "rgba(255, 250, 244, 0.72)" : undefined }}
      >
        {label}
      </dt>
      <dd
        className="mt-1 break-words text-text-strong"
        style={{ color: isOnImage ? "rgba(255, 250, 244, 0.94)" : undefined }}
      >
        {value}
      </dd>
    </div>
  );
}

const getDraftWikiRejectionReason = (wiki: MyPageWikiListItem): string | null => {
  const reason = "rejectionReason" in wiki ? wiki.rejectionReason : null;

  return typeof reason === "string" && reason.trim() ? reason : null;
};

const getDraftWikiListMessages = (
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"],
  tab: MyPageDraftWikiActionTab,
) => {
  if (tab === "editingWikis") {
    return {
      emptyMessage: t.editingWikiListEmptyMessage,
      emptyTitle: t.editingWikiListEmptyTitle,
      loading: t.editingWikiListLoading,
      total: t.editingWikiListTotal,
    };
  }

  if (tab === "submittedWikis") {
    return {
      emptyMessage: t.submittedWikiListEmptyMessage,
      emptyTitle: t.submittedWikiListEmptyTitle,
      loading: t.submittedWikiListLoading,
      total: t.submittedWikiListTotal,
    };
  }

  if (tab === "approvedWikis") {
    return {
      emptyMessage: t.approvedWikiListEmptyMessage,
      emptyTitle: t.approvedWikiListEmptyTitle,
      loading: t.approvedWikiListLoading,
      total: t.approvedWikiListTotal,
    };
  }

  if (tab === "untranslatedWikis") {
    return {
      emptyMessage: t.untranslatedWikiListEmptyMessage,
      emptyTitle: t.untranslatedWikiListEmptyTitle,
      loading: t.untranslatedWikiListLoading,
      total: t.untranslatedWikiListTotal,
    };
  }

  return {
    emptyMessage: t.unapprovedWikiListEmptyMessage,
    emptyTitle: t.unapprovedWikiListEmptyTitle,
    loading: t.unapprovedWikiListLoading,
    total: t.unapprovedWikiListTotal,
  };
};

const isDraftWikiListItem = (wiki: MyPageWikiListItem): wiki is WikiDraftWiki =>
  ["approved", "pending", "rejected", "under_review"].includes(
    typeof (wiki as { status?: unknown }).status === "string"
      ? (wiki as { status: string }).status
      : "",
  );

const isDeletableDraftWiki = (
  wiki: MyPageWikiListItem,
  tab: MyPageDraftWikiActionTab,
): wiki is WikiDraftWiki =>
  tab === "editingWikis" &&
  isDraftWikiListItem(wiki) &&
  (wiki.status === "pending" || wiki.status === "rejected");

const getDraftWikiHref = (wiki: MyPageWikiListItem, tab: MyPageDraftWikiActionTab): string =>
  tab === "untranslatedWikis"
    ? `/wiki/${encodeURIComponent(wiki.language)}/${encodeURIComponent(wiki.slug)}`
    : `/wiki/${encodeURIComponent(wiki.language)}/${encodeURIComponent(wiki.slug)}/edit`;

const getDraftWikiDiffHref = (wiki: MyPageWikiListItem): string =>
  `/wiki/diff/${encodeURIComponent(wiki.wikiIdentifier)}?resourceType=${encodeURIComponent(wiki.resourceType)}`;

const buildDraftWikiCardStyle = (wiki: MyPageWikiListItem): CSSProperties | undefined => {
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

const getDraftWikiResourceLabel = (
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"],
  resourceType: string,
): string => (t.draftWikiResourceLabels as Record<string, string>)[resourceType] ?? resourceType;

const getDraftWikiStatusLabel = (
  t: ReturnType<typeof useI18n>["dictionary"]["mypage"],
  status: WikiDraftWiki["status"],
): string => (t.draftWikiStatusLabels as Record<string, string>)[status] ?? status;

const formatDraftDate = (value: string | null, locale: Locale): string => {
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

function DraftImageMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-semibold text-text-muted">{label}</dt>
      <dd className="mt-1 break-all text-text-strong">{value}</dd>
    </div>
  );
}

function DraftImageSourceNameMeta({
  label,
  sourceName,
  sourceUrl,
}: {
  label: string;
  sourceName: string;
  sourceUrl: string;
}) {
  const safeSourceUrl = isSafeWikiSourceUrl(sourceUrl) ? sourceUrl : null;

  return (
    <div className="min-w-0">
      <dt className="font-semibold text-text-muted">{label}</dt>
      <dd className="mt-1 break-all text-text-strong">
        {safeSourceUrl ? (
          <a
            className="text-brand-primary underline underline-offset-4"
            href={safeSourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            {sourceName}
          </a>
        ) : (
          sourceName
        )}
      </dd>
    </div>
  );
}

function DraftImageWikiMeta({
  href,
  label,
  name,
}: {
  href: string;
  label: string;
  name: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-semibold text-text-muted">{label}</dt>
      <dd className="mt-1 break-all text-text-strong">
        <a className="text-brand-primary underline underline-offset-4" href={href}>
          {name}
        </a>
      </dd>
    </div>
  );
}

const getDraftImageWikiDisplay = (
  image: WikiDraftImage,
  locale: Locale,
): { href: string; name: string } => {
  const fallbackLanguages = [locale, "ja", "en", "ko"];
  const language =
    fallbackLanguages.find((candidate) => image.wiki.names[candidate]?.trim()) ?? locale;
  const wikiName = image.wiki.names[language]?.trim() || image.wiki.slug;

  return {
    href: buildWikiPath(language, image.wiki.slug),
    name: `${wikiName}（${language}）`,
  };
};
