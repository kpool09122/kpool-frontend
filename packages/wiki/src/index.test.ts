import { describe, expect, it } from "vitest";

import * as wikiPublicApi from "./index";

describe("wiki public API", () => {
  it("does not expose route-only related profile failure messages", () => {
    expect("wikiRelatedProfilesUnavailableMessage" in wikiPublicApi).toBe(false);
  });

  it("does not expose route-only image error helpers", () => {
    expect("getWikiImageErrorMessage" in wikiPublicApi).toBe(false);
  });
});
