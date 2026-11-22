"use client";

import {
  QueryClient,
  QueryClientProvider,
  type DefaultOptions,
} from "@tanstack/react-query";
import { useState } from "react";
import { useAuthStore } from "@/gateways/auth/authStore";

type QueryProviderProps = {
  children: React.ReactNode;
  queryDefaults?: DefaultOptions["queries"];
};

export function QueryProvider(props: QueryProviderProps) {
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  return <SessionQueryProvider key={sessionVersion} {...props} />;
}

function SessionQueryProvider({ children, queryDefaults }: QueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        ...queryDefaults,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
