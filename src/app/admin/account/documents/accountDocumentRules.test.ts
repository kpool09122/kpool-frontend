import { describe, expect, it } from "vitest";

import {
  hasRequiredAccountDocuments,
  isAcceptedAccountDocumentFile,
  isAccountDocumentFileSizeAllowed,
  maxAccountDocumentFileSizeBytes,
} from "./accountDocumentRules";

describe("account document rules", () => {
  it("requires one corporation registration document and representative ID", () => {
    expect(hasRequiredAccountDocuments("corporation", [
      { documentType: "business_registration", fileContents: "a" },
      { documentType: "representative_id", fileContents: "b" },
    ])).toBe(true);
    expect(hasRequiredAccountDocuments("corporation", [
      { documentType: "business_registration", fileContents: "a" },
    ])).toBe(false);
  });

  it("requires one individual identity document and selfie", () => {
    expect(hasRequiredAccountDocuments("individual", [
      { documentType: "passport", fileContents: "a" },
      { documentType: "selfie", fileContents: "b" },
    ])).toBe(true);
    expect(hasRequiredAccountDocuments("individual", [
      { documentType: "passport", fileContents: "a" },
    ])).toBe(false);
  });

  it("rejects duplicate document types and unsupported file formats", () => {
    expect(hasRequiredAccountDocuments("individual", [
      { documentType: "passport", fileContents: "a" },
      { documentType: "passport", fileContents: "b" },
      { documentType: "selfie", fileContents: "c" },
    ])).toBe(false);
    expect(isAcceptedAccountDocumentFile(new File(["a"], "passport.pdf", { type: "application/pdf" }))).toBe(true);
    expect(isAcceptedAccountDocumentFile(new File(["a"], "passport.gif", { type: "image/gif" }))).toBe(false);
    expect(isAccountDocumentFileSizeAllowed(new File(["a"], "passport.pdf", { type: "application/pdf" }))).toBe(true);
    expect(isAccountDocumentFileSizeAllowed(new File([new Uint8Array(maxAccountDocumentFileSizeBytes + 1)], "passport.pdf", { type: "application/pdf" }))).toBe(false);
  });
});
