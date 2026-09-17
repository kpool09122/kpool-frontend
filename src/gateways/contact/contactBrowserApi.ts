import {
  parseSubmitContactResponse,
  type SubmitContactRequest,
  type SubmitContactResponse,
} from "./contactApi";

export type SubmitContactResult =
  | { ok: true; contact: SubmitContactResponse }
  | { ok: false };

export type SubmitContactAdapter = (options: {
  locale: string;
  requestBody: SubmitContactRequest;
}) => Promise<SubmitContactResult>;

export const submitContact: SubmitContactAdapter = async ({ locale, requestBody }) => {
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Language": locale,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return { ok: false };
    }

    return {
      ok: true,
      contact: parseSubmitContactResponse(await response.json()),
    };
  } catch {
    return { ok: false };
  }
};
