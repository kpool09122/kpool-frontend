import { z } from "zod";

import type { SignupAccountFormValues } from "./signupFlow";

const emailSendingStatusSchema = z.object({
  context: z.string(),
  remainingSends: z.number().int(),
  retryAt: z.number().nullable(),
});

export type StoredEmailSendingStatus = z.infer<typeof emailSendingStatusSchema>;

const signupProgressSchema = z.object({
  values: z.object({
    email: z.string(),
    accountName: z.string(),
    language: z.string(),
    passkeyDisplayName: z.string(),
    base64EncodedImage: z.string(),
  }),
});

const ignoreSessionStorageFailure = (operation: () => void): void => {
  if (typeof window === "undefined") return;
  try {
    operation();
  } catch {
    // Browser privacy settings and storage quotas must not block authentication flows.
  }
};

const readSessionJson = (key: string): unknown => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(key) ?? "null") as unknown;
  } catch {
    ignoreSessionStorageFailure(() => window.sessionStorage.removeItem(key));
    return null;
  }
};

export const readEmailSendingStatusStorage = (
  storageKey: string,
  context: string,
): StoredEmailSendingStatus | null => {
  const result = emailSendingStatusSchema.safeParse(readSessionJson(storageKey));
  return result.success && result.data.context === context ? result.data : null;
};

export const writeEmailSendingStatusStorage = (
  storageKey: string,
  value: StoredEmailSendingStatus,
): void => ignoreSessionStorageFailure(() =>
  window.sessionStorage.setItem(storageKey, JSON.stringify(value)));

export const clearSessionStorageValue = (storageKey: string): void =>
  ignoreSessionStorageFailure(() => window.sessionStorage.removeItem(storageKey));

export const readSignupProgress = (storageKey: string): SignupAccountFormValues | null => {
  const result = signupProgressSchema.safeParse(readSessionJson(storageKey));
  return result.success && result.data.values.email ? result.data.values : null;
};

export const writeSignupProgress = (
  storageKey: string,
  values: SignupAccountFormValues,
): void => ignoreSessionStorageFailure(() =>
  window.sessionStorage.setItem(storageKey, JSON.stringify({ values })));

export const readRecoveryEmail = (storageKey: string): string | null => {
  const value = readSessionJson(storageKey);
  return typeof value === "string" && value ? value : null;
};

export const writeRecoveryEmail = (storageKey: string, email: string): void =>
  ignoreSessionStorageFailure(() =>
    window.sessionStorage.setItem(storageKey, JSON.stringify(email)));
