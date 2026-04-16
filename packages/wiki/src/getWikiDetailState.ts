import type { WikiDetail } from "./types/wiki";

import { createMockWikiDetail } from "./mockWikiDetail";

type WikiDetailLoadingState = {
  status: "loading";
};

type WikiDetailErrorState = {
  status: "error";
  message: string;
};

type WikiDetailEmptyState = {
  status: "empty";
};

type WikiDetailSuccessState = {
  status: "success";
  data: WikiDetail;
};

export type WikiDetailState =
  | WikiDetailLoadingState
  | WikiDetailErrorState
  | WikiDetailEmptyState
  | WikiDetailSuccessState;

type GetWikiDetailStateOptions = {
  themeColor?: string;
};

export const getWikiDetailState = (
  slug: string,
  options?: GetWikiDetailStateOptions,
): WikiDetailState => {
  if (slug === "loading") {
    return { status: "loading" };
  }

  if (slug === "error") {
    return {
      status: "error",
      message:
        "Wiki details are temporarily unavailable. Please try again later.",
    };
  }

  if (slug === "empty") {
    return { status: "empty" };
  }

  return {
    status: "success",
    data: createMockWikiDetail(slug, { themeColor: options?.themeColor }),
  };
};
