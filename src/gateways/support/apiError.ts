const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getApiErrorMessage = (body: unknown, fallback: string): string => {
  if (!isRecord(body)) return fallback;

  // Problem Details uses detail for the localized, user-facing explanation.
  for (const key of ["detail", "message", "title"]) {
    const value = body[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }

  return fallback;
};

export const getApiErrorBody = (body: unknown, fallback: string) => ({
  ...(isRecord(body) ? body : {}),
  message: getApiErrorMessage(body, fallback),
});

export const readApiErrorBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const getBackendErrorResponse = (error: unknown) => {
  if (!isRecord(error) || !isRecord(error.response)) return undefined;
  const { status, data } = error.response;
  if (typeof status !== "number" || !Number.isInteger(status) || status < 400 || status > 599) {
    return undefined;
  }

  return { status, data };
};
