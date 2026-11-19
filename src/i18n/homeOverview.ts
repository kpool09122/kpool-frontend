import type { Locale } from "./locales";

export const homeOverviewCopy = {
  ja: {
    eyebrow: "K-POP KNOWLEDGE, TOGETHER",
    title: "好きがつながる、\nK-POPのWiki。",
    description: "アーティスト、グループ、楽曲、事務所。K-POPの知識をみんなで集めて、言葉を越えてつなぐ場所。",
    explore: "Wikiを見つける", stats: "みんなで育てるk-pool", total: "Wiki", languages: "言語別", resources: "種別別", groups: "グループ構成",
    note: "全言語のページを集計。翻訳はそれぞれ1件として数えます。グループ構成もページ数に基づきます。",
    unavailable: "集計情報を取得できませんでした。時間をおいて再度お試しください。",
    empty: "最初のWikiから、知識の輪を広げよう。", noGroups: "グループのWikiはまだありません。",
    groupLabels: { boy_group: "ボーイズ", girl_group: "ガールズ", co_ed: "混成", unknown: "未分類" },
  },
  en: {
    eyebrow: "K-POP KNOWLEDGE, TOGETHER",
    title: "Your passion.\nOur K-pop wiki.",
    description: "Artists, groups, songs, and agencies. A shared home for K-pop knowledge, built together and connected across languages.",
    explore: "Explore the wiki", stats: "k-pool, growing together", total: "Wikis", languages: "By language", resources: "By type", groups: "Group composition",
    note: "Pages across all languages. Each translation counts as one page. Group composition is also based on page counts.",
    unavailable: "Statistics are temporarily unavailable. Please try again later.",
    empty: "Every shared story starts with a first wiki.", noGroups: "No group wikis yet.",
    groupLabels: { boy_group: "Boy groups", girl_group: "Girl groups", co_ed: "Co-ed", unknown: "Unclassified" },
  },
  ko: {
    eyebrow: "K-POP KNOWLEDGE, TOGETHER",
    title: "좋아하는 마음이 모이는,\nK-POP 위키.",
    description: "아티스트, 그룹, 노래, 소속사. K-POP의 지식을 함께 모으고 언어를 넘어 연결하는 공간.",
    explore: "위키 둘러보기", stats: "함께 키우는 k-pool", total: "위키", languages: "언어별", resources: "유형별", groups: "그룹 구성",
    note: "모든 언어의 페이지를 집계합니다. 번역은 각각 1건으로 계산하며, 그룹 구성도 페이지 수를 기준으로 합니다.",
    unavailable: "통계를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.",
    empty: "첫 위키부터 함께 지식을 쌓아 가요.", noGroups: "아직 그룹 위키가 없습니다.",
    groupLabels: { boy_group: "보이 그룹", girl_group: "걸 그룹", co_ed: "혼성", unknown: "미분류" },
  },
} satisfies Record<Locale, unknown>;
