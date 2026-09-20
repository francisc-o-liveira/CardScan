import { useState, type ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The web app pins React 18 and mobile React 19; pnpm's shared store can resolve react-query's types
// against the other app's @types/react, so the children type is taken from react-query itself.
type QueryProviderProps = { children: ComponentProps<typeof QueryClientProvider>["children"] };

export function QueryProvider({ children }: QueryProviderProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
