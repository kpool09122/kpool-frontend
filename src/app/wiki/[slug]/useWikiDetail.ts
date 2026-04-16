import { getWikiDetailState, type WikiDetailState } from "@kpool/wiki";

type UseWikiDetailOptions = {
  themeColor?: string;
};

export const useWikiDetail = (
  slug: string,
  options?: UseWikiDetailOptions,
): WikiDetailState => getWikiDetailState(slug, options);
