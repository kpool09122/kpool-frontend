import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { WikiStatePanel } from "../WikiStatePanel";

const meta = {
  title: "Wiki/WikiStatePanel",
  component: WikiStatePanel,
  args: {
    title: "Loading",
    message: "Preparing the wiki detail view.",
    tone: "default",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiStatePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Danger: Story = {
  args: {
    title: "Error",
    message: "Wiki data could not be loaded.",
    tone: "danger",
  },
};
