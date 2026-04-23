import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { wikiStorySection } from "../storybook/fixtures";
import { WikiSectionAccordion } from "./index";

const meta = {
  title: "Wiki/WikiSectionAccordion",
  component: WikiSectionAccordion,
  args: {
    language: "ja",
    section: wikiStorySection,
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiSectionAccordion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  render: (args) => (
    <div className="wiki-theme-scope max-w-4xl" data-theme="light">
      <WikiSectionAccordion {...args} />
    </div>
  ),
};
