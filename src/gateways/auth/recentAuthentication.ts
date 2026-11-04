import type { WebAuthnBrowserAdapter } from "@/gateways/auth/webAuthnBrowserAdapter";
import type { PasskeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";

export type SocialProvider = "google" | "line" | "kakao";

export type RecentAuthenticationMethod = "passkey" | SocialProvider;

export const getRecentAuthenticationMethods = (passkeyCount: number, linkedSocialProviders: string[]): RecentAuthenticationMethod[] => [
  ...(passkeyCount > 0 ? ["passkey" as const] : []),
  ...Array.from(new Set(linkedSocialProviders.filter(isSocialProvider))),
];

export type RecentAuthenticationResult =
  | { status: "verified" }
  | { status: "redirect"; url: string }
  | { status: "error"; kind: "cancelled" | "expired" | "failed" | "unavailable" | "unsupported"; message?: string };

const isSocialProvider = (value: string): value is SocialProvider =>
  value === "google" || value === "line" || value === "kakao";

export const performRecentAuthentication = async ({
  api,
  method,
  returnTo,
  webAuthnAdapter,
}: {
  api: Pick<PasskeyBrowserApi, "completeStepUpWithPasskey" | "createStepUpPasskeyOptions" | "createStepUpSocialRedirect">;
  method: RecentAuthenticationMethod;
  returnTo: "passkeys" | "withdrawal";
  webAuthnAdapter: WebAuthnBrowserAdapter;
}): Promise<RecentAuthenticationResult> => {
  if (method !== "passkey") {
    const redirectResult = await api.createStepUpSocialRedirect(method, returnTo);

    return redirectResult.ok
      ? { status: "redirect", url: redirectResult.data.redirectUrl }
      : { status: "error", kind: "failed", message: redirectResult.message };
  }

  if (!webAuthnAdapter.isSupported()) {
    return { status: "error", kind: "unsupported" };
  }

  const optionsResult = await api.createStepUpPasskeyOptions();

  if (!optionsResult.ok) {
    return { status: "error", kind: "failed", message: optionsResult.message };
  }

  const credentialResult = await webAuthnAdapter.get(optionsResult.data);

  if (!credentialResult.ok) {
    return {
      status: "error",
      kind: credentialResult.reason === "cancelled"
        ? "cancelled"
        : credentialResult.reason === "unsupported"
          ? "unsupported"
          : "failed",
    };
  }

  const verificationResult = await api.completeStepUpWithPasskey({
    challengeKey: optionsResult.data.challengeKey,
    credential: credentialResult.credential,
  });

  if (!verificationResult.ok) {
    return {
      status: "error",
      kind: verificationResult.status === 401 || verificationResult.status === 419
        ? "expired"
        : "failed",
      message: verificationResult.message,
    };
  }

  return { status: "verified" };
};
