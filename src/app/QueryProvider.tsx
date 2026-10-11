"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState } from "react";
import { useAuthStore } from "@/gateways/auth/authStore";

type QueryProviderProps = {
  children: React.ReactNode;
};

export function QueryProvider(props: QueryProviderProps) {
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  return <SessionQueryProvider key={sessionVersion} {...props} />;
}

function SessionQueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
