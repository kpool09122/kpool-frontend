import { useRef, useState } from "react";

import {
  isAcceptedWikiImageFile,
  isSafeWikiSourceUrl,
  isWikiImageFileSizeAllowed,
} from "../../../app/wiki/wikiImageModel";
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

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("file-read-failed"));
    });
    reader.addEventListener("error", () => reject(new Error("file-read-failed")));
    reader.readAsDataURL(file);
  });

const hasCompleteRequestForm = (
  selectedFile: File | null,
  form: WikiImageRequestFormState,
): selectedFile is File =>
  Boolean(selectedFile) &&
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
  onUpload: (input: WikiImageUsageRequestInput) => Promise<void>;
  t: WikiImageLibraryDictionary;
  uploadError: string | null;
}): WikiImageRequestFormController => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState<WikiImageRequestFormState>(emptyRequestForm);
  const canSubmitRequest = hasCompleteRequestForm(selectedFile, requestForm) && !isBusy;
  const errorMessage = localError ?? uploadError;

  const selectFile = (file: File) => {
    setLocalError(null);
    setSuccessMessage(null);

    if (!isAcceptedWikiImageFile(file)) {
      setSelectedFile(null);
      setLocalError(t.invalidFormat);
      return;
    }

    if (!isWikiImageFileSizeAllowed(file)) {
      setSelectedFile(null);
      setLocalError(t.fileTooLarge);
      return;
    }

    setSelectedFile(file);
  };

  const selectFirstFile = (fileList: FileList | null) => {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    selectFile(file);
  };

  const clearRequest = () => {
    setLocalError(null);
    setIsDragActive(false);
    setSelectedFile(null);
    setSuccessMessage(null);
    setRequestForm(emptyRequestForm);
  };

  const submitRequest = async () => {
    if (!hasCompleteRequestForm(selectedFile, requestForm)) {
      setLocalError(t.requiredFields);
      return;
    }

    setLocalError(null);

    try {
      const base64Image = await readFileAsDataUrl(selectedFile);
      await onUpload({
        file: selectedFile,
        base64Image,
        sourceUrl: requestForm.sourceUrl.trim(),
        sourceName: requestForm.sourceName.trim(),
        altText: requestForm.altText.trim(),
        rightsConfirmationAgreed: requestForm.rightsConfirmed,
      });
      setSelectedFile(null);
      setRequestForm(emptyRequestForm);
      setSuccessMessage(t.requestSubmitted);
    } catch (error) {
      setLocalError(
        error instanceof Error && error.message !== "file-read-failed"
          ? error.message
          : t.readFailed,
      );
    }
  };

  return {
    canSubmitRequest,
    errorMessage,
    inputRef,
    isDragActive,
    requestForm,
    selectedFile,
    successMessage,
    clearRequest,
    selectFirstFile,
    setIsDragActive,
    setRequestForm,
    setSelectedFile,
    setSuccessMessage,
    submitRequest,
  };
};
