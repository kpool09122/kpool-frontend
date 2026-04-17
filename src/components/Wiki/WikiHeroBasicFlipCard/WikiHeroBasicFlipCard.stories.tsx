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
    isHeroEditing: false,
    isBasicEditing: false,
    onCancel: noop,
    onEditBasic: noop,
    onEditHero: noop,
    onFlipChange: noop,
    onSaveBasic: noop,
    onSaveHero: noop,
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
      const [isHeroEditing, setIsHeroEditing] = useState(args.isHeroEditing);
      const [isBasicEditing, setIsBasicEditing] = useState(args.isBasicEditing);

      return (
        <div className="max-w-md">
          <WikiHeroBasicFlipCard
            basic={args.basic}
            flipCardId={args.flipCardId}
            heroImage={args.heroImage}
            isBasicEditing={isBasicEditing}
            isFlipped={isFlipped}
            isHeroEditing={isHeroEditing}
            onCancel={() => {
              setIsHeroEditing(false);
              setIsBasicEditing(false);
            }}
            onEditBasic={() => setIsBasicEditing(true)}
            onEditHero={() => setIsHeroEditing(true)}
            onFlipChange={setIsFlipped}
            onSaveBasic={() => setIsBasicEditing(false)}
            onSaveHero={() => setIsHeroEditing(false)}
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
