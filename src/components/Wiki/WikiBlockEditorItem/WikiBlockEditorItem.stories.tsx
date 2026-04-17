import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { noop, wikiStoryImageBlock, wikiStoryTextBlock } from "../storybook/fixtures";
import { WikiBlockEditorItem } from "../WikiBlockEditorItem";

const meta = {
  title: "Wiki/WikiBlockEditorItem",
  component: WikiBlockEditorItem,
  args: {
    block: wikiStoryTextBlock,
    isEditing: false,
    onCancel: noop,
    onDelete: noop,
    onEdit: noop,
    onSave: noop,
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiBlockEditorItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    function StoryComponent() {
      const [isEditing, setIsEditing] = useState(args.isEditing);

      return (
        <div className="max-w-3xl">
          <WikiBlockEditorItem
            block={args.block}
            isEditing={isEditing}
            onCancel={() => setIsEditing(false)}
            onDelete={() => {}}
            onEdit={() => setIsEditing(true)}
            onSave={() => setIsEditing(false)}
          />
        </div>
      );
    }

    return <StoryComponent />;
  },
};

export const EditingImage: Story = {
  args: {
    block: wikiStoryImageBlock,
    isEditing: true,
  },
  render: Default.render,
};
