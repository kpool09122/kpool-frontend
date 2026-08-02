import type { UploadAccountDocumentsRequest } from "@/gateways/account/accountApi";

export type AccountDocumentType =
  | "business_registration"
  | "corporate_registry"
  | "incorporation_document"
  | "representative_id"
  | "resident_registration"
  | "passport"
  | "driver_license"
  | "selfie";

export type AccountDocumentOption = {
  documentType: AccountDocumentType;
  group: "identity" | "registration" | "selfie";
};

export const corporateDocumentOptions: AccountDocumentOption[] = [
  { documentType: "business_registration", group: "registration" },
  { documentType: "corporate_registry", group: "registration" },
  { documentType: "incorporation_document", group: "registration" },
  { documentType: "representative_id", group: "identity" },
];

export const individualDocumentOptions: AccountDocumentOption[] = [
  { documentType: "resident_registration", group: "identity" },
  { documentType: "passport", group: "identity" },
  { documentType: "driver_license", group: "identity" },
  { documentType: "selfie", group: "selfie" },
];

export const acceptedAccountDocumentMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const acceptedAccountDocumentExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp"] as const;
export const accountDocumentAccept = acceptedAccountDocumentExtensions.join(",");
export const maxAccountDocumentFileSizeBytes = 10 * 1024 * 1024;

export const getDocumentOptionsForAccountType = (accountType: string | null | undefined) =>
  accountType === "corporation"
    ? corporateDocumentOptions
    : accountType === "individual"
      ? individualDocumentOptions
      : [];

export const isAcceptedAccountDocumentFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase();
  return acceptedAccountDocumentMimeTypes.includes(file.type as typeof acceptedAccountDocumentMimeTypes[number]) &&
    acceptedAccountDocumentExtensions.some((extension) => lowerName.endsWith(extension));
};

export const isAccountDocumentFileSizeAllowed = (file: File): boolean =>
  file.size <= maxAccountDocumentFileSizeBytes;

export const hasRequiredAccountDocuments = (
  accountType: string | null | undefined,
  documents: UploadAccountDocumentsRequest["documents"],
): boolean => {
  const selectedTypes = new Set(documents.map((document) => document.documentType));

  if (selectedTypes.size !== documents.length) {
    return false;
  }

  if (accountType === "corporation") {
    return selectedTypes.has("representative_id") &&
      ["business_registration", "corporate_registry", "incorporation_document"].some((type) => selectedTypes.has(type));
  }

  if (accountType === "individual") {
    return selectedTypes.has("selfie") &&
      ["resident_registration", "passport", "driver_license"].some((type) => selectedTypes.has(type));
  }

  return false;
};
