import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { fetchAccount, fetchAccountDocuments, uploadAccountDocuments } from "@/gateways/account/accountBrowserApi";
import { adminQueryKeys } from "../../queryKeys";
import type { useI18n } from "../../../../i18n/I18nProvider";
import {
  defaultCorporationDocumentCountry,
  defaultIndividualDocumentCountry,
  getDocumentOptionsForAccountType,
  hasRequiredAccountDocuments,
  isAcceptedAccountDocumentFile,
  isAccountDocumentFileSizeAllowed,
  type AccountDocumentType,
  type CorporationDocumentCountry,
  type IndividualDocumentCountry,
} from "./accountDocumentRules";

type UseAccountDocumentsParams = {
  accountIdentifier: string | null;
  t: ReturnType<typeof useI18n>["dictionary"]["admin"];
};

type SelectedDocument = {
  documentType: AccountDocumentType;
  file: File;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const readFileAsBase64 = (file: File) =>
  new Promise((resolve: (value: string) => void, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.includes(",") ? result.split(",").pop() ?? "" : result);
    };
    reader.onerror = () => reject(new Error("file read failed"));
    reader.readAsDataURL(file);
  });

const createUploadRequest = async (
  selectedDocuments: SelectedDocument[],
) => ({
  documents: await Promise.all(selectedDocuments.map(async ({ documentType, file }) => ({
    documentType,
    fileContents: await readFileAsBase64(file),
  }))),
});

export const useAccountDocuments = ({ accountIdentifier, t }: UseAccountDocumentsParams) => {
  const queryClient = useQueryClient();
  const [selectedDocuments, setSelectedDocuments] = useState<SelectedDocument[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [corporationDocumentCountry, setCorporationDocumentCountry] =
    useState<CorporationDocumentCountry>(defaultCorporationDocumentCountry);
  const [individualDocumentCountry, setIndividualDocumentCountry] =
    useState<IndividualDocumentCountry>(defaultIndividualDocumentCountry);
  const accountQueryKey = adminQueryKeys.account.profile(accountIdentifier);
  const documentsQueryKey = adminQueryKeys.account.documents(accountIdentifier);

  const accountQuery = useQuery({
    enabled: Boolean(accountIdentifier),
    queryFn: () => fetchAccount({
      accountIdentifier: accountIdentifier ?? "",
      fallbackErrorMessage: t.accountSettingsLoadFailed,
    }),
    queryKey: accountQueryKey,
    retry: false,
  });
  const documentsQuery = useQuery({
    enabled: Boolean(accountIdentifier),
    queryFn: () => fetchAccountDocuments({
      accountIdentifier: accountIdentifier ?? "",
      fallbackErrorMessage: t.accountDocuments.listLoadFailed,
    }),
    queryKey: documentsQueryKey,
    retry: false,
  });

  const accountType = accountQuery.data?.type;
  const documentOptions = getDocumentOptionsForAccountType(
    accountType,
    corporationDocumentCountry,
    individualDocumentCountry,
  );
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!accountIdentifier) {
        return Promise.reject(new Error(t.accountSettingsUnavailable));
      }

      const requestBody = await createUploadRequest(selectedDocuments);
      return uploadAccountDocuments({
        accountIdentifier,
        fallbackErrorMessage: t.accountDocuments.uploadFailed,
        requestBody,
      });
    },
    onMutate: () => {
      setFormError(null);
      setFormWarning(null);
      setSuccess(null);
    },
    onSuccess: (response) => {
      queryClient.setQueryData(documentsQueryKey, response);
      void queryClient.invalidateQueries({ queryKey: documentsQueryKey });
      setSelectedDocuments([]);
      setSuccess(t.accountDocuments.uploadSucceeded);
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, t.accountDocuments.uploadFailed));
    },
  });

  const updateSelectedFile = (documentType: AccountDocumentType, file: File | null) => {
    setSuccess(null);
    setFormError(null);
    setFormWarning(null);

    if (!file) {
      setSelectedDocuments((current) => current.filter((document) => document.documentType !== documentType));
      return;
    }

    if (!isAcceptedAccountDocumentFile(file)) {
      setFormError(t.accountDocuments.invalidFormat);
      return;
    }

    if (!isAccountDocumentFileSizeAllowed(file)) {
      setFormError(t.accountDocuments.fileTooLarge);
      return;
    }

    setSelectedDocuments((current) => [
      ...current.filter((document) => document.documentType !== documentType),
      { documentType, file },
    ]);
  };

  const updateCorporationDocumentCountry = (country: CorporationDocumentCountry) => {
    setCorporationDocumentCountry(country);
    setSuccess(null);
    setFormError(null);
    setFormWarning(null);

    const allowedDocumentTypes = new Set(
      getDocumentOptionsForAccountType("corporation", country).map((option) => option.documentType),
    );
    setSelectedDocuments((current) =>
      current.filter((document) => allowedDocumentTypes.has(document.documentType)));
  };

  const updateIndividualDocumentCountry = (country: IndividualDocumentCountry) => {
    setIndividualDocumentCountry(country);
    setSuccess(null);
    setFormError(null);
    setFormWarning(null);

    const allowedDocumentTypes = new Set(
      getDocumentOptionsForAccountType("individual", corporationDocumentCountry, country)
        .map((option) => option.documentType),
    );
    setSelectedDocuments((current) =>
      current.filter((document) => allowedDocumentTypes.has(document.documentType)));
  };

  const submit = () => {
    const requestDocuments = selectedDocuments.map(({ documentType }) => ({
      documentType,
      fileContents: "selected",
    }));

    if (!hasRequiredAccountDocuments(accountType, requestDocuments)) {
      setFormWarning(t.accountDocuments.requiredMissing);
      setFormError(null);
      setSuccess(null);
      return;
    }

    uploadMutation.mutate();
  };

  return {
    account: accountQuery.data ?? null,
    corporationDocumentCountry,
    documents: documentsQuery.data?.documents ?? [],
    documentOptions,
    individualDocumentCountry,
    error: formError ?? (accountQuery.error
      ? getErrorMessage(accountQuery.error, t.accountSettingsLoadFailed)
      : documentsQuery.error
        ? getErrorMessage(documentsQuery.error, t.accountDocuments.listLoadFailed)
        : null),
    isLoading: (accountQuery.isFetching && !accountQuery.data) || (documentsQuery.isFetching && !documentsQuery.data),
    isUploading: uploadMutation.isPending,
    selectedDocuments,
    success,
    submit,
    updateCorporationDocumentCountry,
    updateIndividualDocumentCountry,
    updateSelectedFile,
    warning: formWarning,
  };
};
