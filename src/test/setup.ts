import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const imgProps = { ...props } as Record<string, unknown>;

    delete imgProps.blurDataURL;
    delete imgProps.fill;
    delete imgProps.loader;
    delete imgProps.placeholder;
    delete imgProps.priority;
    delete imgProps.quality;
    delete imgProps.unoptimized;

    return React.createElement("img", imgProps as React.ImgHTMLAttributes<HTMLImageElement>);
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));
