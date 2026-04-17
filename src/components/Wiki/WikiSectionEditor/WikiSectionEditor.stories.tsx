import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { WikiContentEditorId } from "@kpool/wiki";

import { noop, wikiStorySection } from "../storybook/fixtures";
import { WikiSectionEditor } from "../WikiSectionEditor";

const meta = {
  title: "Wiki/WikiSectionEditor",
  component: WikiSectionEditor,
  args: {
    section: wikiStorySection,
    editingId: null,
    onAddBlock: noop,
    onAddSection: noop,
    onCancel: noop,
    onDeleteContent: noop,
    onEdit: noop,
    onSaveBlock: noop,
    onSaveSection: noop,
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiSectionEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  render: (args) => {
    function StoryComponent() {
      const [editingId, setEditingId] = useState<WikiContentEditorId | null>(
        args.editingId as WikiContentEditorId | null,
      );

      return (
        <div className="max-w-4xl">
          <WikiSectionEditor
            editingId={editingId}
            onAddBlock={() => {}}
            onAddSection={() => {}}
            onCancel={() => setEditingId(null)}
            onDeleteContent={() => {}}
            onEdit={setEditingId}
            onSaveBlock={() => setEditingId(null)}
            onSaveSection={() => setEditingId(null)}
            section={args.section}
          />
        </div>
      );
    }

    return <StoryComponent />;
  },
};

export const SectionEditing: Story = {
  args: {
    editingId: `section:${wikiStorySection.sectionIdentifier}`,
  },
  render: Default.render,
};
