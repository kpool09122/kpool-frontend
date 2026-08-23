"use client";

import Link from "next/link";

import { buildWikiPath } from "@kpool/wiki";
import type { OfficialCertificationAction, OfficialCertificationListItem } from "@/gateways/wiki/officialCertification";
import type { useI18n } from "../../../../../i18n/I18nProvider";
import type { Locale } from "../../../../../i18n/locales";
import { useAdmin } from "../../../AdminProvider";
import { formatDraftDate } from "../../WikiContentClient";
import { useWikiSection } from "../../WikiSectionProvider";
import { useOfficialCertificationReviews, type OfficialCertificationReviewListState } from "./useOfficialCertificationReviews";

type AdminDictionary = ReturnType<typeof useI18n>["dictionary"]["admin"];

const statusErrorClassName =
  "rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800";
const statusSuccessClassName =
  "rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800";

const getOfficialCertificationReviewSuccessMessage = (
  t: AdminDictionary,
  action: OfficialCertificationAction,
): string =>
  action === "approve"
    ? t.officialCertificationApproveSucceeded
    : t.officialCertificationRejectSucceeded;

export function OfficialCertificationReviewClient() {
  const { currentIdentity, locale, t } = useAdmin();
  const { officialCertificationAdapter } = useWikiSection();
  const {
    loadOfficialCertificationsPage,
    officialCertifications,
    reviewError,
    reviewOfficialCertification,
    reviewingCertificationIdentifier,
    reviewSuccess,
  } = useOfficialCertificationReviews({
    adapter: officialCertificationAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    messages: {
      officialCertificationApproveFailed: t.officialCertificationApproveFailed,
      officialCertificationListLoadFailed: t.officialCertificationListLoadFailed,
      officialCertificationRejectFailed: t.officialCertificationRejectFailed,
    },
  });

  return (
    <section className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-soft">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-strong">{t.officialCertificationReviewTitle}</h2>
        <p className="text-sm leading-7 text-text-muted">{t.officialCertificationReviewDescription}</p>
      </div>
      <OfficialCertificationReviewListPanel
        locale={locale}
        reviewError={reviewError}
        reviewSuccess={reviewSuccess}
        reviewingCertificationIdentifier={reviewingCertificationIdentifier}
        state={officialCertifications}
        t={t}
        onLoadMore={() => {
          if (officialCertifications.pageInfo) {
            loadOfficialCertificationsPage(officialCertifications.pageInfo.current_page + 1);
          }
        }}
        onReload={() => loadOfficialCertificationsPage(1)}
        onReviewOfficialCertification={reviewOfficialCertification}
      />
    </section>
  );
}

