import { describe, expect, it } from "vitest";

import {
  buildRegistrationOptionsRequest,
  buildRegisterWithPasskeyRequest,
  getSignupStepItems,
  type SignupAccountFormValues,
} from "./signupFlow";

const values: SignupAccountFormValues = {
  email: "member@example.com",
  accountName: "Member Account",
  accountType: "individual",
  language: "ja",
  passkeyDisplayName: "MacBook",
  base64EncodedImage: "",
};

const credential = {
  id: "credential-id",
  rawId: "AQID",
  type: "public-key" as const,
  response: { clientDataJSON: "AQID", attestationObject: "AQID", transports: ["internal"] },
  authenticatorAttachment: null,
  clientExtensionResults: {},
};

describe("signup flow helpers", () => {
  it("builds registration options without password data", () => {
    expect(buildRegistrationOptionsRequest(values)).toEqual({
      email: "member@example.com",
      accountType: "individual",
      oneTimeToken: null,
      return_to: "/admin",
    });
  });

  it("builds passkey registration from the challenge and credential", () => {
    expect(buildRegisterWithPasskeyRequest({ values, challengeKey: "11111111-1111-4111-8111-111111111111", credential })).toEqual({
      challengeKey: "11111111-1111-4111-8111-111111111111",
      identityName: "Member Account",
      displayName: "MacBook",
      base64EncodedImage: null,
      credential,
    });
  });

  it("passes invitation tokens and omits account type", () => {
    expect(buildRegistrationOptionsRequest(values, "invite-token")).toEqual({
      email: "member@example.com",
      accountType: null,
      oneTimeToken: "invite-token",
      return_to: "/admin",
    });
  });

  it("marks current and failed steps", () => {
    expect(getSignupStepItems({ phase: "passkey", pending: false, errorStep: null })).toEqual([
      { id: "account", label: "アカウント情報入力", state: "complete" },
      { id: "verification", label: "認証コード入力", state: "complete" },
      { id: "passkey", label: "パスキー登録", state: "active" },
    ]);
    expect(getSignupStepItems({ phase: "passkey", pending: false, errorStep: "passkey" })[2]?.state).toBe("error");
  });
});
