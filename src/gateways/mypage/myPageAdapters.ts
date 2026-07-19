import type {
  approveWikiDraftImage,
  approveWikiImageDeletionRequest,
  fetchWikiDraftImages,
  fetchWikiImageDeletionRequests,
  rejectWikiDraftImage,
  rejectWikiImageDeletionRequest,
} from "../wiki/wikiImageBrowserApi";
import type {
  approveWikiDraft,
  deleteWikiDraft,
  fetchManagedWikiDraftWikis,
  fetchMyWikiDraftWikis,
  fetchVersionInconsistentWikis,
  publishWikiDraft,
  rejectWikiDraft,
  translateWikiDraft,
  withdrawWikiDraft,
} from "../wiki/draftWiki";
import type {
  createWikiPrincipal,
  getCurrentWikiPrincipal,
} from "../wiki/wikiPrincipal";

export type MyPagePrincipalAdapter = {
  createPrincipal: typeof createWikiPrincipal;
  getCurrentPrincipal: typeof getCurrentWikiPrincipal;
};

export type MyPageDraftImageAdapter = {
  approveDraftImage: typeof approveWikiDraftImage;
  approveImageDeletionRequest: typeof approveWikiImageDeletionRequest;
  listDraftImages: typeof fetchWikiDraftImages;
  listImageDeletionRequests: typeof fetchWikiImageDeletionRequests;
  rejectDraftImage: typeof rejectWikiDraftImage;
  rejectImageDeletionRequest: typeof rejectWikiImageDeletionRequest;
};

export type MyPageDraftWikiAdapter = {
  approveDraftWiki: typeof approveWikiDraft;
  deleteDraftWiki: typeof deleteWikiDraft;
  listManagedDraftWikis: typeof fetchManagedWikiDraftWikis;
  listMyDraftWikis: typeof fetchMyWikiDraftWikis;
  listUntranslatedWikis: typeof fetchVersionInconsistentWikis;
  publishDraftWiki: typeof publishWikiDraft;
  rejectDraftWiki: typeof rejectWikiDraft;
  translateDraftWiki: typeof translateWikiDraft;
  withdrawDraftWiki: typeof withdrawWikiDraft;
};
