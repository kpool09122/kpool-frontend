export const readWikiRouteJsonResponse = async (
  response: Response,
  fallbackErrorMessage: string,
): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    if (!response.ok) {
      return { message: fallbackErrorMessage };
    }

    throw new Error(fallbackErrorMessage, { cause: error });
  }
};

export const getWikiRouteErrorMessage = (
  body: unknown,
  fallbackErrorMessage: string,
): string =>
  typeof body === "object" &&
  body !== null &&
  "message" in body &&
  typeof (body as { message: unknown }).message === "string"
    ? (body as { message: string }).message
    : fallbackErrorMessage;
