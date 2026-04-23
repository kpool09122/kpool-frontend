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

const createTwiceCompatibilitySections = (): WikiDetail["sections"] => [
  {
    type: "section",
    sectionIdentifier: "sec-twice-overview",
    title: "Overview",
    displayOrder: 10,
    depth: 1,
    contents: [
      {
        blockIdentifier: "block-twice-overview-text",
        blockType: "text",
        displayOrder: 10,
        content: [
          "TWICE는 SIXTEEN을 통해 결성된 9인조 다국적 걸그룹이다.",
          "",
          "팀명은 귀로 한 번, 눈으로 한 번 감동을 준다는 의미를 담고 있다.",
          "",
          "[[나연(TWICE)|나연]] · [[정연(TWICE)|정연]] · [[모모(TWICE)|모모]] · [[사나(TWICE)|사나]] · [[지효|지효]] · [[미나(TWICE)|미나]] · [[다현|다현]] · [[채영|채영]] · [[쯔위|쯔위]]",
          "",
          "[* 오디션 프로그램 SIXTEEN을 통해 결성되었다.]",
          "",
          "[[분류:TWICE]]",
          "",
          "[br]",
        ].join("\n"),
      },
      {
        blockIdentifier: "block-twice-overview-embed",
        blockType: "embed",
        displayOrder: 20,
        provider: "youtube",
        embedId: "c7rCyll5AeY",
        caption: "TWICE \"CHEER UP\" M/V",
      },
    ],
    children: [],
  },
  {
    type: "section",
    sectionIdentifier: "sec-twice-members",
    title: "Members",
    displayOrder: 20,
    depth: 1,
    contents: [
      {
        blockIdentifier: "block-twice-members-profiles",
        blockType: "profile_card_list",
        displayOrder: 10,
        wikiIdentifiers: [
          "tl-nayeon-twice",
          "tl-jeongyeon-twice",
          "tl-momo-twice",
          "tl-sana-twice",
          "tl-jihyo",
          "tl-mina-twice",
          "tl-dahyun",
          "tl-chaeyoung",
          "tl-tzuyu",
        ],
        title: "TWICE Members",
      },
    ],
    children: [],
  },
  {
    type: "section",
    sectionIdentifier: "sec-twice-history",
    title: "History",
    displayOrder: 30,
    depth: 1,
    contents: [
      {
        blockIdentifier: "block-twice-history-text",
        blockType: "text",
        displayOrder: 10,
        content:
          "2015년 데뷔 이후 한국과 일본을 중심으로 활동을 이어 왔으며, 대표곡으로는 \"CHEER UP\", \"TT\", \"FANCY\" 등이 있다.",
      },
    ],
    children: [],
  },
  {
    type: "section",
    sectionIdentifier: "sec-twice-discography",
    title: "Discography",
    displayOrder: 40,
    depth: 1,
    contents: [
      {
        blockIdentifier: "block-twice-discography-text",
        blockType: "text",
        displayOrder: 10,
        content:
          "한국 및 일본 음반 전개가 모두 큰 비중을 차지하며, 정규/미니/싱글/베스트 앨범 축이 나뉘어 전개된다.",
      },
      {
        blockIdentifier: "block-twice-discography-include",
        blockType: "text",
        displayOrder: 20,
        content: "[include(틀:TWICE/음반)]",
      },
    ],
    children: [],
  },
  {
    type: "section",
    sectionIdentifier: "sec-twice-activities",
    title: "Activities",
    displayOrder: 50,
    depth: 1,
    contents: [
      {
        blockIdentifier: "block-twice-activities-text",
        blockType: "text",
        displayOrder: 10,
        content:
          "한국 활동, 일본 활동, 월드투어, 유닛 및 솔로 활동이 병렬적으로 정리되는 편이며 시기별 정리와 하위 문서 분리가 잦다.",
      },
    ],
    children: [],
  },
  {
    type: "section",
    sectionIdentifier: "sec-twice-records",
    title: "Records",
    displayOrder: 60,
    depth: 1,
    contents: [
      {
        blockIdentifier: "block-twice-records-text",
        blockType: "text",
        displayOrder: 10,
        content:
          "음원과 음반 양쪽에서 강한 성과를 남긴 팀으로 평가되며, 나무위키에서는 관련 기록 틀을 별도로 끼워 넣는 구조가 자주 보인다.",
      },
      {
        blockIdentifier: "block-twice-records-include",
        blockType: "text",
        displayOrder: 20,
        content: "[include(틀:TWICE의 기록)]",
      },
    ],
    children: [],
  },
  {
    type: "section",
    sectionIdentifier: "sec-twice-media",
    title: "Media",
    displayOrder: 70,
    depth: 1,
    contents: [
      {
        blockIdentifier: "block-twice-media-text",
        blockType: "text",
        displayOrder: 10,
        content:
          "뮤직비디오, 리얼리티, 광고, 화보, SNS 활동 등이 방대한 편이라 관련 하위 문서나 목록성 서술로 분리되는 경우가 많다.",
      },
    ],
    children: [],
  },
];

