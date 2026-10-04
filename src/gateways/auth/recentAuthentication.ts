import type { WebAuthnBrowserAdapter } from "@/gateways/auth/webAuthnBrowserAdapter";
import type { PasskeyBrowserApi } from "@/gateways/identity/passkeyBrowserApi";

type SocialProvider = "google" | "line" | "kakao";

export type RecentAuthenticationResult =
  | { status: "verified" }
  | { status: "redirect"; url: string }
  | { status: "error"; kind: "cancelled" | "expired" | "failed" | "unavailable" | "unsupported"; message?: string };

const isSocialProvider = (value: string): value is SocialProvider =>
  value === "google" || value === "line" || value === "kakao";

export const performRecentAuthentication = async ({
  api,
  linkedSocialProviders,
  passkeyCount,
  returnTo,
  webAuthnAdapter,
}: {
  api: Pick<PasskeyBrowserApi, "completeStepUpWithPasskey" | "createStepUpPasskeyOptions" | "createStepUpSocialRedirect">;
  linkedSocialProviders: string[];
  passkeyCount: number;
  returnTo: "passkeys" | "withdrawal";
  webAuthnAdapter: WebAuthnBrowserAdapter;
}): Promise<RecentAuthenticationResult> => {
  if (passkeyCount === 0) {
    const provider = linkedSocialProviders.find(isSocialProvider);

    if (!provider) {
      return { status: "error", kind: "unavailable" };
    }

    const redirectResult = await api.createStepUpSocialRedirect(provider, returnTo);

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
