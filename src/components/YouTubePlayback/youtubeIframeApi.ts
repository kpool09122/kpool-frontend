export type YouTubePlayerInstance = {
  playVideo: () => void;
  loadVideoById: (videoId: string) => void;
  destroy: () => void;
  getVideoUrl?: () => string;
  getPlayerState?: () => number;
};
export type YouTubePlayerOptions = {
  videoId: string;
  host: string;
  width: string;
  height: string;
  playerVars: { origin: string; playsinline: number };
  events: {
    onReady: () => void;
    onStateChange: (event: { data: number }) => void;
    onError: () => void;
    onAutoplayBlocked: () => void;
  };
};
type YouTubeWindow = Window & {
  YT?: { Player?: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayerInstance };
};
const apiSource = "https://www.youtube.com/iframe_api";

export const getYouTubePlayerConstructor = () => (window as YouTubeWindow).YT?.Player;

// The API script is shared with other embeds and outlives an individual player.
// Keeping it outside the React-owned iframe also lets a failed load be retried.
export function loadYouTubeIframeApi() {
  if (getYouTubePlayerConstructor()) return null;
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${apiSource}"]`);
  if (existing) return existing;
  const script = document.createElement("script");
  script.src = apiSource;
  script.async = true;
  document.head.appendChild(script);
  return script;
}

export function discardFailedYouTubeIframeApi(script: HTMLScriptElement | null) {
  if (!getYouTubePlayerConstructor()) script?.remove();
}