const twiceMemberProfiles = [
  {
    slug: "tl-nayeon-twice",
    name: "나연",
    normalizedName: "nayeon-twice",
    emoji: "🐰",
    symbol: "Pastel microphone",
    colors: ["Sky Blue", "Ivory"],
    debutDate: "2015-10-20",
    heroImageSrc:
      "https://upload.wikimedia.org/wikipedia/commons/4/45/251120_NAYEON.png",
    heroImageAlt: "나연 promotional image",
    overview:
      "TWICE의 맏언니이자 리드보컬 포지션으로 널리 알려져 있으며, 솔로 활동도 전개하고 있다.",
  },
  {
    slug: "tl-jeongyeon-twice",
    name: "정연",
    normalizedName: "jeongyeon-twice",
    emoji: "🐶",
    symbol: "Mint spotlight",
    colors: ["Mint", "White"],
    debutDate: "2015-10-20",
    heroImageSrc:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/260306_Twice_Hamilton_Jeongyeon_%ED%8A%B8%EC%99%80%EC%9D%B4%EC%8A%A4_%EC%A0%95%EC%97%B0_%287%29_%28cropped%29.jpg/250px-260306_Twice_Hamilton_Jeongyeon_%ED%8A%B8%EC%99%80%EC%9D%B4%EC%8A%A4_%EC%A0%95%EC%97%B0_%287%29_%28cropped%29.jpg",
    heroImageAlt: "ジョンヨン portrait image",
    overview:
      "TWICE의 보컬 라인을 담당하는 멤버로, 안정적인 무대 소화력과 중저음 톤으로 평가된다.",
  },
  {
    slug: "tl-momo-twice",
    name: "모모",
    normalizedName: "momo-twice",
    emoji: "🍑",
    symbol: "Dance line marker",
    colors: ["Peach", "Black"],
    debutDate: "2015-10-20",
    heroImageSrc:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/TWICE_MOMO_April_2024.jpg/960px-TWICE_MOMO_April_2024.jpg",
    heroImageAlt: "모모 portrait image",
    overview:
      "TWICE의 메인댄서로 널리 인식되며, 퍼포먼스 중심 서술에서 비중이 크다.",
  },
  {
    slug: "tl-sana-twice",
    name: "사나",
    normalizedName: "sana-twice",
    emoji: "🫧",
    symbol: "Soft pink ribbon",
    colors: ["Soft Pink", "Cream"],
    debutDate: "2015-10-20",
    heroImageSrc:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Sana_Minatozaki_%E6%B9%8A%EF%A8%91_%E7%B4%97%E5%A4%8F_20250118_07.jpg/250px-Sana_Minatozaki_%E6%B9%8A%EF%A8%91_%E7%B4%97%E5%A4%8F_20250118_07.jpg",
    heroImageAlt: "サナ portrait image",
    overview:
      "표정 연기와 예능감, 무대 장악력으로 자주 언급되는 TWICE의 일본인 멤버다.",
  },
  {
    slug: "tl-jihyo",
    name: "지효",
    normalizedName: "jihyo",
    emoji: "🌟",
    symbol: "Leader badge",
    colors: ["Goldenrod", "Black"],
    debutDate: "2015-10-20",
    heroImageSrc:
      "https://upload.wikimedia.org/wikipedia/ja/thumb/4/4c/251127_Park_Jihyo.PNG/250px-251127_Park_Jihyo.PNG",
    heroImageAlt: "ジヒョ portrait image",
    overview:
      "TWICE의 리더이자 메인보컬로, 그룹 활동과 별개로 솔로 커리어도 갖고 있다.",
  },
  {
    slug: "tl-mina-twice",
    name: "미나",
    normalizedName: "mina-twice",
    emoji: "🦢",
    symbol: "Ballet line",
    colors: ["Teal", "White"],
    debutDate: "2015-10-20",
    heroImageSrc:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Mina_H%26M_Rokh_2.jpg/250px-Mina_H%26M_Rokh_2.jpg",
    heroImageAlt: "ミナ portrait image",
    overview:
      "우아한 퍼포먼스와 차분한 이미지로 알려진 일본인 멤버이며 미성 보컬로도 자주 언급된다.",
  },
  {
    slug: "tl-dahyun",
    name: "다현",
    normalizedName: "dahyun",
    emoji: "🤍",
    symbol: "White piano key",
    colors: ["White", "Piano Black"],
    debutDate: "2015-10-20",
    heroImageSrc:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Dahyun_at_press_conference_for_You_Are_the_Apple_of_My_Eye_02_%28cropped%29.png/250px-Dahyun_at_press_conference_for_You_Are_the_Apple_of_My_Eye_02_%28cropped%29.png",
    heroImageAlt: "ダヒョン portrait image",
    overview:
      "랩과 예능, 무대 리액션에서 존재감이 큰 멤버로, 최근에는 연기 활동도 병행한다.",
  },
  {
    slug: "tl-chaeyoung",
    name: "채영",
    normalizedName: "chaeyoung",
    emoji: "🍓",
    symbol: "Sketch marker",
    colors: ["Strawberry Red", "Charcoal"],
    debutDate: "2015-10-20",
    heroImageSrc:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/241204_Chaeyoung_at_Rokh_H%26M_%281%29.png/250px-241204_Chaeyoung_at_Rokh_H%26M_%281%29.png",
    heroImageAlt: "チェヨン portrait image",
    overview:
      "랩과 작사 참여, 개성적인 비주얼로 자주 언급되는 TWICE의 멤버다.",
  },
  {
    slug: "tl-tzuyu",
    name: "쯔위",
    normalizedName: "tzuyu",
    emoji: "🧊",
    symbol: "Blue prism",
    colors: ["Blue", "Silver"],
    debutDate: "2015-10-20",
    heroImageSrc:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Tzuyu_at_Gucci_Ancora_on_05032024_%283%29.png/506px-Tzuyu_at_Gucci_Ancora_on_05032024_%283%29.png",
    heroImageAlt: "ツウィ portrait image",
    overview:
      "비주얼과 피지컬 비중이 큰 서술과 함께, 솔로 및 개별 활동도 병행하는 TWICE의 막내다.",
  },
] as const;

