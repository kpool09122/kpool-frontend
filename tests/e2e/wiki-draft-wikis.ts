import type { Page } from "./fixtures";
import { createMockEditingDraftWiki } from "@/gateways/wiki/mockWikiGateway";
import type { WikiDraftWikiListResponse } from "@/gateways/wiki/draftWiki";

/** Match the mock server's editing list when the browser revalidates it. */
export async function mockEditingDraftWikiList(page: Page) {
  await page.route("**/api/wiki/my/draft-wikis?**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const wiki = createMockEditingDraftWiki();
    const wikis = params.getAll("statuses[]").includes(wiki.status) && !params.has("cursor") ? [wiki] : [];
    const response: WikiDraftWikiListResponse = {
      wikis,
      next_cursor: null,
      total: wikis.length,
      per_page: 12,
    };
    return route.fulfill({ json: response });
  });
}
