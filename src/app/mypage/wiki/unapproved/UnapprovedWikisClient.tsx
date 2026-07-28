"use client";

import { useState } from "react";

import type { WikiDraftWorkflowAction } from "@/gateways/wiki/draftWiki";
import { useMypage } from "../../MypageProvider";
import type { MyPageWikiListItem } from "../../useMyPageDraftWikis";
import { useUnapprovedDraftWikis } from "../../useMyPageDraftWikis";
import { DraftWikiListPanel, RejectDraftWikiDialog } from "../WikiContentClient";
import { useWikiSection } from "../WikiSectionProvider";

type RejectDraftWikiDialogState = {
  isOpen: boolean;
  reason: string;
  wiki: MyPageWikiListItem | null;
};

export function UnapprovedWikisClient() {
  const tab = "unapprovedWikis";
  const { currentIdentity, initialDraftWikis, locale, t } = useMypage();
  const { draftWikiAdapter } = useWikiSection();
  const [rejectDialog, setRejectDialog] = useState<RejectDraftWikiDialogState>({
    isOpen: false,
    reason: "",
    wiki: null,
  });
  const {
    deleteDraftWiki,
    deletingWikiIdentifier,
    draftWiki,
    loadDraftWikisPage,
    reviewDraftWiki,
    reviewError,
    reviewingWikiIdentifier,
    withdrawDraftWiki,
  } = useUnapprovedDraftWikis({
    adapter: draftWikiAdapter,
    identityIdentifier: currentIdentity?.identityIdentifier ?? null,
    initialDraftWiki: initialDraftWikis.unapprovedWikis,
    messages: {
      draftWikiApproveFailed: t.draftWikiApproveFailed,
      draftWikiDeleteFailed: t.draftWikiDeleteFailed,
      draftWikiListLoadFailed: t.draftWikiListLoadFailed,
      draftWikiPublishFailed: t.draftWikiPublishFailed,
      draftWikiRejectFailed: t.draftWikiRejectFailed,
      draftWikiTranslateFailed: t.draftWikiTranslateFailed,
      draftWikiWithdrawFailed: t.draftWikiWithdrawFailed,
    },
  });

  const closeRejectDialog = () => {
    if (reviewingWikiIdentifier) {
      return;
    }

    setRejectDialog({
      isOpen: false,
      reason: "",
      wiki: null,
    });
  };

  const submitRejectDialog = (reason: string) => {
    const wiki = rejectDialog.wiki;

    if (!wiki) {
      return;
    }

    reviewDraftWiki(wiki, "reject", reason);
    setRejectDialog({
      isOpen: false,
      reason: "",
      wiki: null,
    });
  };

  const handleReviewDraftWiki = (
    wiki: MyPageWikiListItem,
    action: WikiDraftWorkflowAction,
  ) => {
    if (action === "reject") {
      setRejectDialog({
        isOpen: true,
        reason: "",
        wiki,
      });
      return;
    }

    reviewDraftWiki(wiki, action);
  };

  return (
    <>
      <DraftWikiListPanel
        deletingWikiIdentifier={deletingWikiIdentifier}
        locale={locale}
        reviewError={reviewError}
        reviewingWikiIdentifier={reviewingWikiIdentifier}
        state={draftWiki}
        t={t}
        tab={tab}
        onLoadMore={() => {
          if (draftWiki.pageInfo) {
            loadDraftWikisPage(draftWiki.pageInfo.current_page + 1);
          }
        }}
        onReload={() => loadDraftWikisPage(1)}
        onDeleteDraftWiki={(wiki) => {
          if (window.confirm(t.deleteDraftWikiConfirm)) {
            deleteDraftWiki(wiki);
          }
        }}
        onReviewDraftWiki={handleReviewDraftWiki}
        onWithdrawDraftWiki={withdrawDraftWiki}
      />
      <RejectDraftWikiDialog
        isOpen={rejectDialog.isOpen}
        isSubmitting={Boolean(reviewingWikiIdentifier)}
        t={t}
        onClose={closeRejectDialog}
        onSubmit={submitRejectDialog}
      />
    </>
  );
}