const createTwiceMemberSections = (name: string, overview: string): WikiDetail["sections"] => [
  {
    type: "section",
    sectionIdentifier: `sec-${name}-overview`,
    title: "Overview",
    displayOrder: 10,
    depth: 1,
    contents: [
      {
        blockIdentifier: `block-${name}-overview-text`,
        blockType: "text",
        displayOrder: 10,
        content: overview,
      },
    ],
    children: [],
  },
  {
    type: "section",
    sectionIdentifier: `sec-${name}-related`,
    title: "Related",
    displayOrder: 20,
    depth: 1,
    contents: [
      {
        blockIdentifier: `block-${name}-related-profiles`,
        blockType: "profile_card_list",
        displayOrder: 10,
        wikiIdentifiers: ["gr-twice"],
        title: "Group",
      },
    ],
    children: [],
  },
];

const legacySlugAliases: Record<string, string> = {
  "aurora-echo": "gr-aurora-echo",
  twice: "gr-twice",
  "namu-compat-demo": "gr-twice",
  "nayeon-twice": "tl-nayeon-twice",
  "jeongyeon-twice": "tl-jeongyeon-twice",
  "momo-twice": "tl-momo-twice",
  "sana-twice": "tl-sana-twice",
  jihyo: "tl-jihyo",
  "mina-twice": "tl-mina-twice",
  dahyun: "tl-dahyun",
  chaeyoung: "tl-chaeyoung",
  tzuyu: "tl-tzuyu",
};

export const createMockWikiDetail = (
  slug: string,
  options?: CreateMockWikiDetailOptions,
): WikiDetail => {
  const normalizedSlug = legacySlugAliases[slug] ?? slug;
  const isTwiceGroupSlug = normalizedSlug === "gr-twice";
  const twiceMember = twiceMemberProfiles.find((member) => member.slug === normalizedSlug);

  return wikiDetailSchema.parse({
    wikiIdentifier: normalizedSlug,
    slug: normalizedSlug,
    language: "ja",
    resourceType: twiceMember ? "talent" : "group",
    version: 3,
    themeColor: options?.themeColor ?? null,
    heroImage: {
      src: twiceMember?.heroImageSrc ?? heroImageDataUri,
      alt:
        twiceMember?.heroImageAlt ??
        (isTwiceGroupSlug
          ? "Pink and apricot concert lights inspired by a TWICE stage"
          : "Stage lights washing over a concert crowd in blue and gold"
        ),
    },
    basic:
      isTwiceGroupSlug
        ? {
            name: "TWICE",
            normalizedName: "twice",
            resourceType: "group",
            groupType: "Girl Group",
            status: "Active",
            generation: "3rd",
            debutDate: "2015-10-20",
            fandomName: "ONCE",
            emoji: "🍭",
            representativeSymbol: "Candy bong",
            officialColors: ["Apricot", "Neon Magenta"],
            agencyName: "JYP Entertainment",
          }
        : twiceMember
          ? {
              name: twiceMember.name,
              normalizedName: twiceMember.normalizedName,
              resourceType: "talent",
              status: "Active",
              generation: "3rd",
              debutDate: twiceMember.debutDate,
              fandomName: "ONCE",
              emoji: twiceMember.emoji,
              representativeSymbol: twiceMember.symbol,
              officialColors: [...twiceMember.colors],
              agencyName: "JYP Entertainment",
              realName: twiceMember.name,
              position: "Member",
            }
        : {
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
    sections: isTwiceGroupSlug
      ? createTwiceCompatibilitySections()
      : twiceMember
        ? createTwiceMemberSections(twiceMember.normalizedName, twiceMember.overview)
      : [
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
            wikiIdentifiers: ["gr-aurora-echo"],
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
};
