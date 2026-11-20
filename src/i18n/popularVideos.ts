export const popularVideosCopy = {
  ja: {
    title: "ピックアップ動画",
    pagination: "動画の表示位置", slide: (position: number) => `${position}番目の位置へ移動`,
    empty: "動画はまだありません。",
    error: "動画を読み込めませんでした。時間をおいて再度お試しください。",
    play: "再生",
    unavailable: "この動画は再生できません。",
  },
  en: {
    title: "Featured videos",
    pagination: "Video positions", slide: (position: number) => `Go to position ${position}`,
    empty: "No videos yet.",
    error: "Videos are temporarily unavailable. Please try again later.",
    play: "Play",
    unavailable: "This video is unavailable.",
  },
  ko: {
    title: "추천 영상",
    pagination: "영상 표시 위치", slide: (position: number) => `${position}번째 위치로 이동`,
    empty: "아직 영상이 없습니다.",
    error: "영상을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.",
    play: "재생",
    unavailable: "이 영상을 재생할 수 없습니다.",
  },
};
