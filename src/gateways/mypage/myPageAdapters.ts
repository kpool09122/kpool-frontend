import type {
  approveWikiDraftImage,
  fetchWikiDraftImages,
  rejectWikiDraftImage,
} from "../wiki/wikiImageBrowserApi";
import type {
  approveWikiDraft,
  deleteWikiDraft,
  fetchVersionInconsistentWikis,
  fetchWikiDraftWikis,
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
  listDraftImages: typeof fetchWikiDraftImages;
  rejectDraftImage: typeof rejectWikiDraftImage;
};

export type MyPageDraftWikiAdapter = {
  approveDraftWiki: typeof approveWikiDraft;
  deleteDraftWiki: typeof deleteWikiDraft;
  listDraftWikis: typeof fetchWikiDraftWikis;
  listUntranslatedWikis: typeof fetchVersionInconsistentWikis;
  publishDraftWiki: typeof publishWikiDraft;
  rejectDraftWiki: typeof rejectWikiDraft;
  translateDraftWiki: typeof translateWikiDraft;
  withdrawDraftWiki: typeof withdrawWikiDraft;
};
