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

  it("returns a dedicated TWICE namuwiki compatibility demo mock", () => {
    const state = getWikiDetailState("twice");

    expect(state).toMatchObject({
      status: "success",
      data: {
        slug: "twice",
        basic: {
          name: "TWICE",
        },
      },
    });

    if (state.status !== "success") {
      return;
    }

    expect(state.data.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Overview",
        }),
        expect.objectContaining({
          title: "Members",
        }),
        expect.objectContaining({
          title: "History",
        }),
      ]),
    );
  });

  it("returns dedicated TWICE member mocks for related profile cards", () => {
    const state = getWikiDetailState("nayeon-twice");

    expect(state).toMatchObject({
      status: "success",
      data: {
        slug: "nayeon-twice",
        basic: {
          name: "나연",
        },
      },
    });
  });
});
