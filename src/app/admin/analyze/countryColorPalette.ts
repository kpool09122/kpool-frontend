const palette = [
  [204, 251, 241],
  [94, 234, 212],
  [20, 184, 166],
  [13, 148, 136],
  [15, 118, 110],
  [17, 94, 89],
  [4, 47, 46],
];

const colorAt = (position: number) => {
  const step = position * (palette.length - 1);
  const index = Math.floor(step);
  const from = palette[index];
  const to = palette[Math.min(index + 1, palette.length - 1)];
  return "#" + from.map((channel, component) =>
    Math.round(channel + (to[component] - channel) * (step - index)).toString(16).padStart(2, "0"),
  ).join("");
};

// Stretch distinct positive ranks across the full palette; ties share a shade.
export const createCountryFillScale = (
  scores: ReadonlyMap<string, number>,
  ranks?: ReadonlyMap<string, number>,
): Map<string, string> => {
  const positive = Array.from(scores).filter(([, score]) => score > 0);
  const useExactRanks = !!ranks && positive.every(([country]) => ranks.has(country));
  const strengths = new Map(positive.map(([country, score]) => [
    country, useExactRanks ? -ranks!.get(country)! : Number(score.toPrecision(12)),
  ]));
  const levels = Array.from(new Set(strengths.values())).sort((a, b) => a - b);
  const positions = new Map(levels.map((level, index) => [
    level, levels.length === 1 ? 1 : index / (levels.length - 1),
  ]));
  return new Map(Array.from(scores, ([country, score]) => [
    country,
    score === 0 ? "#f0fdfa" : colorAt(positions.get(strengths.get(country)!)!),
  ]));
};
