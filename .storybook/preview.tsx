import type { Preview } from "@storybook/nextjs-vite";

import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
    controls: {
      expanded: true,
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background px-4 py-8 text-text-strong md:px-8">
        <Story />
      </div>
    ),
  ],
};

export default preview;
