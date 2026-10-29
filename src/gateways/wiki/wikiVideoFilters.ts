import { z } from "zod";

const seconds = z.number().int().min(0).max(2147483647).optional();
export const wikiVideoDurationFilterSchema = z
  .object({ minDurationSeconds: seconds, maxDurationSeconds: seconds, recentWatchRequestsOnly: z.boolean().optional(), sortByWatchRequests: z.boolean().optional() })
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
  for (const key of ["recentWatchRequestsOnly", "sortByWatchRequests"] as const) {
    if (filter[key] !== undefined) params.set(key, String(filter[key]));
  }
  return params;
};
