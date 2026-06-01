import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { noop, wikiStoryBasic, wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiHeroBasicFlipCard } from "../WikiHeroBasicFlipCard";

const meta = {
  title: "Wiki/WikiHeroBasicFlipCard",
  component: WikiHeroBasicFlipCard,
  args: {
    heroImage: wikiStoryHeroImage,
    basic: wikiStoryBasic,
    isFlipped: false,
    flipCardId: "wiki-story-flip-card",
    isBasicEditing: false,
    onCancel: noop,
    onEditBasic: noop,
    onFlipChange: noop,
    onSaveBasic: noop,
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WikiHeroBasicFlipCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  render: (args) => {
      function StoryComponent() {
        const [isFlipped, setIsFlipped] = useState(args.isFlipped);
        const [isBasicEditing, setIsBasicEditing] = useState(args.isBasicEditing);

      return (
        <div className="max-w-md">
          <WikiHeroBasicFlipCard
            basic={args.basic}
            flipCardId={args.flipCardId}
            heroImage={args.heroImage}
            isBasicEditing={isBasicEditing}
            isFlipped={isFlipped}
            onCancel={() => {
              setIsBasicEditing(false);
            }}
            onEditBasic={() => setIsBasicEditing(true)}
            onFlipChange={setIsFlipped}
            onSaveBasic={() => setIsBasicEditing(false)}
          />
        </div>
      );
    }

    return <StoryComponent />;
  },
};

export const BasicEditing: Story = {
  args: {
    isFlipped: true,
    isBasicEditing: true,
  },
  render: Default.render,
};
