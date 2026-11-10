export const mainBackgroundStyle = {
  backgroundColor: "var(--background)",
  backgroundImage:
    "var(--wiki-page-background, radial-gradient(circle at top, rgba(255,214,194,0.85), transparent var(--wiki-page-gradient-height, 38%)), linear-gradient(180deg, var(--background) 0%, var(--surface-raised) var(--wiki-page-gradient-height, 100%)))",
  fontFamily: "var(--wiki-font-family, var(--font-sans))",
};

export const cardSurfaceStyle = {
  backgroundColor: "var(--wiki-card-background, var(--surface-raised))",
  borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
};

export const cardSurfaceMutedStyle = {
  backgroundColor: "var(--wiki-card-background-muted, var(--surface-base))",
  borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
};

export const transparentFrameStyle = {
  backgroundColor: "transparent",
  borderColor: "transparent",
  boxShadow: "none",
};

export const heroOverlayStyle = {
  backgroundImage:
    "var(--wiki-hero-overlay, linear-gradient(to bottom, rgba(21, 36, 59, 0.05), transparent 55%, rgba(21, 36, 59, 0.92)))",
};

export const accentBadgeStyle = {
  backgroundColor: "var(--wiki-accent-background, rgba(255, 214, 194, 0.3))",
  color: "var(--wiki-accent-text, var(--text-strong))",
  borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
};

export const sectionArticleClassName = "wiki-article-section min-w-0 border-t border-stroke-subtle pt-8 first:border-t-0 first:pt-0";
export const sectionHeadingClassName = "wiki-title min-w-0 flex-1 break-words text-lg font-semibold";
export const sectionBodyClassName = "pb-2 pt-4 [&>.wiki-article-section]:ml-3 [&>.wiki-article-section]:sm:ml-6";
export const sectionListClassName = "space-y-10 sm:space-y-12";
export const youtubeEmbedClassName = "w-full max-w-[640px]";
