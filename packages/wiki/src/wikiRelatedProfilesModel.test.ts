import { describe, expect, it } from "vitest";

import { wikiResourceTypes } from "./types/wiki";
import { getSelectableRelatedProfileResourceTypes } from "./wikiRelatedProfilesModel";

describe("wikiRelatedProfilesModel", () => {
  it("builds selectable related profile resource types from the routing contract", () => {
    expect(getSelectableRelatedProfileResourceTypes("group")).toEqual(
      wikiResourceTypes.filter((resourceType) => resourceType !== "group"),
    );
  });
});
