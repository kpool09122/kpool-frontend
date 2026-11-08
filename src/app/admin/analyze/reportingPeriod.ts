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
  const year = start.getUTCFullYear() + 1;
  const month = start.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const anniversary = new Date(
    Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay)),
  );
  return new Date(to).getTime() < anniversary.getTime();
};
