const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;

export const getYouTubeVideoId = (value: string): string | null => {
  if (videoIdPattern.test(value)) return value;
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    return null;
  let id: string | null = null;
  if (url.hostname === "youtu.be" && /^\/[^/]+\/?$/.test(url.pathname)) {
    id = url.pathname.split("/")[1];
  } else if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "www.youtube-nocookie.com",
      "youtube-nocookie.com",
    ].includes(url.hostname)
  ) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else
      id =
        url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1] ??
        null;
  }
  return id && videoIdPattern.test(id) ? id : null;
};

export const getYouTubeThumbnailUrl = (value: string | null): string | null => {
  if (!value || !URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    ["i.ytimg.com", "img.youtube.com"].includes(url.hostname)
    ? url.href
    : null;
};
