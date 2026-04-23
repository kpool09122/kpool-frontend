import type { WikiBasic, WikiSection } from "./types/wiki";

export type WikiBasicField = {
  label: string;
  value: string;
};

const basicFieldLabels: Array<{
  label: string;
  getValue: (basic: WikiBasic) => string | null | undefined;
}> = [
  { label: "Group Type", getValue: (basic) => basic.groupType },
  { label: "Status", getValue: (basic) => basic.status },
  { label: "Generation", getValue: (basic) => basic.generation },
  { label: "Debut Date", getValue: (basic) => basic.debutDate },
  { label: "Fandom Name", getValue: (basic) => basic.fandomName },
  { label: "Representative Symbol", getValue: (basic) => basic.representativeSymbol },
  { label: "CEO", getValue: (basic) => basic.ceo },
  { label: "Official Website", getValue: (basic) => basic.officialWebsite },
  {
    label: "Social Links",
    getValue: (basic) => basic.socialLinks?.join(", ") ?? null,
  },
  { label: "Song Type", getValue: (basic) => basic.songType },
  { label: "Genres", getValue: (basic) => basic.genres?.join(", ") ?? null },
  { label: "Release Date", getValue: (basic) => basic.releaseDate },
  { label: "Album", getValue: (basic) => basic.albumName },
  { label: "Lyricist", getValue: (basic) => basic.lyricist },
  { label: "Composer", getValue: (basic) => basic.composer },
  { label: "Arranger", getValue: (basic) => basic.arranger },
  { label: "Real Name", getValue: (basic) => basic.realName },
  { label: "Birthday", getValue: (basic) => basic.birthday },
  { label: "Position", getValue: (basic) => basic.position },
  { label: "MBTI", getValue: (basic) => basic.mbti },
  { label: "Zodiac Sign", getValue: (basic) => basic.zodiacSign },
  { label: "English Level", getValue: (basic) => basic.englishLevel },
  {
    label: "Height",
    getValue: (basic) => (basic.height === undefined ? null : String(basic.height)),
  },
  { label: "Blood Type", getValue: (basic) => basic.bloodType },
  {
    label: "Official Colors",
    getValue: (basic) => basic.officialColors?.join(", ") ?? null,
  },
  { label: "Agency", getValue: (basic) => basic.agencyName },
];

export const getWikiBasicFields = (basic: WikiBasic): WikiBasicField[] =>
  basicFieldLabels.flatMap((field) => {
    const value = field.getValue(basic);

    return value
      ? [
          {
            label: field.label,
            value,
          },
        ]
      : [];
  });

export const sortWikiSections = (sections: WikiSection[]): WikiSection[] =>
  [...sections]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((section) => ({
      ...section,
      children: sortWikiSections(section.children),
    }));

export const getSectionOffset = (depth: number): number =>
  Math.max(depth - 1, 0) * 24;
