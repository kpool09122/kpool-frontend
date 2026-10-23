const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

export const formatContactPreview = (content: string): string => {
  let preview = "";
  let length = 0;
  for (const { segment } of segmenter.segment(content)) {
    if (length === 50) return `${preview}…`;
    preview += segment;
    length++;
  }
  return preview;
};
