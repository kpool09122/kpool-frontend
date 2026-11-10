import { describe, expect, it } from "vitest";
import {
  defaultReportingPeriod,
  latestReportingDay,
  validReportingPeriod,
} from "./reportingPeriod";
describe("UTC reporting period", () => {
  it("uses UTC D-3 without a historical cutoff", () => {
    const now = new Date("2026-11-08T00:01:00Z");
    expect(latestReportingDay(now)).toBe("2026-11-05");
    expect(validReportingPeriod("2000-01-01", "2000-06-30", now)).toBe(true);
    expect(validReportingPeriod("2026-11-05", "2026-11-06", now)).toBe(false);
  });
  it("matches the backend clamped six-month inclusive boundary", () => {
    const now = new Date("2026-11-08Z");
    expect(validReportingPeriod("2024-08-31", "2025-02-27", now)).toBe(true);
    expect(validReportingPeriod("2024-08-31", "2025-02-28", now)).toBe(false);
    expect(validReportingPeriod("2024-01-01", "2024-06-30", now)).toBe(true);
    expect(validReportingPeriod("2024-01-01", "2024-07-01", now)).toBe(false);
    expect(validReportingPeriod("2024-02-30", "2024-03-01", now)).toBe(false);
    expect(validReportingPeriod("2024-03-01", "2024-02-29", now)).toBe(false);
  });
});

describe("calendar-date reporting", () => {
  it.each(["", "invalid", "2024-02-30", "2026-13-01"])(
    "rejects invalid calendar dates: %s",
    (day) => {
      expect(validReportingPeriod(day, "2026-11-05", new Date("2026-11-08T00:01:00Z"))).toBe(false);
    },
  );
  it.each([
    ["2026-11-08T00:01:00Z", "2026-10-09", "2026-11-05"],
    ["2026-03-12T00:01:00Z", "2026-02-10", "2026-03-09"],
    ["2024-03-03T23:59:59Z", "2024-02-02", "2024-02-29"],
  ])("uses UTC dates for a 28-day default across timezone, DST and leap-day boundaries (%s)", (instant, from, to) => {
    const now = new Date(instant);
    expect(defaultReportingPeriod(now)).toEqual({ from, to });
    expect(validReportingPeriod(from, to, now)).toBe(true);
    expect(latestReportingDay(now)).toBe(to);
    const following = new Date(`${to}T00:00:00Z`);
    following.setUTCDate(following.getUTCDate() + 1);
    expect(validReportingPeriod(from, following.toISOString().slice(0, 10), now)).toBe(false);
  });
});
