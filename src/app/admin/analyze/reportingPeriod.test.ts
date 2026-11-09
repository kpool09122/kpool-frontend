import { describe, expect, it } from "vitest";
import {
  defaultReportingPeriod,
  latestLocalReportingDay,
  toUtcReportingDay,
  latestReportingDay,
  validReportingPeriod,
} from "./reportingPeriod";
describe("UTC reporting period", () => {
  it("uses UTC D-3 without a historical cutoff", () => {
    const now = new Date("2026-11-08T00:01:00Z");
    expect(latestReportingDay(now)).toBe("2026-11-05");
    expect(validReportingPeriod("2000-01-01", "2000-12-31", now)).toBe(true);
    expect(validReportingPeriod("2026-11-05", "2026-11-06", now)).toBe(false);
  });
  it("matches the backend clamped calendar-year inclusive boundary", () => {
    const now = new Date("2026-11-08Z");
    expect(validReportingPeriod("2024-02-29", "2025-02-27", now)).toBe(true);
    expect(validReportingPeriod("2024-02-29", "2025-02-28", now)).toBe(false);
    expect(validReportingPeriod("2024-01-01", "2024-12-31", now)).toBe(true);
    expect(validReportingPeriod("2024-01-01", "2025-01-01", now)).toBe(false);
    expect(validReportingPeriod("2024-02-30", "2024-03-01", now)).toBe(false);
    expect(validReportingPeriod("2024-03-01", "2024-02-29", now)).toBe(false);
  });
});

describe("local reporting period", () => {
  it.each(["2020-01-01", "2026-03-08", "2026-11-01"])(
    "converts local midnight for %s to the UTC calendar date",
    (day) => {
      const [year, month, date] = day.split("-").map(Number);
      expect(toUtcReportingDay(day)).toBe(
        new Date(year, month - 1, date).toISOString().slice(0, 10),
      );
    },
  );
  it.each(["", "invalid", "2024-02-30", "2026-13-01"])(
    "rejects invalid local dates: %s",
    (day) => {
      expect(toUtcReportingDay(day)).toBe("");
    },
  );
  it("uses an available local end date and a 28-day default across DST", () => {
    const now = new Date("2026-11-08T00:01:00Z");
    const period = defaultReportingPeriod(now);
    expect(period.to).toBe(latestLocalReportingDay(now));
    expect(
      validReportingPeriod(
        toUtcReportingDay(period.from),
        toUtcReportingDay(period.to),
        now,
      ),
    ).toBe(true);
    const following = new Date(`${period.to}T00:00:00`);
    following.setDate(following.getDate() + 1);
    expect(following.toISOString().slice(0, 10) > latestReportingDay(now)).toBe(
      true,
    );
    const start = new Date(`${period.from}T00:00:00`);
    start.setDate(start.getDate() + 27);
    expect(start.getTime()).toBe(
      new Date(`${period.to}T00:00:00`).getTime(),
    );
  });
});
