import { buildGoogleTrendsWidgetOptions, type WikiGoogleTrendsSettings } from "@kpool/wiki";

// Version referenced by the Google Trends embed snippet.
export const googleTrendsLoaderUrl = "https://ssl.gstatic.com/trends_nrtr/4278_RC01/embed_loader.js";

type TrendsLoader = {
  embed: {
    renderExploreWidgetTo: (
      container: HTMLElement,
      type: "TIMESERIES",
      request: ReturnType<typeof buildGoogleTrendsWidgetOptions>["request"],
      options: ReturnType<typeof buildGoogleTrendsWidgetOptions>["options"],
    ) => void;
  };
};

const getLoader = () => (window as Window & { trends?: TrendsLoader }).trends;

export const isGoogleTrendsLoaderReady = () => Boolean(getLoader()?.embed?.renderExploreWidgetTo);

export const getGoogleTrendsLoaderUrl = (attempt: number) =>
  attempt > 0 && !isGoogleTrendsLoaderReady()
    ? `${googleTrendsLoaderUrl}?retry=${attempt}`
    : googleTrendsLoaderUrl;

export function renderGoogleTrendsWidget(
  container: HTMLElement,
  settings: WikiGoogleTrendsSettings,
  language: string,
): boolean {
  const trends = getLoader();
  if (!trends?.embed?.renderExploreWidgetTo) return false;
  try {
    const { request, options } = buildGoogleTrendsWidgetOptions(settings, language);
    trends.embed.renderExploreWidgetTo(container, "TIMESERIES", request, options);
    const frame = container.querySelector("iframe");
    if (!frame) return false;
    frame.title = `Google Trends: ${settings.searchTerm}`;
    return true;
  } catch {
    container.replaceChildren();
    return false;
  }
}
