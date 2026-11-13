import { useRef, useState } from "react";

import { readFileAsDataUrl } from "../../ImageCropper";
import {
  isAcceptedWikiImageFile,
  isSafeWikiSourceUrl,
  isWikiImageFileSizeAllowed,
  stripDataUrlPrefix,
  wikiImageAuthorMaxLength,
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
  author: "",
  license: "",
  altText: "",
  rightsConfirmed: false,
};

const getRequestInput = (
  file: File | null,
  base64Image: string | null,
  form: WikiImageRequestFormState,
): WikiImageUsageRequestInput | null => {
  const sourceUrl = form.sourceUrl.trim();
  const sourceName = form.sourceName.trim();
  const author = form.author.trim();
  const altText = form.altText.trim();

  if (
    !file || !base64Image ||
    !isSafeWikiSourceUrl(sourceUrl) || !sourceName ||
    !author || author.length > wikiImageAuthorMaxLength || !form.license ||
    !altText || !form.rightsConfirmed
  ) {
    return null;
  }

  return {
    file,
    base64Image,
    sourceUrl,
    sourceName,
    author,
    license: form.license,
    altText,
    rightsConfirmationAgreed: form.rightsConfirmed,
  };
};

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
  const requestInput = getRequestInput(selectedFile, selectedFileDataUrl, requestForm);
  const canSubmitRequest = requestInput !== null && !cropState && !isBusy;
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
    if (!requestInput) {
      setLocalError(t.requiredFields);
      return;
    }

    setLocalError(null);

    void Promise.resolve(onUpload(requestInput)).then(() => {
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
