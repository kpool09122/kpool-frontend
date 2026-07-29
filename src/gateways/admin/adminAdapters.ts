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

export type AdminPrincipalAdapter = {
  createPrincipal: typeof createWikiPrincipal;
  getCurrentPrincipal: typeof getCurrentWikiPrincipal;
};

export type AdminDraftImageAdapter = {
  approveDraftImage: typeof approveWikiDraftImage;
  approveImageDeletionRequest: typeof approveWikiImageDeletionRequest;
  listDraftImages: typeof fetchWikiDraftImages;
  listImageDeletionRequests: typeof fetchWikiImageDeletionRequests;
  rejectDraftImage: typeof rejectWikiDraftImage;
  rejectImageDeletionRequest: typeof rejectWikiImageDeletionRequest;
};

export type AdminDraftWikiAdapter = {
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