function OfficialCertificationReviewListPanel({
  locale,
  reviewError,
  reviewSuccess,
  reviewingCertificationIdentifier,
  state,
  t,
  onLoadMore,
  onReload,
  onReviewOfficialCertification,
}: {
  locale: Locale;
  reviewError: string | null;
  reviewSuccess: OfficialCertificationAction | null;
  reviewingCertificationIdentifier: string | null;
  state: OfficialCertificationReviewListState;
  t: AdminDictionary;
  onLoadMore: () => void;
  onReload: () => void;
  onReviewOfficialCertification: (certificationIdentifier: string, action: "approve" | "reject") => void;
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
          {t.reloadOfficialCertifications}
        </button>
      </div>
    );
  }

  if (state.isInitialLoading) {
    return (
      <div className="mt-5 grid min-h-40 place-items-center rounded-lg border border-dashed border-stroke-subtle text-sm font-semibold text-text-muted">
        {t.officialCertificationListLoading}
      </div>
    );
  }

  const statusMessages = (
    <>
      {reviewError ? <p role="alert" className={statusErrorClassName}>{reviewError}</p> : null}
      {reviewSuccess ? (
        <p role="status" className={statusSuccessClassName}>
          {getOfficialCertificationReviewSuccessMessage(t, reviewSuccess)}
        </p>
      ) : null}
    </>
  );

  if (state.officialCertifications.length === 0) {
    return (
      <div className="mt-5 space-y-4">
        {statusMessages}
        <div className="rounded-lg border border-dashed border-stroke-subtle p-6 text-center">
          <p className="font-semibold">{t.officialCertificationListEmptyTitle}</p>
          <p className="mt-2 text-sm text-text-muted">{t.officialCertificationListEmptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {state.pageInfo ? (
        <p className="text-sm font-semibold text-text-muted">
          {t.officialCertificationListTotal(state.pageInfo.total)}
        </p>
      ) : null}
      {statusMessages}
      <div className="grid gap-4 lg:grid-cols-2">
        {state.officialCertifications.map((certification) => (
          <OfficialCertificationReviewCard
            certification={certification}
            isReviewing={reviewingCertificationIdentifier === certification.certificationIdentifier}
            key={certification.certificationIdentifier}
            locale={locale}
            t={t}
            onReviewOfficialCertification={onReviewOfficialCertification}
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
            {state.isLoadingMore ? t.officialCertificationListLoadingMore : t.loadMoreOfficialCertifications}
          </button>
        ) : (
          <p className="text-sm font-semibold text-text-muted">{t.allOfficialCertificationsLoaded}</p>
        )}
      </div>
    </div>
  );
}

function OfficialCertificationReviewCard({
  certification,
  isReviewing,
  locale,
  t,
  onReviewOfficialCertification,
}: {
  certification: OfficialCertificationListItem;
  isReviewing: boolean;
  locale: Locale;
  t: AdminDictionary;
  onReviewOfficialCertification: (certificationIdentifier: string, action: "approve" | "reject") => void;
}) {
  const ownerAccount = certification.ownerAccount;

  return (
    <article className="rounded-lg border border-stroke-subtle bg-surface-base p-4 text-sm">
      <div className="space-y-2">
        <OfficialCertificationWikiLinks
          locale={locale}
          t={t}
          wikis={certification.wikis}
        />
      </div>
      <dl className="mt-4 grid gap-3">
        <OfficialCertificationMeta label={t.officialCertificationResourceTypeLabel} value={certification.resourceType} />
        <OfficialCertificationMeta
          label={t.officialCertificationRequestedAtLabel}
          value={formatDraftDate(certification.requestedAt, locale)}
        />
        {ownerAccount ? (
          <>
            <OfficialCertificationMeta
              label={t.officialCertificationOwnerAccountNameLabel}
              value={ownerAccount.name}
            />
            <OfficialCertificationMeta
              label={t.officialCertificationOwnerAccountCategoryLabel}
              value={getAccountCategoryLabel(t.accountCategoryLabels, ownerAccount.category)}
            />
            <OfficialCertificationMeta
              label={t.officialCertificationOwnerAccountEmailLabel}
              value={ownerAccount.email}
            />
          </>
        ) : (
          <OfficialCertificationMeta
            label={t.officialCertificationOwnerAccountLabel}
            value={t.officialCertificationUnknownOwner}
          />
        )}
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isReviewing}
          onClick={() => onReviewOfficialCertification(certification.certificationIdentifier, "approve")}
          type="button"
        >
          {isReviewing ? t.officialCertificationReviewing : t.officialCertificationApprove}
        </button>
        <button
          className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isReviewing}
          onClick={() => onReviewOfficialCertification(certification.certificationIdentifier, "reject")}
          type="button"
        >
          {isReviewing ? t.officialCertificationReviewing : t.officialCertificationReject}
        </button>
      </div>
    </article>
  );
}

function OfficialCertificationWikiLinks({
  locale,
  t,
  wikis,
}: {
  locale: Locale;
  t: AdminDictionary;
  wikis: OfficialCertificationListItem["wikis"];
}) {
  if (wikis.length === 0) {
    return (
      <h3 className="break-words text-lg font-semibold text-text-strong">
        {t.officialCertificationWikiLabel}
      </h3>
    );
  }

  const displayWiki = wikis.find((wiki) => wiki.language === locale) ?? wikis[0];
  const displayName = displayWiki.name || displayWiki.slug;

  return (
    <h3 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lg font-semibold text-text-strong">
      <span className="break-words">{displayName}</span>
      <span className="flex flex-wrap gap-1 text-base text-text-muted">
        <span aria-hidden="true">(</span>
        {wikis.map((wiki, index) => {
          const language = wiki.language || locale;

          return (
            <span className="flex gap-1" key={wiki.wikiIdentifier}>
              {index > 0 ? <span aria-hidden="true">,</span> : null}
              <Link
                className="text-brand-primary transition hover:brightness-110"
                href={buildWikiPath(language, wiki.slug)}
                rel="noopener noreferrer"
                target="_blank"
              >
                {language}
              </Link>
            </span>
          );
        })}
        <span aria-hidden="true">)</span>
      </span>
    </h3>
  );
}

function getAccountCategoryLabel(
  labels: AdminDictionary["accountCategoryLabels"],
  category: string,
): string {
  return labels[category as keyof typeof labels] ?? category;
}

function OfficialCertificationMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-semibold text-text-muted">{label}</dt>
      <dd className="break-words text-text-strong">{value}</dd>
    </div>
  );
}
