import { describe, expect, it } from "vitest";

import { getAdministrativeAreaOptions } from "./accountAddressOptions";

describe("account address options", () => {
  it("uses CLDR English subdivision labels", () => {
    expect(getAdministrativeAreaOptions("US", "en")).toContainEqual({
      code: "FL",
      label: "Florida",
    });
    expect(getAdministrativeAreaOptions("CA", "en")).toContainEqual({
      code: "AB",
      label: "Alberta",
    });
  });

  it("uses Japanese subdivision overrides missing from CLDR", () => {
    expect(getAdministrativeAreaOptions("JP", "ja")).toContainEqual({
      code: "33",
      label: "岡山県",
    });
    expect(getAdministrativeAreaOptions("CA", "ja")).toContainEqual({
      code: "AB",
      label: "アルバータ",
    });
    expect(getAdministrativeAreaOptions("TH", "ja")).toContainEqual({
      code: "10",
      label: "バンコク",
    });
    expect(getAdministrativeAreaOptions("PH", "ja")).toContainEqual({
      code: "CEB",
      label: "セブ",
    });
  });

  it("uses Korean subdivision overrides missing from CLDR", () => {
    expect(getAdministrativeAreaOptions("JP", "ko")).toContainEqual({
      code: "33",
      label: "오카야마현",
    });
    expect(getAdministrativeAreaOptions("KR", "ko")).toContainEqual({
      code: "11",
      label: "서울",
    });
    expect(getAdministrativeAreaOptions("TH", "ko")).toContainEqual({
      code: "10",
      label: "방콕",
    });
    expect(getAdministrativeAreaOptions("PH", "ko")).toContainEqual({
      code: "CEB",
      label: "세부",
    });
    expect(getAdministrativeAreaOptions("VN", "ko")).toContainEqual({
      code: "SG",
      label: "호찌민",
    });
  });
});
