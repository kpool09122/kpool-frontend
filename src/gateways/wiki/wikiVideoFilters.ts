import { z } from "zod";

const seconds = z.number().int().min(0).max(2147483647).optional();
export const wikiVideoDurationFilterSchema = z
  .object({ minDurationSeconds: seconds, maxDurationSeconds: seconds })
  .refine(
    ({ minDurationSeconds, maxDurationSeconds }) =>
      minDurationSeconds === undefined ||
      maxDurationSeconds === undefined ||
      minDurationSeconds <= maxDurationSeconds,
  );

export type WikiVideoDurationFilter = z.infer<typeof wikiVideoDurationFilterSchema>;

export const wikiVideoDurationSearchParams = (filter: WikiVideoDurationFilter) => {
  const params = new URLSearchParams();
  if (filter.minDurationSeconds !== undefined)
    params.set("minDurationSeconds", String(filter.minDurationSeconds));
  if (filter.maxDurationSeconds !== undefined)
    params.set("maxDurationSeconds", String(filter.maxDurationSeconds));
  return params;
};
