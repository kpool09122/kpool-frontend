import { describe, expect, it } from "vitest";

import { formatContactDate } from "./contactDate";

describe("formatContactDate", () => {
  // Literal expectations are independent of the formatter and the host time zone.
  it.each([
    ["ja", "2026/10/08 0:30"],
    ["en", "Oct 8, 2026, 12:30 AM"],
    ["ko", "2026. 10. 8. 오전 12:30"],
  ])("formats a UTC date crossing midnight in JST while retaining locale %s", (locale, expected) => {
    expect(formatContactDate("2026-10-07T15:30:00Z", locale)).toBe(expected);
    expect(formatContactDate("2026-10-08T00:30:00+09:00", locale)).toBe(expected);
  });

  it.each(["", "invalid-date", "2026-99-99T00:00:00Z"])("preserves the original invalid value %j", (value) => {
    expect(formatContactDate(value, "ja")).toBe(value);
  });
});
