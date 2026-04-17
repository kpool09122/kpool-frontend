import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { wikiStoryHeroImage, noop } from "../storybook/fixtures";
import { WikiHeroPanel } from "./index";

const meta = {
  title: "Wiki/WikiHeroPanel",
  component: WikiHeroPanel,
  args: {
    heroImage: wikiStoryHeroImage,
    isEditing: false,
    onEdit: noop,
    onCancel: noop,
    onSave: noop,
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiHeroPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const View: Story = {
  render: (args) => (
    <div className="max-w-3xl">
      <WikiHeroPanel {...args} />
    </div>
  ),
};

export const Editing: Story = {
  args: {
    isEditing: true,
  },
  render: (args) => (
    <div className="max-w-3xl">
      <WikiHeroPanel {...args} />
    </div>
  ),
};
