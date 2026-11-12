import type { WikiProfileCardShape } from "@kpool/wiki";

export const profileCardAspectClasses = {
  portrait: "aspect-[2/3]",
  square: "aspect-square",
  landscape: "aspect-video",
} satisfies Record<WikiProfileCardShape, string>;

export const profileCardGridClasses = {
  portrait: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  square: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  landscape: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
} satisfies Record<WikiProfileCardShape, string>;
