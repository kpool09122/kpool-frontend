import { useMyPageDraftImageReview } from "../../useMyPageDraftImageReview";

type DraftImagesParams = Parameters<typeof useMyPageDraftImageReview>[0];

export const useDraftImages = (params: DraftImagesParams) =>
  useMyPageDraftImageReview(params);
