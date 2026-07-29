"use client";

import { useAdmin } from "../../AdminProvider";
import type { AdminWikiListItem } from "../../useAdminDraftWikis";
import {
  WikiListCard,
  WikiListCardActionButton,
  WikiListPanel,
} from "../../../../components/Wiki";
import {
  buildDraftWikiListCardStyle,
  DraftWikiRejectionReasonButton,
  getDraftWikiListCardHref,
  getDraftWikiListCardMeta,
  getDraftWikiRejectionReason,
  getDraftWikiResourceLabel,
} from "../WikiContentClient";
import { useWikiSection } from "../WikiSectionProvider";
import { useEditingDraftWikis } from "./useEditingDraftWikis";

export function EditingWikisClient() {
  const tab = "editingWikis";
  const { currentIdentity, initialDraftWikis, locale, t } = useAdmin();
  const { draftWikiAdapter } = useWikiSection();
  const {
    deleteDraftWiki,
    deletingWikiIdentifier,
    draftWiki,
    loadDraftWikisPage,
    reviewError
  } = useEditingDraftWikis({
    adapter: draftWikiAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialDraftWiki: initialDraftWikis.editingWikis,
    messages: {
      draftWikiDeleteFailed: t.draftWikiDeleteFailed,
      draftWikiListLoadFailed: t.draftWikiListLoadFailed,
    },
  });
  const canLoadMore = draftWiki.pageInfo
    ? draftWiki.pageInfo.current_page < draftWiki.pageInfo.last_page
    : false;

  return (
    <WikiListPanel
      allLoadedLabel={t.allDraftWikisLoaded}
      canLoadMore={canLoadMore}
      emptyMessage={t.editingWikiListEmptyMessage}
      emptyTitle={t.editingWikiListEmptyTitle}
      isEmpty={draftWiki.wikis.length === 0}
      isInitialLoading={draftWiki.isInitialLoading}
      isLoadingMore={draftWiki.isLoadingMore}
      loadError={draftWiki.loadError}
      loadingLabel={t.editingWikiListLoading}
      loadingMoreLabel={t.draftWikiListLoadingMore}
      loadMoreLabel={t.loadMoreDraftWikis}
      reloadLabel={t.reloadDraftWikis}
      reviewError={reviewError}
      totalLabel={draftWiki.pageInfo ? t.editingWikiListTotal(draftWiki.pageInfo.total) : null}
      onLoadMore={() => {
        if (draftWiki.pageInfo) {
          loadDraftWikisPage(draftWiki.pageInfo.current_page + 1);
        }
      }}
      onReload={() => loadDraftWikisPage(1)}
    >
      {draftWiki.wikis.map((wiki) => {
        const isOnImage = wiki.isHidden !== true && Boolean(wiki.imageUrl);
        const style = buildDraftWikiListCardStyle(wiki);

        return (
          <WikiListCard
            actions={
              <EditingWikiActions
                isDeleting={deletingWikiIdentifier === wiki.wikiIdentifier}
                wiki={wiki}
                onDelete={() => {
                  if (window.confirm(t.deleteDraftWikiConfirm)) {
                    deleteDraftWiki(wiki);
                  }
                }}
              />
            }
            badgeLabel={getDraftWikiResourceLabel(t, wiki.resourceType)}
            hasTheme={!isOnImage && Boolean(style)}
            headerActions={
              <DraftWikiRejectionReasonButton
                reason={getDraftWikiRejectionReason(wiki)}
                t={t}
              />
            }
            href={getDraftWikiListCardHref(wiki, tab)}
            isOnImage={isOnImage}
            key={wiki.wikiIdentifier}
            meta={getDraftWikiListCardMeta({ locale, t, wiki })}
            style={style}
            subtitle={wiki.language}
            title={wiki.name}
          />
        );
      })}
    </WikiListPanel>
  );
}

function EditingWikiActions({
  isDeleting,
  wiki,
  onDelete,
}: {
  isDeleting: boolean;
  wiki: AdminWikiListItem;
  onDelete: () => void;
}) {
  const { t } = useAdmin();

  if (!isEditableDraftWiki(wiki)) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <WikiListCardActionButton
        disabled={isDeleting}
        onClick={onDelete}
        variant="danger"
      >
        {isDeleting ? t.draftWikiDeleting : t.deleteDraftWiki}
      </WikiListCardActionButton>
    </div>
  );
}

const isEditableDraftWiki = (wiki: AdminWikiListItem): boolean =>
  "status" in wiki && (wiki.status === "pending" || wiki.status === "rejected");
