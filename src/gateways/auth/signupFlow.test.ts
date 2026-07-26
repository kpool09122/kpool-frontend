import { describe, expect, it } from "vitest";

import {
  buildCreateAccountRequest,
  buildCreateIdentityRequest,
  buildInvitationCreateIdentityRequest,
  getSignupStepItems,
  type SignupAccountFormValues,
} from "./signupFlow";

const values: SignupAccountFormValues = {
  email: "member@example.com",
  accountName: "Member Account",
  accountType: "individual",
  language: "ja",
  identityName: "member",
  password: "secret-password",
  confirmedPassword: "secret-password",
  base64EncodedImage: "",
  oneTimeToken: "",
};

describe("signup flow helpers", () => {
  it("builds account and identity requests from form values", () => {
    expect(buildCreateAccountRequest(values)).toEqual({
      email: "member@example.com",
      accountName: "Member Account",
      accountType: "individual",
      identityIdentifier: null,
    });
    expect(buildCreateIdentityRequest(values)).toEqual({
      identityName: "member",
      email: "member@example.com",
      password: "secret-password",
      confirmedPassword: "secret-password",
      base64EncodedImage: null,
      oneTimeToken: null,
      requestLanguage: "ja",
    });
  });



  it("builds invitation identity requests with oneTimeToken and no account data", () => {
    expect(buildInvitationCreateIdentityRequest({
      email: "invited@example.com",
      identityName: "Invited Member",
      password: "secret-password",
      confirmedPassword: "secret-password",
      oneTimeToken: "invite-token-123",
      language: "ja",
    })).toEqual({
      identityName: "Invited Member",
      email: "invited@example.com",
      password: "secret-password",
      confirmedPassword: "secret-password",
      base64EncodedImage: null,
      oneTimeToken: "invite-token-123",
      requestLanguage: "ja",
    });
  });

  it("marks the current step and completed steps for the visible progress", () => {
    expect(
      getSignupStepItems({
        phase: "verification",
        pending: false,
        errorStep: null,
      }),
    ).toEqual([
      { id: "account", label: "アカウント情報入力", state: "complete" },
      { id: "verification", label: "認証コード入力", state: "active" },
      { id: "identity", label: "登録情報設定", state: "pending" },
    ]);
  });

  it("marks the step that failed", () => {
    expect(
      getSignupStepItems({
        phase: "verification",
        pending: false,
        errorStep: "verification",
      })[1],
    ).toEqual({
      id: "verification",
      label: "認証コード入力",
      state: "error",
    });
  });
});
