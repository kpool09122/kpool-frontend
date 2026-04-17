import { describe, expect, it } from "vitest";

import { type WikiBasic, type WikiSection } from "./types/wiki";

import {
  getSectionOffset,
  getWikiBasicFields,
  sortWikiSections,
} from "./wikiDetailView";

const basic: WikiBasic = {
  name: "Aurora Echo",
  normalizedName: "aurora-echo",
  resourceType: "group",
  groupType: "Girl Group",
  status: "Active",
  generation: "5th",
  debutDate: "2022-03-14",
  fandomName: "Daybreak",
  emoji: "🌅",
  representativeSymbol: "Solar wave",
  officialColors: ["Solar Gold", "Midnight Blue"],
  agencyName: "North Harbor Entertainment",
};

const sections: WikiSection[] = [
  {
    type: "section",
    sectionIdentifier: "second",
    title: "Second",
    displayOrder: 20,
    depth: 1,
    contents: [],
    children: [
      {
        type: "section",
        sectionIdentifier: "child-b",
        title: "Child B",
        displayOrder: 20,
        depth: 2,
        contents: [],
        children: [],
      },
      {
        type: "section",
        sectionIdentifier: "child-a",
        title: "Child A",
        displayOrder: 10,
        depth: 2,
        contents: [],
        children: [],
      },
    ],
  },
  {
    type: "section",
    sectionIdentifier: "first",
    title: "First",
    displayOrder: 10,
    depth: 1,
    contents: [],
    children: [],
  },
];

describe("wikiDetailView", () => {
  it("builds a compact list of basic fields", () => {
    expect(getWikiBasicFields(basic)).toEqual([
      { label: "Resource Type", value: "group" },
      { label: "Group Type", value: "Girl Group" },
      { label: "Status", value: "Active" },
      { label: "Generation", value: "5th" },
      { label: "Debut Date", value: "2022-03-14" },
      { label: "Fandom Name", value: "Daybreak" },
      { label: "Representative Symbol", value: "Solar wave" },
      { label: "Official Colors", value: "Solar Gold, Midnight Blue" },
      { label: "Agency", value: "North Harbor Entertainment" },
    ]);
  });

  it("sorts sections recursively by display order", () => {
    expect(sortWikiSections(sections)).toEqual([
      {
        type: "section",
        sectionIdentifier: "first",
        title: "First",
        displayOrder: 10,
        depth: 1,
        contents: [],
        children: [],
      },
      {
        type: "section",
        sectionIdentifier: "second",
        title: "Second",
        displayOrder: 20,
        depth: 1,
        contents: [],
        children: [
          {
            type: "section",
            sectionIdentifier: "child-a",
            title: "Child A",
            displayOrder: 10,
            depth: 2,
            contents: [],
            children: [],
          },
          {
            type: "section",
            sectionIdentifier: "child-b",
            title: "Child B",
            displayOrder: 20,
            depth: 2,
            contents: [],
            children: [],
          },
        ],
      },
    ]);
  });

  it("derives the horizontal offset from section depth", () => {
    expect(getSectionOffset(1)).toBe(0);
    expect(getSectionOffset(2)).toBe(24);
    expect(getSectionOffset(4)).toBe(72);
  });
});
