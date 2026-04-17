import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { wikiStoryBasic, noop } from "../storybook/fixtures";
import { WikiBasicPanel } from "./index";

const meta = {
  title: "Wiki/WikiBasicPanel",
  component: WikiBasicPanel,
  args: {
    basic: wikiStoryBasic,
    isEditing: false,
    onEdit: noop,
    onCancel: noop,
    onSave: noop,
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiBasicPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const View: Story = {};

export const Editing: Story = {
  args: {
    isEditing: true,
  },
};
