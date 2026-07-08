import {
  parseCreateAccountResult,
  type CreateAccountRequest,
  type CreateAccountResult,
} from "@/gateways/account/accountApi";
import {
  parseIdentitySummary,
  parseVerifyEmailResult,
  type CreateIdentityRequest,
  type IdentitySummary,
  type VerifyEmailRequest,
  type VerifyEmailResult,
} from "@/gateways/identity/identityApi";

export type SignupStepId = "account" | "verification" | "identity";
export type SignupPhase = "account" | "verification" | "identity" | "complete";

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
  identityName: string;
  password: string;
  confirmedPassword: string;
  base64EncodedImage: string;
  invitationToken: string;
};

export type SignupAdapter = {
  createAccount: (
    request: CreateAccountRequest,
    options?: { language: string },
  ) => Promise<CreateAccountResult>;
  verifyEmail: (
    request: VerifyEmailRequest,
    options?: { language: string },
  ) => Promise<VerifyEmailResult>;
  createIdentity: (
    request: CreateIdentityRequest,
    options?: { language: string },
  ) => Promise<IdentitySummary>;
};

export type SignupResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const signupStepLabels: Record<SignupStepId, string> = {
  account: "アカウント情報入力",
  verification: "認証コード入力",
  identity: "登録情報設定",
};

const signupStepOrder: SignupStepId[] = ["account", "verification", "identity"];

const phaseStepIndex: Record<SignupPhase, number> = {
  account: 0,
  verification: 1,
  identity: 2,
  complete: 3,
};

const getActiveStep = (phase: SignupPhase): SignupStepId | null => {
  if (phase === "complete") {
    return null;
  }

  return phase;
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
  const activeStep = getActiveStep(phase);
  const currentIndex = phaseStepIndex[phase];

  return signupStepOrder.map((stepId, index) => {
    const state =
      errorStep === stepId
        ? "error"
        : index < currentIndex
          ? "complete"
          : activeStep === stepId && pending
            ? "processing"
            : activeStep === stepId
              ? "active"
              : "pending";

    return {
      id: stepId,
      label: signupStepLabels[stepId],
      state,
    };
  });
};

export const buildCreateAccountRequest = (
  values: SignupAccountFormValues,
): CreateAccountRequest => ({
  email: values.email,
  accountName: values.accountName,
  accountType: values.accountType,
  identityIdentifier: null,
});

export const buildCreateIdentityRequest = (
  values: SignupAccountFormValues,
): CreateIdentityRequest & { requestLanguage: string } => ({
  identityName: values.identityName,
  email: values.email,
  password: values.password,
  confirmedPassword: values.confirmedPassword,
  base64EncodedImage: values.base64EncodedImage || null,
  invitationToken: values.invitationToken || null,
  requestLanguage: values.language,
});

export const getSignupErrorMessage = async (response: Response): Promise<string> => {
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

  if (response.status === 409) {
    return "このメールアドレスはすでに登録されています。";
  }

  if (response.status === 422) {
    return "入力内容を確認してください。";
  }

  return "登録処理に失敗しました。時間をおいて再度お試しください。";
};

const postJson = async <T>(
  url: string,
  body: unknown,
  parseResponse: (body: unknown) => T,
  options?: { language: string },
): Promise<SignupResult<T>> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...(options?.language ? { "Accept-Language": options.language } : {}),
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return {
      ok: false,
      message: await getSignupErrorMessage(response),
    };
  }

  return {
    ok: true,
    data: parseResponse(await response.json()),
  };
};

export const signupWithApi: SignupAdapter = {
  createAccount: async (request, options) => {
    const result = await postJson<CreateAccountResult>(
      "/api/account/accounts",
      request,
      parseCreateAccountResult,
      options,
    );

    if (!result.ok) {
      throw new Error(result.message);
    }

    return result.data;
  },
  verifyEmail: async (request, options) => {
    const result = await postJson<VerifyEmailResult>(
      "/api/identity/auth/verify-email",
      request,
      parseVerifyEmailResult,
      options,
    );

    if (!result.ok) {
      throw new Error(result.message);
    }

    return result.data;
  },
  createIdentity: async (request, options) => {
    const result = await postJson<IdentitySummary>(
      "/api/identity/auth/register",
      request,
      parseIdentitySummary,
      options,
    );

    if (!result.ok) {
      throw new Error(result.message);
    }

    return result.data;
  },
};
