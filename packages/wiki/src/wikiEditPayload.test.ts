import { describe, expect, it } from "vitest";

import { createMockWikiDetail } from "./mockWikiDetail";
import { toWikiBasicInput, toWikiEditRequestPayload } from "./wikiEditPayload";

describe("Wiki basic input", () => {
  const basic = {
    name: "New Name",
    normalizedName: "old name",
    realName: "Real Name",
    normalizedRealName: "old real name",
    ceo: "CEO Name",
    normalizedCeo: "old ceo",
    lyricist: "Lyricist",
    normalizedLyricist: "old lyricist",
    composer: "Composer",
    normalizedComposer: "old composer",
    arranger: "Arranger",
    normalizedArranger: "old arranger",
    birthday: null,
    groupIdentifiers: ["group-1"],
  };

  it("keeps editable fields and excludes derived values without changing the response", () => {
    expect(toWikiBasicInput(basic)).toEqual({
      name: "New Name",
      realName: "Real Name",
      ceo: "CEO Name",
      lyricist: "Lyricist",
      composer: "Composer",
      arranger: "Arranger",
      birthday: null,
      groupIdentifiers: ["group-1"],
    });
    expect(basic.normalizedName).toBe("old name");
    expect(basic.normalizedRealName).toBe("old real name");
  });

  it("omits derived fields when saving an edited draft", () => {
    const draft = createMockWikiDetail("gr-aurora-echo");
    draft.basic = { ...draft.basic, ...basic, birthday: undefined };

    expect(toWikiEditRequestPayload(draft).basic).toEqual({
      ...toWikiBasicInput(draft.basic),
      name: "New Name",
    });
    expect(Object.keys(toWikiEditRequestPayload(draft).basic).filter((key) => key.startsWith("normalized"))).toEqual([]);
    expect(draft.basic.normalizedName).toBe("old name");
  });
});
