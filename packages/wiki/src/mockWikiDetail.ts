import { wikiDetailSchema, type WikiDetail } from "./types/wiki";

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
        type: "section",
        sectionIdentifier: "sec-discography",
        title: "Discography",
        displayOrder: 30,
        depth: 1,
        contents: [
          {
            blockIdentifier: "block-discography-text",
            blockType: "text",
            displayOrder: 10,
            content:
              "The group balances brisk digital singles with a smaller number of concept-heavy mini albums.",
          },
          {
            blockIdentifier: "block-discography-image",
            blockType: "image",
            displayOrder: 20,
            imageIdentifier: "img-discography-stage",
            imageSrc: heroImageDataUri,
            caption: "Editable discography image",
            alt: "Concert stage image for Discography",
          },
          {
            blockIdentifier: "block-discography-gallery",
            blockType: "image_gallery",
            displayOrder: 30,
            images: [
              {
                imageIdentifier: "img-gallery-one",
                imageSrc: heroImageDataUri,
                alt: "Gallery image one",
              },
              {
                imageIdentifier: "img-gallery-two",
                imageSrc: heroImageDataUri,
                alt: "Gallery image two",
              },
            ],
            caption: "Editable gallery",
          },
          {
            blockIdentifier: "block-discography-embed",
            blockType: "embed",
            displayOrder: 40,
            provider: "youtube",
            embedId: "low-tide-high-lights",
            caption: "Stage video",
          },
          {
            blockIdentifier: "block-discography-quote",
            blockType: "quote",
            displayOrder: 50,
            content: "A dusk-to-dawn pop sequence.",
            source: "K-Pool editorial",
          },
          {
            blockIdentifier: "block-discography-list",
            blockType: "list",
            displayOrder: 60,
            listType: "bullet",
            items: ["Low Tide, High Lights", "Pearl Signal"],
          },
          {
            blockIdentifier: "block-discography-table",
            blockType: "table",
            displayOrder: 70,
            headers: ["Release", "Year"],
            rows: [["Low Tide, High Lights", "2022"]],
          },
          {
            blockIdentifier: "block-discography-profiles",
            blockType: "profile_card_list",
            displayOrder: 80,
            wikiIdentifiers: ["aurora-echo"],
            title: "Related profiles",
          },
        ],
        children: [
          {
            type: "section",
            sectionIdentifier: "sec-discography-highlights",
            title: "Highlights",
            displayOrder: 20,
            depth: 2,
            contents: [
              {
                blockIdentifier: "block-discography-highlights-text",
                blockType: "text",
                displayOrder: 10,
                content:
                  "The breakout single 'Low Tide, High Lights' established their retro-synth identity and remains their signature stage opener.",
              },
              {
                type: "section",
                sectionIdentifier: "sec-discography-highlights-chart",
                title: "Chart notes",
                displayOrder: 20,
                depth: 3,
                contents: [
                  {
                    blockIdentifier: "block-discography-highlights-chart-text",
                    blockType: "text",
                    displayOrder: 10,
                    content:
                      "Depth three content is editable but cannot receive a child section.",
                  },
                ],
                children: [],
              },
            ],
            children: [],
          },
          {
            type: "section",
            sectionIdentifier: "sec-discography-albums",
            title: "Mini Albums",
            displayOrder: 10,
            depth: 2,
            contents: [
              {
                blockIdentifier: "block-discography-albums-text",
                blockType: "text",
                displayOrder: 10,
                content:
                  "Their first two mini albums framed a dusk-to-dawn narrative and expanded the live arrangement palette with brass and guitar sections.",
              },
            ],
            children: [],
          },
        ],
      },
      {
        type: "section",
        sectionIdentifier: "sec-overview",
        title: "Overview",
        displayOrder: 10,
        depth: 1,
        contents: [
          {
            blockIdentifier: "block-overview-text",
            blockType: "text",
            displayOrder: 10,
            content:
              "Aurora Echo debuted with a performance style built around fluid formations, layered harmonies, and warm retro production.",
          },
        ],
        children: [
          {
            type: "section",
            sectionIdentifier: "sec-overview-style",
            title: "Style",
            displayOrder: 10,
            depth: 2,
            contents: [
              {
                blockIdentifier: "block-overview-style-text",
                blockType: "text",
                displayOrder: 10,
                content:
                  "The visual direction mixes marine tailoring, brushed metal details, and sunset-toned lighting for a polished but lived-in stage mood.",
              },
            ],
            children: [],
          },
        ],
      },
      {
        type: "section",
        sectionIdentifier: "sec-members",
        title: "Members",
        displayOrder: 20,
        depth: 1,
        contents: [
          {
            blockIdentifier: "block-members-text",
            blockType: "text",
            displayOrder: 10,
            content:
              "The lineup consists of five members handling a rotating balance of vocal, rap, and dance center duties.",
          },
        ],
        children: [],
      },
    ],
  });
