import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { wikiStoryBasic } from "../storybook/fixtures";
import { cardSurfaceStyle } from "../styles";
import { WikiBasicFieldsList } from "../WikiBasicFieldsList";

const meta = {
  title: "Wiki/WikiBasicFieldsList",
  component: WikiBasicFieldsList,
  args: {
    basic: wikiStoryBasic,
    className: "grid gap-4 sm:grid-cols-2",
    itemClassName: "rounded-2xl border border-stroke-subtle bg-surface-raised px-4 py-3",
    itemStyle: cardSurfaceStyle,
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiBasicFieldsList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
