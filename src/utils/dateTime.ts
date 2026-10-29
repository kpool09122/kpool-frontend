export type DateTimeFormatOptions = Intl.DateTimeFormatOptions & {
  fallback?: string;
};

export const getBrowserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

// API timestamps are UTC. Calendar dates have no time zone and stay unchanged.
export function formatDateTime(
  value: string | null | undefined,
  locale: string,
  options: DateTimeFormatOptions = {},
): string {
  const { fallback = "-", ...formatOptions } = options;
  if (!value) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const utcWithoutOffset = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
  const timestamp = utcWithoutOffset.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
    ...formatOptions,
  }).format(date);
}
