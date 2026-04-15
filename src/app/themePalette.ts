export type ThemePaletteItem = {
  cssVar: `--${string}`;
  name: string;
  role: string;
  value: `var(--${string})`;
};

export type ThemePaletteSection = {
  description: string;
  items: ThemePaletteItem[];
  title: string;
};

const palette = [
  {
    description:
      "Deep navy and warm gold establish a calm, trustworthy core without leaning on aqua tones.",
    items: [
      {
        cssVar: "--brand-primary",
        name: "Deep Harbor",
        role: "Primary brand color",
        value: "var(--brand-primary)",
      },
      {
        cssVar: "--brand-secondary",
        name: "Signal Gold",
        role: "Accent and emphasis",
        value: "var(--brand-secondary)",
      },
      {
        cssVar: "--brand-highlight",
        name: "Harbor Mist",
        role: "Soft highlight surfaces",
        value: "var(--brand-highlight)",
      },
    ],
    title: "Brand",
  },
  {
    description:
      "Background and text tokens keep the interface readable across bright and dim environments.",
    items: [
      {
        cssVar: "--surface-base",
        name: "Canvas",
        role: "App background",
        value: "var(--surface-base)",
      },
      {
        cssVar: "--surface-raised",
        name: "Raised Surface",
        role: "Cards and elevated panels",
        value: "var(--surface-raised)",
      },
      {
        cssVar: "--text-strong",
        name: "Ink",
        role: "Primary text",
        value: "var(--text-strong)",
      },
      {
        cssVar: "--text-muted",
        name: "Slate",
        role: "Secondary text",
        value: "var(--text-muted)",
      },
    ],
    title: "Surface",
  },
  {
    description:
      "Status tokens stay distinct while fitting the same restrained palette family.",
    items: [
      {
        cssVar: "--status-success",
        name: "Success",
        role: "Positive state",
        value: "var(--status-success)",
      },
      {
        cssVar: "--status-warning",
        name: "Warning",
        role: "Caution state",
        value: "var(--status-warning)",
      },
      {
        cssVar: "--status-danger",
        name: "Danger",
        role: "Critical state",
        value: "var(--status-danger)",
      },
    ],
    title: "Status",
  },
] satisfies ThemePaletteSection[];

export function getThemePaletteSections(): ThemePaletteSection[] {
  return palette;
}
