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
  data: ReturnType<typeof createMockWikiDetail>;
};

export type WikiDetailState =
  | WikiDetailLoadingState
  | WikiDetailErrorState
  | WikiDetailEmptyState
  | WikiDetailSuccessState;

export const useWikiDetail = (wikiId: string): WikiDetailState => {
  if (wikiId === "loading") {
    return { status: "loading" };
  }

  if (wikiId === "error") {
    return {
      status: "error",
      message:
        "Wiki details are temporarily unavailable. Please try again later.",
    };
  }

  if (wikiId === "empty") {
    return { status: "empty" };
  }

  return {
    status: "success",
    data: createMockWikiDetail(wikiId),
  };
};
