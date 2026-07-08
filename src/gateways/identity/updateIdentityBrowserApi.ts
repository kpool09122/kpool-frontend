import {
  parseUpdateIdentityResult,
  type IdentitySummary,
  type UpdateIdentityRequest,
} from "@/gateways/identity/identityApi";

const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getUpdateIdentityErrorMessage = async (response: Response, fallbackErrorMessage: string): Promise<string> => {
  const body = await readResponseBody(response);

  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }

  return fallbackErrorMessage;
};

export const updateAuthenticatedIdentity = async ({
  fallbackErrorMessage,
  requestBody,
}: {
  fallbackErrorMessage: string;
  requestBody: UpdateIdentityRequest;
}): Promise<IdentitySummary> => {
  const response = await fetch("/api/identity", {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(await getUpdateIdentityErrorMessage(response, fallbackErrorMessage));
  }

  return parseUpdateIdentityResult(await readResponseBody(response));
};
