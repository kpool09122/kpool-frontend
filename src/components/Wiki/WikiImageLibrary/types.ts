import { type Dispatch, type RefObject, type SetStateAction } from "react";

import {
  type WikiImageListResponse,
  type WikiUploadedImage,
} from "@kpool/wiki";
import { type useI18n } from "../../../i18n/I18nProvider";

export type WikiImageLibraryTab = "images" | "request";

export type WikiImageUsageRequestInput = {
  file: File;
  base64Image: string;
  sourceUrl: string;
  sourceName: string;
  altText: string;
  rightsConfirmationAgreed: boolean;
};

export type WikiImageRequestFormState = {
  sourceUrl: string;
  sourceName: string;
  altText: string;
  rightsConfirmed: boolean;
};

export type WikiImageLibraryDictionary = ReturnType<typeof useI18n>["dictionary"]["wiki"]["imageLibrary"];

export type WikiImageLibraryProps = {
  images: WikiUploadedImage[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  isOpen: boolean;
  isUploading: boolean;
  loadError: string | null;
  pageInfo: Pick<WikiImageListResponse, "current_page" | "last_page" | "total"> | null;
  resourceType: string;
  uploadError: string | null;
  onClose: () => void;
  onLoadMore: () => void;
  onSelectImage?: (image: WikiUploadedImage) => void;
  onUpload: (input: WikiImageUsageRequestInput) => unknown;
};

export type WikiImageRequestFormController = {
  canSubmitRequest: boolean;
  errorMessage: string | null;
  isDragActive: boolean;
  requestForm: WikiImageRequestFormState;
  selectedFile: File | null;
  successMessage: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  clearRequest: () => void;
  selectFirstFile: (fileList: FileList | null) => void;
  setIsDragActive: Dispatch<SetStateAction<boolean>>;
  setRequestForm: Dispatch<SetStateAction<WikiImageRequestFormState>>;
  setSelectedFile: Dispatch<SetStateAction<File | null>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
  submitRequest: () => unknown;
};
