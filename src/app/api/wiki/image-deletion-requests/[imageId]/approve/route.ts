import { createWikiImageDeletionRequestReviewRoute } from "../reviewRoute";

export const POST = createWikiImageDeletionRequestReviewRoute(
  "approve",
  "wiki image deletion request approve response",
);
