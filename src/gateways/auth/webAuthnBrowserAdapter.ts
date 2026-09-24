import type {
  PasskeyAuthenticationCredential,
  PasskeyAuthenticationOptionsResult,
  PasskeyRegistrationCredential,
  PasskeyRegistrationOptionsResult,
} from "@/gateways/identity/identityApi";

export type WebAuthnFailureReason = "cancelled" | "error" | "invalid-response" | "unsupported";

export type WebAuthnResult<T> =
  | { ok: true; credential: T }
  | { ok: false; reason: WebAuthnFailureReason };

type CredentialsAdapter = Pick<CredentialsContainer, "create" | "get">;

const getCredentialsAdapter = (): CredentialsAdapter | null => {
  if (
    typeof window === "undefined" ||
    typeof window.PublicKeyCredential === "undefined" ||
    typeof navigator === "undefined" ||
    !navigator.credentials
  ) {
    return null;
  }

  return navigator.credentials;
};

export const isWebAuthnSupported = (): boolean => getCredentialsAdapter() !== null;

export const base64UrlToArrayBuffer = (value: string): ArrayBuffer => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return bytes.buffer;
};

export const arrayBufferToBase64Url = (value: ArrayBuffer): string => {
  const bytes = new Uint8Array(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const mapCredentialDescriptor = (
  descriptor: PasskeyRegistrationOptionsResult["options"]["excludeCredentials"][number],
): PublicKeyCredentialDescriptor => ({
  id: base64UrlToArrayBuffer(descriptor.id),
  type: "public-key",
  ...(descriptor.transports
    ? { transports: descriptor.transports as AuthenticatorTransport[] }
    : {}),
});

export const toRegistrationPublicKeyOptions = (
  result: PasskeyRegistrationOptionsResult,
): PublicKeyCredentialCreationOptions => ({
  ...result.options,
  challenge: base64UrlToArrayBuffer(result.options.challenge),
  user: {
    ...result.options.user,
    id: base64UrlToArrayBuffer(result.options.user.id),
  },
  pubKeyCredParams: result.options.pubKeyCredParams as PublicKeyCredentialParameters[],
  excludeCredentials: result.options.excludeCredentials.map(mapCredentialDescriptor),
  authenticatorSelection: result.options.authenticatorSelection as AuthenticatorSelectionCriteria,
  attestation: result.options.attestation as AttestationConveyancePreference,
});

export const toAuthenticationPublicKeyOptions = (
  result: PasskeyAuthenticationOptionsResult,
): PublicKeyCredentialRequestOptions => ({
  ...result.options,
  challenge: base64UrlToArrayBuffer(result.options.challenge),
  allowCredentials: result.options.allowCredentials.map(mapCredentialDescriptor),
  userVerification: result.options.userVerification as UserVerificationRequirement,
});

const getFailureReason = (error: unknown): WebAuthnFailureReason =>
  error instanceof DOMException && error.name === "NotAllowedError"
    ? "cancelled"
    : "error";

export const serializeRegistrationCredential = (
  credential: PublicKeyCredential,
): PasskeyRegistrationCredential | null => {
  if (!(credential.response instanceof AuthenticatorAttestationResponse)) {
    return null;
  }

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: "public-key",
    response: {
      clientDataJSON: arrayBufferToBase64Url(credential.response.clientDataJSON),
      attestationObject: arrayBufferToBase64Url(credential.response.attestationObject),
      transports: credential.response.getTransports?.() ?? null,
    },
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: { ...credential.getClientExtensionResults() },
  };
};

export const serializeAuthenticationCredential = (
  credential: PublicKeyCredential,
): PasskeyAuthenticationCredential | null => {
  if (!(credential.response instanceof AuthenticatorAssertionResponse)) {
    return null;
  }

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: "public-key",
    response: {
      clientDataJSON: arrayBufferToBase64Url(credential.response.clientDataJSON),
      authenticatorData: arrayBufferToBase64Url(credential.response.authenticatorData),
      signature: arrayBufferToBase64Url(credential.response.signature),
      userHandle: credential.response.userHandle
        ? arrayBufferToBase64Url(credential.response.userHandle)
        : null,
    },
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: { ...credential.getClientExtensionResults() },
  };
};

export const createPasskey = async (
  options: PasskeyRegistrationOptionsResult,
  credentialsAdapter: CredentialsAdapter | null = getCredentialsAdapter(),
): Promise<WebAuthnResult<PasskeyRegistrationCredential>> => {
  if (!credentialsAdapter) {
    return { ok: false, reason: "unsupported" };
  }

  try {
    const credential = await credentialsAdapter.create({
      publicKey: toRegistrationPublicKeyOptions(options),
    });

    if (!(credential instanceof PublicKeyCredential)) {
      return { ok: false, reason: "invalid-response" };
    }

    const serialized = serializeRegistrationCredential(credential);

    return serialized
      ? { ok: true, credential: serialized }
      : { ok: false, reason: "invalid-response" };
  } catch (error) {
    return { ok: false, reason: getFailureReason(error) };
  }
};

export const getPasskey = async (
  options: PasskeyAuthenticationOptionsResult,
  credentialsAdapter: CredentialsAdapter | null = getCredentialsAdapter(),
): Promise<WebAuthnResult<PasskeyAuthenticationCredential>> => {
  if (!credentialsAdapter) {
    return { ok: false, reason: "unsupported" };
  }

  try {
    const credential = await credentialsAdapter.get({
      publicKey: toAuthenticationPublicKeyOptions(options),
    });

    if (!(credential instanceof PublicKeyCredential)) {
      return { ok: false, reason: "invalid-response" };
    }

    const serialized = serializeAuthenticationCredential(credential);

    return serialized
      ? { ok: true, credential: serialized }
      : { ok: false, reason: "invalid-response" };
  } catch (error) {
    return { ok: false, reason: getFailureReason(error) };
  }
};

export type WebAuthnBrowserAdapter = {
  create: typeof createPasskey;
  get: typeof getPasskey;
  isSupported: typeof isWebAuthnSupported;
};

export const webAuthnBrowserAdapter: WebAuthnBrowserAdapter = {
  create: createPasskey,
  get: getPasskey,
  isSupported: isWebAuthnSupported,
};
