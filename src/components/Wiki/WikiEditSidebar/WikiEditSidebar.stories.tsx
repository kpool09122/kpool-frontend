import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { noop, wikiStoryDetail } from "../storybook/fixtures";
import { WikiEditSidebar } from "../WikiEditSidebar";

const meta = {
  title: "Wiki/WikiEditSidebar",
  component: WikiEditSidebar,
  args: {
    canPersist: true,
    editorMode: "gui",
    isBusy: false,
    isOpen: true,
    onEditorModeChange: noop,
    onClear: noop,
    onPreviewModeChange: noop,
    onSave: noop,
    onSubmit: noop,
    onToggle: noop,
    onUpdateSettings: noop,
    previewMode: "light",
    resourceType: wikiStoryDetail.resourceType,
    slug: wikiStoryDetail.slug,
    themeColor: wikiStoryDetail.themeColor,
  },
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiEditSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  render: (args) => {
    function StoryComponent() {
      const [editorMode, setEditorMode] = useState(args.editorMode);
      const [isOpen, setIsOpen] = useState(args.isOpen);
      const [previewMode, setPreviewMode] = useState(args.previewMode);
      const [slug, setSlug] = useState(args.slug);
      const [themeColor, setThemeColor] = useState(args.themeColor);

      return (
        <div className="min-h-screen bg-background">
          <WikiEditSidebar
            canPersist={args.canPersist}
            editorMode={editorMode}
            isBusy={args.isBusy}
            isOpen={isOpen}
            onEditorModeChange={setEditorMode}
            onClear={() => {
              setSlug(wikiStoryDetail.slug);
              setThemeColor(wikiStoryDetail.themeColor);
            }}
            onPreviewModeChange={setPreviewMode}
            onSave={() => {}}
            onSubmit={() => {}}
            onToggle={() => setIsOpen((value) => !value)}
            onUpdateSettings={(settings) => {
              if (settings.slug !== undefined) {
                setSlug(settings.slug);
              }
              if (settings.themeColor !== undefined) {
                setThemeColor(settings.themeColor);
              }
            }}
            previewMode={previewMode}
            resourceType={args.resourceType}
            slug={slug}
            themeColor={themeColor}
          />
        </div>
      );
    }

    return <StoryComponent />;
  },
};

export const Busy: Story = {
  args: {
    isBusy: true,
  },
  render: Default.render,
};
