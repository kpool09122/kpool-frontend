import { describe, expect, it } from "vitest";
import { createMockWikiDetail } from "./mockWikiDetail";
import { buildWikiMaterialSearchContext } from "./wikiMaterialSearchModel";

describe("material search context", () => {
  it("uses current edited title, related names and user language rather than Wiki language", () => {
    const draft = createMockWikiDetail("gr-aurora-echo");
    const result = buildWikiMaterialSearchContext(
      {
        ...draft,
        title: "Edited",
        basic: {
          ...draft.basic,
          agencyIdentifier: "agency",
          agency: { wikiIdentifier: "agency", name: "Edited agency" },
          talents: [{ wikiIdentifier: "member", name: "Member" }],
          talentIdentifiers: ["member"],
        },
      },
      "ko",
    );
    expect(result).toMatchObject({
      title: "Edited",
      resourceType: "group",
      language: "ko",
      relatedWikis: [
        {
          identifier: "agency",
          title: "Edited agency",
          resourceType: "agency",
          relationType: "agency",
        },
        {
          identifier: "member",
          title: "Member",
          resourceType: "talent",
          relationType: "talents",
        },
      ],
    });
  });
  it("falls back to display name and honors explicitly removed relations", () => {
    const draft = createMockWikiDetail("gr-aurora-echo");
    expect(
      buildWikiMaterialSearchContext(
        {
          ...draft,
          title: "  ",
          basic: {
            ...draft.basic,
            name: "Fallback",
            agency: null,
            agencyIdentifier: null,
            groups: [],
            talents: [],
            talentIdentifiers: [],
          },
        },
        "en",
      ),
    ).toMatchObject({ title: "Fallback", relatedWikis: [] });
  });
});
