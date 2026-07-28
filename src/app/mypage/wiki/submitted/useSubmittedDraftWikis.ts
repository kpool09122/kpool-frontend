import { useMyPageDraftWikiList } from "../../useMyPageDraftWikis";

type SubmittedDraftWikisParams = Omit<
  Parameters<typeof useMyPageDraftWikiList>[0],
  "tab"
>;

export const useSubmittedDraftWikis = (params: SubmittedDraftWikisParams) =>
  useMyPageDraftWikiList({ ...params, tab: "submittedWikis" });
