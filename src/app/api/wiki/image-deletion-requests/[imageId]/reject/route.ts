import { createWikiImageDeletionRequestReviewRoute } from "../reviewRoute";

export const POST = createWikiImageDeletionRequestReviewRoute(
  "reject",
  "wiki image deletion request reject response",
);
