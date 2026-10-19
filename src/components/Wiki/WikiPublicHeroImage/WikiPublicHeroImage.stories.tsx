import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { wikiStoryBasic, wikiStoryHeroImage } from "../storybook/fixtures";
import { WikiPublicHeroImage } from "../WikiPublicHeroImage";

function ImageQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const meta = {
  title: "Wiki/WikiPublicHeroImage",
  component: WikiPublicHeroImage,
  args: {
    basic: wikiStoryBasic,
    heroImage: wikiStoryHeroImage,
    flipCardId: "wiki-public-flip-card",
  },
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  decorators: [(Story) => <ImageQueryProvider><Story /></ImageQueryProvider>],
} satisfies Meta<typeof WikiPublicHeroImage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="wiki-theme-scope max-w-6xl" data-theme="light">
      <WikiPublicHeroImage {...args} />
    </div>
  ),
};
