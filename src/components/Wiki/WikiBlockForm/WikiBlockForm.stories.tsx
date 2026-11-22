import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  noop,
  wikiStoryEmbedBlock,
  wikiStoryImageBlock,
  wikiStoryListBlock,
  wikiStoryProfileListBlock,
  wikiStoryQuoteBlock,
  wikiStoryTableBlock,
  wikiStoryTextBlock,
} from "../storybook/fixtures";
import { WikiBlockForm } from "../WikiBlockForm";

const meta = {
  title: "Wiki/WikiBlockForm",
  component: WikiBlockForm,
  args: {
    block: wikiStoryTextBlock,
    onCancel: noop,
    onSave: noop,
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiBlockForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GoogleTrends: Story = {
  args: { block: { blockType: "google_trends", blockKey: "trends-story", displayOrder: 10, searchTerm: "TWICE", region: "JP", timeRange: "today 12-m" } },
};

export const Text: Story = {};

export const Image: Story = {
  args: {
    block: wikiStoryImageBlock,
  },
};

export const Embed: Story = {
  args: {
    block: wikiStoryEmbedBlock,
  },
};

export const Quote: Story = {
  args: {
    block: wikiStoryQuoteBlock,
  },
};

export const List: Story = {
  args: {
    block: wikiStoryListBlock,
  },
};

export const Table: Story = {
  args: {
    block: wikiStoryTableBlock,
  },
};

export const ProfileList: Story = {
  args: {
    block: wikiStoryProfileListBlock,
  },
};
