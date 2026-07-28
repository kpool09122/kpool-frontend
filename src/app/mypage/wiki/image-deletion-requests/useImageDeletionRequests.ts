import { useMyPageImageDeletionRequestReview } from "../../useMyPageImageDeletionRequestReview";

type ImageDeletionRequestsParams = Parameters<
  typeof useMyPageImageDeletionRequestReview
>[0];

export const useImageDeletionRequests = (
  params: ImageDeletionRequestsParams,
) => useMyPageImageDeletionRequestReview(params);
