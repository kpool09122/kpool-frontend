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

export const TalentEditing: Story = {
  args: {
    isEditing: true,
    basic: {
      resourceType: "talent",
      name: "NAYEON",
      normalizedName: "nayeon",
      realName: "Im Nayeon",
      birthday: "1995-09-22",
      fandomName: "ONCE",
      representativeSymbol: "Bunny",
      position: "Lead Vocalist, Lead Dancer, Center",
      mbti: "ISFP",
      zodiacSign: "virgo",
      height: 163,
      bloodType: "A",
      groups: [{ wikiIdentifier: "twice", name: "TWICE" }],
    },
  },
  decorators: [(Story) => (
    <div className="mx-auto max-w-3xl rounded-[2rem] bg-surface-base p-6">
      <Story />
    </div>
  )],
};

export const NarrowTalentEditing: Story = {
  ...TalentEditing,
  decorators: [(Story) => (
    <div className="mx-auto max-w-sm rounded-[2rem] bg-surface-base p-6">
      <Story />
    </div>
  )],
};
