// Report APIs and date inputs use UTC calendar dates, never local-midnight timestamps.
export const defaultReportingPeriod = (now = new Date()) => {
  const to = latestReportingDay(now);
  const from = new Date(`${to}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 27);
  return { from: from.toISOString().slice(0, 10), to };
};

export const latestReportingDay = (now = new Date()) => {
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  day.setUTCDate(day.getUTCDate() - 3);
  return day.toISOString().slice(0, 10);
};
export const validReportingPeriod = (
  from: string,
  to: string,
  now = new Date(),
) => {
  const valid = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(new Date(value).getTime()) &&
    new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(from) || !valid(to) || from > to || to > latestReportingDay(now))
    return false;
  const start = new Date(from);
  const target = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 6, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const anniversary = new Date(
    Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay)),
  );
  return new Date(to).getTime() < anniversary.getTime();
};
