import type { WikiSection, WikiSectionContent } from "./types/wiki";
import { isWikiSection } from "./wikiSectionModel";

const signature = (content: WikiSectionContent): string =>
  JSON.stringify(content, (key, value: unknown) => {
    if (["sectionKey", "blockKey", "displayOrder", "depth"].includes(key)) return undefined;
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
      : value;
  });

const kind = (content: WikiSectionContent): string =>
  isWikiSection(content) ? "section" : content.blockType;

/** Preserve keys of identifiable nodes after parsing edited wiki code. */
export const preserveWikiContentKeys = (
  sections: WikiSection[],
  previous: WikiSection[],
): WikiSection[] => {
  const reconcile = (
    current: WikiSectionContent[],
    before: WikiSectionContent[],
  ): WikiSectionContent[] => {
    const matches = new Map<number, number>();
    const used = new Set<number>();
    const matchUnique = (key: (node: WikiSectionContent) => string, preserveIdentical = false) => {
      const currentGroups = new Map<string, number[]>();
      const previousGroups = new Map<string, number[]>();
      current.forEach((node, index) => {
        if (matches.has(index)) return;
        const value = key(node);
        currentGroups.set(value, [...(currentGroups.get(value) ?? []), index]);
      });
      before.forEach((node, index) => {
        if (used.has(index)) return;
        const value = key(node);
        previousGroups.set(value, [...(previousGroups.get(value) ?? []), index]);
      });
      for (const [value, indices] of currentGroups) {
        const candidates = previousGroups.get(value) ?? [];
        // Identical code occurrences retain their order when the number of occurrences is unchanged.
        if ((indices.length === 1 || preserveIdentical) && indices.length === candidates.length) {
          indices.forEach((index, occurrence) => {
            matches.set(index, candidates[occurrence]);
            used.add(candidates[occurrence]);
          });
        }
      }
    };
    matchUnique(signature, true);
    matchUnique((node) => isWikiSection(node) ? `section:${node.title}` : `block:${signature(node)}`);
    matchUnique(kind);

    return current.map((node, index) => {
      const previousIndex = matches.get(index);
      const original = previousIndex === undefined ? undefined : before[previousIndex];
      if (isWikiSection(node)) {
        const originalSection = original && isWikiSection(original) ? original : undefined;
        return {
          ...node,
          sectionKey: originalSection?.sectionKey ?? node.sectionKey,
          contents: reconcile(node.contents, originalSection?.contents ?? []),
        };
      }
      return original && !isWikiSection(original)
        ? { ...node, blockKey: original.blockKey }
        : node;
    });
  };
  return reconcile(sections, previous).filter(isWikiSection);
};
