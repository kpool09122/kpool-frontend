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
  agency: {
    wikiIdentifier: "agency-wiki-1",
    slug: "ag-north-harbor-entertainment",
    language: "ko",
    name: "North Harbor Entertainment",
    normalizedName: "north-harbor-entertainment",
  },
  agencyIdentifier: "agency-wiki-1",
  agencyName: "North Harbor Entertainment",
  talents: [
    {
      wikiIdentifier: "talent-wiki-1",
      slug: "tl-momo",
      language: "ko",
      name: "MOMO",
      normalizedName: "momo",
    },
    {
      wikiIdentifier: "talent-wiki-2",
      slug: "tl-sana",
      language: "ko",
      name: "SANA",
      normalizedName: "sana",
    },
  ],
};

const sections: WikiSection[] = [
  {
    type: "section",
    sectionIdentifier: "second",
    title: "Second",
    displayOrder: 20,
    depth: 1,
    contents: [
      {
        type: "section",
        sectionIdentifier: "child-b",
        title: "Child B",
        displayOrder: 20,
        depth: 2,
        contents: [],
      },
      {
        type: "section",
        sectionIdentifier: "child-a",
        title: "Child A",
        displayOrder: 10,
        depth: 2,
        contents: [],
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
  },
];

describe("wikiDetailView", () => {
  it("builds a compact list of basic fields", () => {
    expect(getWikiBasicFields(basic)).toEqual([
      { label: "Group Type", value: "Girl Group" },
      { label: "Status", value: "Active" },
      { label: "Generation", value: "5th" },
      { label: "Debut Date", value: "2022-03-14" },
      { label: "Fandom Name", value: "Daybreak" },
      { label: "Representative Symbol", value: "Solar wave" },
      {
        label: "Agency",
        links: [
          {
            href: "/ko/wiki/ag-north-harbor-entertainment",
            label: "North Harbor Entertainment",
          },
        ],
        value: "North Harbor Entertainment",
      },
      {
        label: "Talents",
        links: [
          { href: "/ko/wiki/tl-momo", label: "MOMO" },
          { href: "/ko/wiki/tl-sana", label: "SANA" },
        ],
        value: "MOMO, SANA",
      },
      { label: "Official Colors", value: "Solar Gold, Midnight Blue" },
    ]);
  });

  it("places song talents immediately after groups", () => {
    expect(
      getWikiBasicFields({
        name: "Signal",
        normalizedName: "signal",
        resourceType: "song",
        groups: [
          {
            wikiIdentifier: "group-wiki-1",
            slug: "gr-twice",
            language: "ko",
            name: "TWICE",
            normalizedName: "twice",
          },
        ],
        talents: [
          {
            wikiIdentifier: "talent-wiki-1",
            slug: "tl-nayeon",
            language: "ko",
            name: "NAYEON",
            normalizedName: "nayeon",
          },
        ],
        releaseDate: "2017-05-15",
      }).map((field) => field.label),
    ).toEqual(["Groups", "Talents", "Release Date"]);
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
      },
      {
        type: "section",
        sectionIdentifier: "second",
        title: "Second",
        displayOrder: 20,
        depth: 1,
        contents: [
          {
            type: "section",
            sectionIdentifier: "child-a",
            title: "Child A",
            displayOrder: 10,
            depth: 2,
            contents: [],
          },
          {
            type: "section",
            sectionIdentifier: "child-b",
            title: "Child B",
            displayOrder: 20,
            depth: 2,
            contents: [],
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
