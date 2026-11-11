import { describe, expect, it } from "vitest";
import { createMockWikiDetail } from "./mockWikiDetail";
import { adaptWikiApiResponse } from "./wikiApiModel";
import { parseWikiSectionsFromCode, serializeWikiSectionsToCode, toWikiEditRequestPayload } from "./wikiEditModel";
import type { WikiSection } from "./types/wiki";

const sections: WikiSection[] = [{
  type: "section", sectionIdentifier: "photos", title: "Photos", depth: 1, displayOrder: 1,
  contents: [
    { blockType: "image", blockIdentifier: "single", displayOrder: 1, imageIdentifier: "photo", imageSrc: "https://example.test/photo.jpg", alt: "Photo", caption: "Caption", imageWidth: 450 },
    { blockType: "image_gallery", blockIdentifier: "gallery", displayOrder: 2, images: [{ imageIdentifier: "photo", imageSrc: "https://example.test/photo.jpg", alt: "Photo" }], caption: null, imageWidth: 700 },
  ],
}];

describe("wiki image layout persistence", () => {
  it("preserves image and gallery size in code mode and save payloads", () => {
    const parsed = parseWikiSectionsFromCode(serializeWikiSectionsToCode(sections));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const payload = toWikiEditRequestPayload({ ...createMockWikiDetail("gr-aurora-echo"), sections: parsed.sections });
    expect(payload.sections[0]).toMatchObject({ contents: [{ type: "image", imageWidth: 450 }, { type: "image_gallery", imageWidth: 700 }] });
  });

  it("restores pixel widths from stored JSON and defaults existing images to automatic size", () => {
    const response = adaptWikiApiResponse({
      wikiIdentifier: "wiki", translationSetIdentifier: "translation", slug: "gr-aurora-echo", language: "ja", resourceType: "group", version: 1,
      basic: { name: "Aurora Echo", normalizedName: "aurora-echo" },
      sections: [{ type: "section", title: "Photos", display_order: 1, contents: [
        { block_type: "image", image_identifier: "photo", image_width: 450 },
        { block_type: "image_gallery", image_identifiers: ["photo"], image_width: 700 },
        { block_type: "image", image_identifier: "old-photo" },
      ] }],
    });
    expect(response.sections[0].contents).toMatchObject([{ imageWidth: 450 }, { imageWidth: 700 }, { imageWidth: null }]);
  });
});
