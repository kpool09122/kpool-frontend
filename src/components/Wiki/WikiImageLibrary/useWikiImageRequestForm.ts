import { useRef, useState } from "react";

import { readFileAsDataUrl } from "../../ImageCropper";
import {
  isAcceptedWikiImageFile,
  isSafeWikiSourceUrl,
  isWikiImageFileSizeAllowed,
  stripDataUrlPrefix,
  wikiImageMaxBase64Length,
} from "@kpool/wiki";
import {
  type WikiImageLibraryDictionary,
  type WikiImageRequestFormController,
  type WikiImageRequestFormState,
  type WikiImageUsageRequestInput,
} from "./types";

const emptyRequestForm: WikiImageRequestFormState = {
  sourceUrl: "",
  sourceName: "",
  altText: "",
  rightsConfirmed: false,
};

const hasCompleteRequestForm = (
  selectedFile: File | null,
  selectedFileDataUrl: string | null,
  form: WikiImageRequestFormState,
): selectedFile is File =>
  Boolean(selectedFile) &&
  Boolean(selectedFileDataUrl) &&
  form.sourceUrl.trim().length > 0 &&
  isSafeWikiSourceUrl(form.sourceUrl) &&
  form.sourceName.trim().length > 0 &&
  form.altText.trim().length > 0 &&
  form.rightsConfirmed;

export const useWikiImageRequestForm = ({
  isBusy,
  onUpload,
  t,
  uploadError,
}: {
  isBusy: boolean;
  onUpload: (input: WikiImageUsageRequestInput) => unknown;
  t: WikiImageLibraryDictionary;
  uploadError: string | null;
}): WikiImageRequestFormController => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileDataUrl, setSelectedFileDataUrl] = useState<string | null>(null);
  const [cropState, setCropState] = useState<{ file: File; sourceDataUrl: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState<WikiImageRequestFormState>(emptyRequestForm);
  const canSubmitRequest = hasCompleteRequestForm(selectedFile, selectedFileDataUrl, requestForm) && !cropState && !isBusy;
  const errorMessage = localError ?? uploadError;

  const selectFile = (file: File) => {
    setLocalError(null);
    setSuccessMessage(null);

    if (!isAcceptedWikiImageFile(file)) {
      setSelectedFile(null);
      setSelectedFileDataUrl(null);
      setCropState(null);
      setLocalError(t.invalidFormat);
      return;
    }

    if (!isWikiImageFileSizeAllowed(file)) {
      setSelectedFile(null);
      setSelectedFileDataUrl(null);
      setCropState(null);
      setLocalError(t.fileTooLarge);
      return;
    }

    setCropState(null);
    readFileAsDataUrl(file).then((sourceDataUrl) => {
      setCropState({ file, sourceDataUrl });
    }).catch(() => {
      setCropState(null);
      setLocalError(t.readFailed);
    });
  };

  const selectFirstFile = (fileList: FileList | null) => {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    selectFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setSelectedFileDataUrl(null);
    setCropState(null);
  };

  const confirmSelectedFileCrop = (croppedDataUrl: string) => {
    if (!cropState) {
      setLocalError(t.readFailed);
      return;
    }

    if (stripDataUrlPrefix(croppedDataUrl).length > wikiImageMaxBase64Length) {
      setLocalError(t.fileTooLarge);
      return;
    }

    setSelectedFile(cropState.file);
    setSelectedFileDataUrl(croppedDataUrl);
    setCropState(null);
    setLocalError(null);
    setSuccessMessage(null);
  };

  const cancelSelectedFileCrop = () => {
    setCropState(null);
    setLocalError(null);
  };

  const reportImageCropError = (message: string) => {
    setLocalError(message);
  };

  const clearRequest = () => {
    setLocalError(null);
    setIsDragActive(false);
    setSelectedFile(null);
    setSelectedFileDataUrl(null);
    setCropState(null);
    setSuccessMessage(null);
    setRequestForm(emptyRequestForm);
  };

  const submitRequest = () => {
    if (!hasCompleteRequestForm(selectedFile, selectedFileDataUrl, requestForm)) {
      setLocalError(t.requiredFields);
      return;
    }

    setLocalError(null);

    void Promise.resolve(onUpload({
      file: selectedFile,
      base64Image: selectedFileDataUrl ?? "",
      sourceUrl: requestForm.sourceUrl.trim(),
      sourceName: requestForm.sourceName.trim(),
      altText: requestForm.altText.trim(),
      rightsConfirmationAgreed: requestForm.rightsConfirmed,
    })).then(() => {
      setSelectedFile(null);
      setSelectedFileDataUrl(null);
      setCropState(null);
      setRequestForm(emptyRequestForm);
      setSuccessMessage(t.requestSubmitted);
    }).catch((error: unknown) => {
      setLocalError(
        error instanceof Error ? error.message : t.uploadFailed,
      );
    });
  };

  return {
    canSubmitRequest,
    cropState,
    errorMessage,
    inputRef,
    isDragActive,
    requestForm,
    selectedFile,
    selectedFileDataUrl,
    successMessage,
    clearRequest,
    clearSelectedFile,
    cancelSelectedFileCrop,
    confirmSelectedFileCrop,
    reportImageCropError,
    selectFirstFile,
    setCropState,
    setIsDragActive,
    setRequestForm,
    setSelectedFile,
    setSuccessMessage,
    submitRequest,
  };
};
