import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isCountryCodeOption } from "@/utils/countryOptions";

// Use request-scoped country metadata; no IP address is sent to the browser.
export const getAnalyzeRequestCountry = (): string | null => {
  try {
    const country = getCloudflareContext().cf?.country;
    return typeof country === "string" && isCountryCodeOption(country) ? country : null;
  } catch {
    return null;
  }
};
