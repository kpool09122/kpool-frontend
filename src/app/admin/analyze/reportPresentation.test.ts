import { describe, expect, it } from "vitest";
import { averageEngagementSeconds, formatMetricValue } from "./reportPresentation";

describe("average engagement time", () => {
  it("divides the aggregate duration by its matching aggregate denominator", () => {
    expect(averageEngagementSeconds("120", 8)).toBe(15);
    expect(averageEngagementSeconds("80", 4)).toBe(20);
    expect(averageEngagementSeconds("0", 2)).toBe(0);
    expect(formatMetricValue("12.3456", "ja", { averageTime: true, denominator: 5, seconds: "秒" })).toBe("2.47 秒");
  });
  it.each([null, undefined, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "does not fabricate an average for denominator %s", (denominator) => {
      expect(averageEngagementSeconds("120", denominator)).toBeNull();
      expect(formatMetricValue("120", "ja", { averageTime: true, denominator, seconds: "秒" })).toBe("—");
    },
  );
  it.each([null, undefined, "", "invalid", "Infinity", "-1"])(
    "does not fabricate an average for total %s", (total) => {
      expect(averageEngagementSeconds(total, 2)).toBeNull();
    },
  );
  it("preserves exact large counts for other metrics", () => {
    expect(formatMetricValue("9007199254740993", "ja", { seconds: "秒" })).toBe("9,007,199,254,740,993");
  });
  it.each([
    ["119340.000000000", "119,340"],
    ["0.000000000", "0"],
    ["9007199254740993.000000000", "9,007,199,254,740,993"],
  ])("formats decimal-backed count %s without fractional digits", (value, expected) => {
    expect(formatMetricValue(value, "ja", { seconds: "秒" })).toBe(expected);
  });

});
