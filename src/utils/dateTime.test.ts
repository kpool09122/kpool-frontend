import { describe, expect, it } from "vitest";
import { formatDateTime } from "./dateTime";

describe("formatDateTime", () => {
  it("converts UTC to the selected time zone independently of the display language", () => {
    const value = "2026-11-05T04:27:01+00:00";
    expect(formatDateTime(value, "ja", { timeZone: "Asia/Tokyo" })).toBe("2026/11/05 13:27");
    expect(formatDateTime(value, "en", { timeZone: "Asia/Tokyo" })).toBe("Nov 5, 2026, 13:27");
    expect(formatDateTime(value, "ko", { timeZone: "Asia/Seoul" })).toBe("2026. 11. 5. 13:27");
    expect(formatDateTime(value, "en", { timeZone: "America/Los_Angeles" })).toBe("Nov 4, 2026, 20:27");
    expect(value).toBe("2026-11-05T04:27:01+00:00");
  });

  it("handles daylight saving time using the zone rules", () => {
    expect(formatDateTime("2026-03-08T06:30:00Z", "en", { timeZone: "America/New_York" })).toBe("Mar 8, 2026, 01:30");
    expect(formatDateTime("2026-03-08T07:30:00Z", "en", { timeZone: "America/New_York" })).toBe("Mar 8, 2026, 03:30");
  });

  it.each(["2026-11-05T04:27:01", "2026-11-05 04:27:01", "2026-11-05T04:27:01Z"])("treats offsetless API timestamp %s as UTC", (value) => {
    expect(formatDateTime(value, "ja", { timeZone: "Asia/Tokyo" })).toBe("2026/11/05 13:27");
  });

  it("respects explicit offsets and converts dates across midnight", () => {
    expect(formatDateTime("2026-11-05T00:27:01+09:00", "ja", { timeZone: "UTC" })).toBe("2026/11/04 15:27");
    expect(formatDateTime("2026-11-05T23:27:01Z", "ja", { timeZone: "Asia/Tokyo", timeStyle: undefined })).toBe("2026/11/06");
  });

  it("leaves calendar dates unchanged even in a different time zone", () => {
    expect(formatDateTime("2026-11-05", "en", { timeZone: "America/Los_Angeles" })).toBe("2026-11-05");
  });

  it.each([null, undefined, "", "invalid"])("uses a fallback for %s without throwing", (value) => {
    expect(formatDateTime(value, "ja", { timeZone: "Asia/Tokyo" })).toBe("-");
    expect(formatDateTime(value, "ja", { fallback: "Never used" })).toBe("Never used");
  });
});
