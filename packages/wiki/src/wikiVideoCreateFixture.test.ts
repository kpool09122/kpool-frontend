import { expect, it } from "vitest";
import { wikiPrivateApiTypes } from "@kpool/types";
import { createMockWikiDetail } from "./mockWikiDetail";
it("provides a schema-valid Wiki UUID for video creation E2E without changing legacy fixtures", () => {
  const wiki = createMockWikiDetail("gr-video-create");
  expect(
    wikiPrivateApiTypes.schemas.CreateVideoLinkRequestBody.safeParse({
      resourceType: wiki.resourceType,
      wikiIdentifier: wiki.wikiIdentifier,
      url: "https://www.youtube.com/watch?v=Os_heh8vPfs",
      title: "Video",
      videoUsage: "live",
      displayOrder: 0,
      durationSeconds: 124,
    }).success,
  ).toBe(true);
  expect(createMockWikiDetail("gr-aurora-echo").wikiIdentifier).toBe(
    "gr-aurora-echo",
  );
});
