import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiHeroPanel } from "./index";

const meta = {
  title: "Wiki/WikiHeroPanel",
  component: WikiHeroPanel,
  args: {
    heroImage: wikiStoryHeroImage,
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
