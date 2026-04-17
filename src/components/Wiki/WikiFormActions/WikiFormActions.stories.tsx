import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { noop } from "../storybook/fixtures";
import { WikiFormActions } from "../WikiFormActions";

const meta = {
  title: "Wiki/WikiFormActions",
  component: WikiFormActions,
  args: {
    onCancel: noop,
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiFormActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
