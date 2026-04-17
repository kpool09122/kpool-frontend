import {
  createMockWikiDetail,
  isWikiBlock,
  isWikiSection,
  sortWikiSectionContents,
  type WikiBlock,
  type WikiDetail,
  type WikiSection,
} from "@kpool/wiki";

export const wikiStoryDetail: WikiDetail = createMockWikiDetail("aurora-echo");

export const wikiStoryBasic = wikiStoryDetail.basic;
export const wikiStoryHeroImage = wikiStoryDetail.heroImage;
export const wikiStorySections = wikiStoryDetail.sections;
export const wikiStorySection = wikiStorySections[0] as WikiSection;
export const wikiStoryBlocks = sortWikiSectionContents(wikiStorySection.contents).filter(
  (content): content is WikiBlock => isWikiBlock(content),
);
export const wikiStoryChildSection = sortWikiSectionContents(wikiStorySection.contents).find(
  (content): content is WikiSection => isWikiSection(content),
) as WikiSection;

export const wikiStoryTextBlock = wikiStoryBlocks.find((block) => block.blockType === "text") as WikiBlock;
export const wikiStoryImageBlock = wikiStoryBlocks.find((block) => block.blockType === "image") as WikiBlock;
export const wikiStoryGalleryBlock = wikiStoryBlocks.find((block) => block.blockType === "image_gallery") as WikiBlock;
export const wikiStoryEmbedBlock = wikiStoryBlocks.find((block) => block.blockType === "embed") as WikiBlock;
export const wikiStoryQuoteBlock = wikiStoryBlocks.find((block) => block.blockType === "quote") as WikiBlock;
export const wikiStoryListBlock = wikiStoryBlocks.find((block) => block.blockType === "list") as WikiBlock;
export const wikiStoryTableBlock = wikiStoryBlocks.find((block) => block.blockType === "table") as WikiBlock;
export const wikiStoryProfileListBlock = wikiStoryBlocks.find(
  (block) => block.blockType === "profile_card_list",
) as WikiBlock;

export function noop(): void {}
