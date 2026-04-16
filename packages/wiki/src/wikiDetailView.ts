import type { WikiBasic, WikiSection } from "./types/wiki";

export type WikiBasicField = {
  label: string;
  value: string;
};

const basicFieldLabels: Array<{
  label: string;
  getValue: (basic: WikiBasic) => string | null;
}> = [
  { label: "Resource Type", getValue: (basic) => basic.resourceType },
  { label: "Group Type", getValue: (basic) => basic.groupType },
  { label: "Status", getValue: (basic) => basic.status },
  { label: "Generation", getValue: (basic) => basic.generation },
  { label: "Debut Date", getValue: (basic) => basic.debutDate },
  { label: "Fandom Name", getValue: (basic) => basic.fandomName },
  { label: "Representative Symbol", getValue: (basic) => basic.representativeSymbol },
  {
    label: "Official Colors",
    getValue: (basic) => basic.officialColors.join(", "),
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
