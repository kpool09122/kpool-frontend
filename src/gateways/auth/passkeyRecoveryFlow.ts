import {
  passkeyBrowserApi,
  type PasskeyBrowserApi,
} from "@/gateways/identity/passkeyBrowserApi";
import {
  webAuthnBrowserAdapter,
  type WebAuthnBrowserAdapter,
  type WebAuthnFailureReason,
} from "./webAuthnBrowserAdapter";

export type PasskeyRecoveryResult =
  | { ok: true }
  | { ok: false; reason: WebAuthnFailureReason | "api"; message?: string };

export type PasskeyRecoveryAdapter = (options: {
  api?: PasskeyBrowserApi;
  displayName: string;
  language?: string;
  recoveryKey: string;
  webAuthn?: WebAuthnBrowserAdapter;
}) => Promise<PasskeyRecoveryResult>;

export const recoverPasskey: PasskeyRecoveryAdapter = async ({
  api = passkeyBrowserApi,
  displayName,
  language,
  recoveryKey,
  webAuthn = webAuthnBrowserAdapter,
}) => {
  if (!webAuthn.isSupported()) {
    return { ok: false, reason: "unsupported" };
  }

  const optionsResult = await api.createRecoveryOptions({ recoveryKey }, language);

  if (!optionsResult.ok) {
    return { ok: false, reason: "api", message: optionsResult.message };
  }

  const credentialResult = await webAuthn.create(optionsResult.data);

  if (!credentialResult.ok) {
    return credentialResult;
  }

  const recoveryResult = await api.recover({
    recoveryKey,
    challengeKey: optionsResult.data.challengeKey,
    displayName,
    credential: credentialResult.credential,
  }, language);

  return recoveryResult.ok
    ? { ok: true }
    : { ok: false, reason: "api", message: recoveryResult.message };
};
