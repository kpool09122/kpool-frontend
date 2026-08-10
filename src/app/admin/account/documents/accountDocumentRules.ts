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

export type CorporationDocumentCountry = "japan" | "korea" | "other";
export type IndividualDocumentCountry = "japan" | "korea" | "other";

export const corporationDocumentCountries: CorporationDocumentCountry[] = ["japan", "korea", "other"];
export const defaultCorporationDocumentCountry: CorporationDocumentCountry = "japan";
export const individualDocumentCountries: IndividualDocumentCountry[] = ["japan", "korea", "other"];
export const defaultIndividualDocumentCountry: IndividualDocumentCountry = "japan";

const corporationRegistrationDocumentByCountry: Record<CorporationDocumentCountry, AccountDocumentType> = {
  japan: "corporate_registry",
  korea: "business_registration",
  other: "incorporation_document",
};

const individualIdentityDocumentsByCountry: Record<IndividualDocumentCountry, AccountDocumentType[]> = {
  japan: ["passport", "driver_license"],
  korea: ["resident_registration", "passport", "driver_license"],
  other: ["passport"],
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
  "image/heic",
  "image/heif",
] as const;

export const acceptedAccountDocumentExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"] as const;
export const accountDocumentAccept = acceptedAccountDocumentExtensions.join(",");
export const maxAccountDocumentFileSizeBytes = 10 * 1024 * 1024;

export const getDocumentOptionsForAccountType = (
  accountType: string | null | undefined,
  corporationDocumentCountry: CorporationDocumentCountry = defaultCorporationDocumentCountry,
  individualDocumentCountry: IndividualDocumentCountry = defaultIndividualDocumentCountry,
) =>
  accountType === "corporation"
    ? corporateDocumentOptions.filter((option) =>
      option.group === "identity" ||
      option.documentType === corporationRegistrationDocumentByCountry[corporationDocumentCountry])
    : accountType === "individual"
      ? individualDocumentOptions.filter((option) =>
        option.group === "selfie" ||
        individualIdentityDocumentsByCountry[individualDocumentCountry].includes(option.documentType))
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
