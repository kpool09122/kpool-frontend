import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { wikiStoryBlocks } from "../storybook/fixtures";
import { WikiBlockDisplay } from "./index";

const [textBlock, imageBlock, galleryBlock, embedBlock, quoteBlock, listBlock, tableBlock, profileListBlock] =
  wikiStoryBlocks;

const meta = {
  title: "Wiki/WikiBlockDisplay",
  component: WikiBlockDisplay,
  args: {
    block: textBlock,
    showEditableImageOverlay: false,
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiBlockDisplay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Text: Story = {
  args: {
    block: textBlock,
  },
};

export const Image: Story = {
  args: {
    block: imageBlock,
    showEditableImageOverlay: true,
  },
};

export const Gallery: Story = {
  args: {
    block: galleryBlock,
    showEditableImageOverlay: true,
  },
};

export const Embed: Story = {
  args: {
    block: embedBlock,
  },
};

export const Quote: Story = {
  args: {
    block: quoteBlock,
  },
};

export const List: Story = {
  args: {
    block: listBlock,
  },
};

export const Table: Story = {
  args: {
    block: tableBlock,
  },
};

export const ProfileCardList: Story = {
  args: {
    block: profileListBlock,
  },
};
