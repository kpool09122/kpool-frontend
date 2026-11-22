import { describe, expect, it, vi } from "vitest";
import { adaptDraftWikiApiResponse, adaptWikiApiResponse, getWikiBasicFields, toWikiEditRequestPayload } from "@kpool/wiki";

import { withParentAgency } from "./parentAgency";
import { fetchPublicWiki } from "./publicWiki";

const identifier = "11111111-1111-4111-8111-111111111111";
const response = {
  wikiIdentifier: "child", translationSetIdentifier: "child-set", slug: "ag-bighit",
  resourceType: "agency", language: "ko", version: 1, status: "editing", sections: [],
  basic: { name: "BIGHIT MUSIC", normalizedName: "bighit", parentAgencyIdentifier: identifier },
};
const parent = {
  wikiIdentifier: identifier, slug: "ag-hybe", language: "ko", resourceType: "agency" as const,
  name: "HYBE", normalizedName: "hybe", version: 1, imageIdentifier: null, imageUrl: null, imageAltText: null,
};
const page = (wikis: typeof parent[], lastPage = 1) => ({
  wikis, current_page: 1, last_page: lastPage, total: wikis.length, per_page: 100,
});

describe("parent agency loading", () => {
  it("restores the parent name and link on public and draft reads and retains the ID for saving", async () => {
    for (const wiki of [adaptWikiApiResponse(response), adaptDraftWikiApiResponse(response)]) {
      const fetchWikiList = vi.fn().mockResolvedValueOnce(page([], 2)).mockResolvedValueOnce(page([parent], 2));
      const loaded = await withParentAgency(wiki, { fetchWikiList });
      expect(fetchWikiList).toHaveBeenLastCalledWith("ko", {
        resourceType: "agency", perPage: 100, page: 2, sort: "name", order: "asc",
      });
      expect(loaded.basic).toMatchObject({ parentAgencyIdentifier: identifier, parentAgency: { name: "HYBE", slug: "ag-hybe" } });
      expect(getWikiBasicFields(loaded.basic)).toContainEqual(expect.objectContaining({
        label: "Parent Company", value: "HYBE", links: [expect.objectContaining({ href: "/ko/wiki/ag-hybe", label: "HYBE" })],
      }));
    }
    const draft = await withParentAgency(adaptDraftWikiApiResponse(response), { fetchWikiList: vi.fn().mockResolvedValue(page([parent])) });
    expect(toWikiEditRequestPayload(draft).basic.parentAgencyIdentifier).toBe(identifier);
  });

  it("resolves the parent when loading a public agency page", async () => {
    const wiki = await fetchPublicWiki({
      fetchWiki: vi.fn().mockResolvedValue(response),
      fetchWikiList: vi.fn().mockResolvedValue(page([parent])),
    }, "ko", "ag-bighit");
    expect(wiki?.basic.parentAgency?.name).toBe("HYBE");
  });

  it("keeps a missing or unavailable parent ID without breaking the wiki", async () => {
    const wiki = adaptDraftWikiApiResponse(response);
    expect(await withParentAgency(wiki, { fetchWikiList: vi.fn().mockResolvedValue(page([])) })).toBe(wiki);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await withParentAgency(wiki, { fetchWikiList: vi.fn().mockRejectedValue(new Error("offline")) })).toBe(wiki);
      expect(wiki.basic.parentAgencyIdentifier).toBe(identifier);
    } finally { log.mockRestore(); }
  });

  it("skips lookup when no parent is configured or the wiki is not an agency", async () => {
    const fetchWikiList = vi.fn();
    const wiki = adaptWikiApiResponse({ ...response, basic: { ...response.basic, parentAgencyIdentifier: null } });
    expect(await withParentAgency(wiki, { fetchWikiList })).toBe(wiki);
    await withParentAgency(adaptWikiApiResponse({ ...response, resourceType: "group", slug: "gr-bighit" }), { fetchWikiList });
    expect(fetchWikiList).not.toHaveBeenCalled();
  });
});
