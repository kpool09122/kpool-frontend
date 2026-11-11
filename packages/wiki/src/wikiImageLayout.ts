export const normalizeWikiImageWidth = (value: unknown): number | null => {
  const width = typeof value === "number" ? value : Number(value);
  return Number.isFinite(width) && width >= 1 ? Math.round(width) : null;
};
