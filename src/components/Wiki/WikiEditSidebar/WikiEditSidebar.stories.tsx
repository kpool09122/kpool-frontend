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
    language: wikiStoryDetail.language,
    resourceType: wikiStoryDetail.resourceType,
    slug: wikiStoryDetail.slug,
    themeColor: wikiStoryDetail.themeColor,
    fontStyle: wikiStoryDetail.fontStyle,
    title: wikiStoryDetail.title,
    metaDescription: wikiStoryDetail.metaDescription,
    keywords: wikiStoryDetail.keywords,
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
      const [fontStyle, setFontStyle] = useState(args.fontStyle);
      const [title, setTitle] = useState(args.title);
      const [metaDescription, setMetaDescription] = useState(args.metaDescription);
      const [keywords, setKeywords] = useState(args.keywords);

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
              setFontStyle(wikiStoryDetail.fontStyle);
              setTitle(wikiStoryDetail.title);
              setMetaDescription(wikiStoryDetail.metaDescription);
              setKeywords(wikiStoryDetail.keywords);
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
              if (settings.fontStyle !== undefined) {
                setFontStyle(settings.fontStyle);
              }
              if (settings.title !== undefined) {
                setTitle(settings.title);
              }
              if (settings.metaDescription !== undefined) {
                setMetaDescription(settings.metaDescription);
              }
              if (settings.keywords !== undefined) {
                setKeywords(settings.keywords);
              }
            }}
            previewMode={previewMode}
            language={args.language}
            resourceType={args.resourceType}
            slug={slug}
            themeColor={themeColor}
            fontStyle={fontStyle}
            title={title}
            metaDescription={metaDescription}
            keywords={keywords}
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
