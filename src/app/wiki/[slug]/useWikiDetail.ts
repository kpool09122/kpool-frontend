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

type UseWikiDetailOptions = {
  themeColor?: string;
};

export const useWikiDetail = (
  slug: string,
  options?: UseWikiDetailOptions,
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
