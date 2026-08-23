import { describe, expect, it } from "vitest";

import { createOfficialCertificationRequestBody } from "./officialCertification";

describe("officialCertification", () => {
  it("creates request bodies with translationSetIdentifier instead of wikiId", () => {
    expect(
      createOfficialCertificationRequestBody({
        resourceType: "agency",
        translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
        wikiId: "22222222-2222-4222-8222-222222222222",
        ownerAccountId: "33333333-3333-4333-8333-333333333333",
      }),
    ).toEqual({
      resourceType: "agency",
      translationSetIdentifier: "11111111-1111-4111-8111-111111111111",
    });
  });
});
