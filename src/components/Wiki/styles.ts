export const mainBackgroundStyle = {
  backgroundColor: "var(--background)",
  backgroundImage:
    "var(--wiki-page-background, radial-gradient(circle at top, rgba(255,214,194,0.85), transparent 38%), linear-gradient(180deg, var(--background) 0%, #fff 100%))",
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
