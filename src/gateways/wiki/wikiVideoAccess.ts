import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import type { WikiResourceType } from "@kpool/wiki";
export const fetchWikiVideoAccess = async (
  resourceType: WikiResourceType,
  signal?: AbortSignal,
) => {
  try {
    const response = await browserApiFetch(
      `/api/wiki/videos/access?resourceType=${resourceType}`,
      { credentials: "include", cache: "no-store", signal },
    );
    if (!response.ok) return false;
    const body: unknown = await response.json();
    return (
      typeof body === "object" &&
      body !== null &&
      "canCreate" in body &&
      body.canCreate === true
    );
  } catch {
    return false;
  }
};
