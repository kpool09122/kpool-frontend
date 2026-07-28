import { useMyPageDraftWikiList } from "../../useMyPageDraftWikis";

type UnapprovedDraftWikisParams = Omit<
  Parameters<typeof useMyPageDraftWikiList>[0],
  "tab"
>;

export const useUnapprovedDraftWikis = (params: UnapprovedDraftWikisParams) =>
  useMyPageDraftWikiList({ ...params, tab: "unapprovedWikis" });
