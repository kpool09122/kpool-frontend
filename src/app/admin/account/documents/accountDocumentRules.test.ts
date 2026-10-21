import { describe, expect, it } from "vitest";

import {
  getDocumentOptionsForAccountType,
  isAcceptedAccountDocumentFile,
  isAccountDocumentFileSizeAllowed,
  maxAccountDocumentFileSizeBytes,
} from "./accountDocumentRules";

describe("account document rules", () => {
  it("filters corporation registration document options by selected country", () => {
    expect(getDocumentOptionsForAccountType("corporation", "japan")).toEqual([
      { documentType: "corporate_registry", group: "registration" },
      { documentType: "representative_id", group: "identity" },
    ]);
    expect(getDocumentOptionsForAccountType("corporation", "korea")).toEqual([
      { documentType: "business_registration", group: "registration" },
      { documentType: "representative_id", group: "identity" },
    ]);
    expect(getDocumentOptionsForAccountType("corporation", "other")).toEqual([
      { documentType: "incorporation_document", group: "registration" },
      { documentType: "representative_id", group: "identity" },
    ]);
  });

  it("filters individual identity document options by selected country", () => {
    expect(getDocumentOptionsForAccountType("individual", "japan", "japan")).toEqual([
      { documentType: "passport", group: "identity" },
      { documentType: "driver_license", group: "identity" },
      { documentType: "selfie", group: "selfie" },
    ]);
    expect(getDocumentOptionsForAccountType("individual", "japan", "korea")).toEqual([
      { documentType: "resident_registration", group: "identity" },
      { documentType: "passport", group: "identity" },
      { documentType: "driver_license", group: "identity" },
      { documentType: "selfie", group: "selfie" },
    ]);
    expect(getDocumentOptionsForAccountType("individual", "japan", "other")).toEqual([
      { documentType: "passport", group: "identity" },
      { documentType: "selfie", group: "selfie" },
    ]);
  });

  it("validates document file formats and sizes", () => {
    expect(isAcceptedAccountDocumentFile(new File(["a"], "passport.pdf", { type: "application/pdf" }))).toBe(true);
    expect(isAcceptedAccountDocumentFile(new File(["a"], "selfie.heic", { type: "image/heic" }))).toBe(true);
    expect(isAcceptedAccountDocumentFile(new File(["a"], "selfie.heif", { type: "image/heif" }))).toBe(true);
    expect(isAcceptedAccountDocumentFile(new File(["a"], "passport.gif", { type: "image/gif" }))).toBe(false);
    expect(isAccountDocumentFileSizeAllowed(new File(["a"], "passport.pdf", { type: "application/pdf" }))).toBe(true);
    expect(isAccountDocumentFileSizeAllowed(new File([new Uint8Array(maxAccountDocumentFileSizeBytes + 1)], "passport.pdf", { type: "application/pdf" }))).toBe(false);
  });
});
