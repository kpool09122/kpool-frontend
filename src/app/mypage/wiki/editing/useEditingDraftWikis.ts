import { useMyPageDraftWikiList } from "../../useMyPageDraftWikis";

type EditingDraftWikisParams = Omit<
  Parameters<typeof useMyPageDraftWikiList>[0],
  "tab"
>;

export const useEditingDraftWikis = (params: EditingDraftWikisParams) =>
  useMyPageDraftWikiList({ ...params, tab: "editingWikis" });
