import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { wikiStoryChildSection, wikiStorySection, noop } from "../storybook/fixtures";
import { WikiAddContentControls } from "../WikiAddContentControls";

const meta = {
  title: "Wiki/WikiAddContentControls",
  component: WikiAddContentControls,
  args: {
    section: wikiStorySection,
    onAddSection: noop,
    onAddBlock: noop,
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiAddContentControls>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MaxDepth: Story = {
  args: {
    section: wikiStoryChildSection,
  },
};
