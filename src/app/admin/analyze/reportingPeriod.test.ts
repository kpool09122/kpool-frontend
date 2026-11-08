import { describe, expect, it } from "vitest";
import { latestReportingDay, validReportingPeriod } from "./reportingPeriod";
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
