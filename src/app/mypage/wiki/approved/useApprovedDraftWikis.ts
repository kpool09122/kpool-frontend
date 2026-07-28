import { useMyPageDraftWikiList } from "../../useMyPageDraftWikis";

type ApprovedDraftWikisParams = Omit<
  Parameters<typeof useMyPageDraftWikiList>[0],
  "tab"
>;

export const useApprovedDraftWikis = (params: ApprovedDraftWikisParams) =>
  useMyPageDraftWikiList({ ...params, tab: "approvedWikis" });
