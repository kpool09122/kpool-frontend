import type { DefaultOptions } from "@tanstack/react-query";

/** Admin screens must fetch current data on entry, including when revisiting a tab. */
export const adminQueryDefaults = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always",
} satisfies DefaultOptions["queries"];
