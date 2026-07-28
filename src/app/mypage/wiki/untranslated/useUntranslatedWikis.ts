import { useMyPageDraftWikiList } from "../../useMyPageDraftWikis";

type UntranslatedWikisParams = Omit<
  Parameters<typeof useMyPageDraftWikiList>[0],
  "tab"
>;

export const useUntranslatedWikis = (params: UntranslatedWikisParams) =>
  useMyPageDraftWikiList({ ...params, tab: "untranslatedWikis" });
