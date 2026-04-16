import { describe, expect, it } from "vitest";

import { getWikiDetailState } from "./getWikiDetailState";

describe("getWikiDetailState", () => {
  it("returns loading, error, and empty states for reserved slugs", () => {
    expect(getWikiDetailState("loading")).toEqual({ status: "loading" });
    expect(getWikiDetailState("empty")).toEqual({ status: "empty" });
    expect(getWikiDetailState("error")).toEqual({
      status: "error",
      message:
        "Wiki details are temporarily unavailable. Please try again later.",
    });
  });

  it("builds a success state with shared mock data", () => {
    expect(getWikiDetailState("aurora-echo", { themeColor: "#4c5cff" })).toMatchObject({
      status: "success",
      data: {
        slug: "aurora-echo",
        themeColor: "#4c5cff",
      },
    });
  });
});
