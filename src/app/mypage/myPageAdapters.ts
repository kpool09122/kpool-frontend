import type {
  approveWikiDraftImage,
  fetchWikiDraftImages,
  rejectWikiDraftImage,
} from "../wiki/wikiImageBrowserApi";
import type {
  approveWikiDraft,
  fetchWikiDraftWikis,
  rejectWikiDraft,
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
  listDraftWikis: typeof fetchWikiDraftWikis;
  rejectDraftWiki: typeof rejectWikiDraft;
};
