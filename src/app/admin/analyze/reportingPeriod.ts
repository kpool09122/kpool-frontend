const localDateString = (date: Date) =>
  `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// The report API accepts UTC calendar dates, not timestamps.
export const toUtcReportingDay = (localDay: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDay)) return "";
  const date = new Date(`${localDay}T00:00:00`);
  if (!Number.isFinite(date.getTime()) || localDateString(date) !== localDay)
    return "";
  return date.toISOString().slice(0, 10);
};

export const latestLocalReportingDay = (now = new Date()) =>
  localDateString(new Date(`${latestReportingDay(now)}T23:59:59.999Z`));

export const defaultReportingPeriod = (now = new Date()) => {
  const to = latestLocalReportingDay(now);
  const from = new Date(`${to}T00:00:00`);
  from.setDate(from.getDate() - 27);
  return { from: localDateString(from), to };
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
  const year = start.getUTCFullYear() + 1;
  const month = start.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const anniversary = new Date(
    Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay)),
  );
  return new Date(to).getTime() < anniversary.getTime();
};
