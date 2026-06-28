import { createMyWikiDraftWikisUrl } from "@/gateways/wiki/draftWiki";
import { createDraftWikiListRouteGetHandler } from "../../draft-wikis/draftWikisRouteSupport";

export const GET = createDraftWikiListRouteGetHandler(
  createMyWikiDraftWikisUrl,
  "My wiki draft wikis",
  "my wiki draft wiki list response",
);
