import {
  parseVerifyEmailResult,
  type CreatePasskeyRegistrationOptionsRequest,
  type IdentitySummary,
  type PasskeyRegistrationCredential,
  type PasskeyRegistrationOptionsResult,
  type RegisterWithPasskeyRequest,
  type SendAuthCodeRequest,
  type VerifyEmailRequest,
  type VerifyEmailResult,
} from "@/gateways/identity/identityApi";
import { passkeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";

export type SignupStepId = "account" | "verification" | "passkey";
export type SignupPhase = SignupStepId | "complete";

export type SignupStepState = "pending" | "active" | "processing" | "complete" | "error";

export type SignupStepItem = {
  id: SignupStepId;
  label: string;
  state: SignupStepState;
};

export type SignupAccountFormValues = {
  email: string;
  accountName: string;
  accountType: string;
  language: string;
  passkeyDisplayName: string;
  base64EncodedImage: string;
};

type RequestLanguageOptions = { language: string };

export type SignupAdapter = {
  sendAuthCode: (request: SendAuthCodeRequest, options?: RequestLanguageOptions) => Promise<void>;
  verifyEmail: (request: VerifyEmailRequest, options?: RequestLanguageOptions) => Promise<VerifyEmailResult>;
  createRegistrationOptions: (
    request: CreatePasskeyRegistrationOptionsRequest,
    options?: RequestLanguageOptions,
  ) => Promise<PasskeyRegistrationOptionsResult>;
  registerWithPasskey: (
    request: RegisterWithPasskeyRequest,
    options?: RequestLanguageOptions,
  ) => Promise<IdentitySummary>;
};

const signupStepLabels: Record<SignupStepId, string> = {
  account: "アカウント情報入力",
  verification: "認証コード入力",
  passkey: "パスキー登録",
};

const signupStepOrder: SignupStepId[] = ["account", "verification", "passkey"];

const phaseStepIndex: Record<SignupPhase, number> = {
  account: 0,
  verification: 1,
  passkey: 2,
  complete: 3,
};

export const getSignupStepItems = ({
  phase,
  pending,
  errorStep,
}: {
  phase: SignupPhase;
  pending: boolean;
  errorStep: SignupStepId | null;
}): SignupStepItem[] => {
  const currentIndex = phaseStepIndex[phase];

  return signupStepOrder.map((stepId, index) => ({
    id: stepId,
    label: signupStepLabels[stepId],
    state: errorStep === stepId
      ? "error"
      : index < currentIndex
        ? "complete"
        : phase === stepId && pending
          ? "processing"
          : phase === stepId
            ? "active"
            : "pending",
  }));
};

export const buildRegistrationOptionsRequest = (
  values: SignupAccountFormValues,
  oneTimeToken?: string,
): CreatePasskeyRegistrationOptionsRequest => ({
  email: values.email,
  accountType: oneTimeToken ? null : values.accountType,
  oneTimeToken: oneTimeToken || null,
  return_to: "/admin",
});

export const buildRegisterWithPasskeyRequest = ({
  values,
  challengeKey,
  credential,
  identityName = values.accountName,
}: {
  values: SignupAccountFormValues;
  challengeKey: string;
  credential: PasskeyRegistrationCredential;
  identityName?: string;
}): RegisterWithPasskeyRequest => ({
  challengeKey,
  identityName,
  displayName: values.passkeyDisplayName,
  base64EncodedImage: values.base64EncodedImage || null,
  credential,
});

const getSignupErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as unknown;

    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }
  } catch {
    return "登録処理に失敗しました。時間をおいて再度お試しください。";
  }

  return response.status === 422
    ? "入力内容を確認してください。"
    : "登録処理に失敗しました。時間をおいて再度お試しください。";
};

const postJson = async <T>(
  url: string,
  body: unknown,
  parseResponse: (body: unknown) => T,
  options?: RequestLanguageOptions,
): Promise<T> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(options?.language ? { "Accept-Language": options.language } : {}),
      "Content-Type": "application/json",
    },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await getSignupErrorMessage(response));
  }

  const text = await response.text();

  return parseResponse(text ? JSON.parse(text) as unknown : {});
};

export const signupWithApi: SignupAdapter = {
  sendAuthCode: async (request, options) => {
    await postJson("/api/identity/auth/send-auth-code", request, () => undefined, options);
  },
  verifyEmail: (request, options) => postJson(
    "/api/identity/auth/verify-email",
    request,
    parseVerifyEmailResult,
    options,
  ),
  createRegistrationOptions: async (request, options) => {
    const result = await passkeyBrowserApi.createRegistrationOptions(request, options?.language);

    if (!result.ok) {
      throw new Error(result.message);
    }

    return result.data;
  },
  registerWithPasskey: async (request, options) => {
    const result = await passkeyBrowserApi.register(request, options?.language);

    if (!result.ok) {
      throw new Error(result.message);
    }

    return result.data;
  },
};
