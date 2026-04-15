import { wikiDetailSchema, type WikiDetail } from "@/types/wiki-detail";

const heroImageDataUri =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="sky" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#24457a" />
          <stop offset="52%" stop-color="#3560a3" />
          <stop offset="100%" stop-color="#f1a81f" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#sky)" />
      <circle cx="950" cy="190" r="130" fill="rgba(255,255,255,0.18)" />
      <path d="M0 710 C220 620 410 810 640 730 C870 650 1010 470 1200 560 L1200 900 L0 900 Z" fill="#1d2f49" opacity="0.55" />
      <path d="M0 770 C170 690 360 840 580 780 C810 720 1010 560 1200 650 L1200 900 L0 900 Z" fill="#fffbf7" opacity="0.18" />
    </svg>
  `);

type CreateMockWikiDetailOptions = {
  themeColor?: string;
};

export const createMockWikiDetail = (
  slug: string,
  options?: CreateMockWikiDetailOptions,
): WikiDetail =>
  wikiDetailSchema.parse({
    wikiIdentifier: slug,
    slug,
    language: "ja",
    resourceType: "group",
    version: 3,
    themeColor: options?.themeColor ?? null,
    heroImage: {
      src: heroImageDataUri,
      alt: "Stage lights washing over a concert crowd in blue and gold",
    },
    summary:
      "Five-member performance group blending precision choreography with live band arrangements and a city-pop visual language.",
    basic: {
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
      officialColors: ["Solar Gold", "Midnight Blue", "Pearl Mist"],
      agencyName: "North Harbor Entertainment",
    },
    sections: [
      {
        sectionIdentifier: "sec-discography",
        title: "Discography",
        displayOrder: 30,
        depth: 1,
        body: "The group balances brisk digital singles with a smaller number of concept-heavy mini albums.",
        children: [
          {
            sectionIdentifier: "sec-discography-highlights",
            title: "Highlights",
            displayOrder: 20,
            depth: 2,
            body: "The breakout single 'Low Tide, High Lights' established their retro-synth identity and remains their signature stage opener.",
            children: [],
          },
          {
            sectionIdentifier: "sec-discography-albums",
            title: "Mini Albums",
            displayOrder: 10,
            depth: 2,
            body: "Their first two mini albums framed a dusk-to-dawn narrative and expanded the live arrangement palette with brass and guitar sections.",
            children: [],
          },
        ],
      },
      {
        sectionIdentifier: "sec-overview",
        title: "Overview",
        displayOrder: 10,
        depth: 1,
        body: "Aurora Echo debuted with a performance style built around fluid formations, layered harmonies, and warm retro production.",
        children: [
          {
            sectionIdentifier: "sec-overview-style",
            title: "Style",
            displayOrder: 10,
            depth: 2,
            body: "The visual direction mixes marine tailoring, brushed metal details, and sunset-toned lighting for a polished but lived-in stage mood.",
            children: [],
          },
        ],
      },
      {
        sectionIdentifier: "sec-members",
        title: "Members",
        displayOrder: 20,
        depth: 1,
        body: "The lineup consists of five members handling a rotating balance of vocal, rap, and dance center duties.",
        children: [],
      },
    ],
  });
