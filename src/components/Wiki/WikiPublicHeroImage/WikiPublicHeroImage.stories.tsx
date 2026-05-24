import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { wikiStoryBasic, wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiPublicHeroImage } from "../WikiPublicHeroImage";

const meta = {
  title: "Wiki/WikiPublicHeroImage",
  component: WikiPublicHeroImage,
  args: {
    basic: wikiStoryBasic,
    heroImage: wikiStoryHeroImage,
    flipCardId: "wiki-public-flip-card",
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiPublicHeroImage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="wiki-theme-scope max-w-6xl" data-theme="light">
      <WikiPublicHeroImage {...args} />
    </div>
  ),
};
