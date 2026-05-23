import { withWikiApiPrefix } from "@kpool/wiki";

export const getWikiImageApiBaseUrl = (): string =>
  process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL
    ? withWikiApiPrefix(process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL)
    : "";
