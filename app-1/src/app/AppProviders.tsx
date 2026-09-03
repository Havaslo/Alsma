import type { ReactNode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { queryClient } from "@/lib/query/query-client";
import { ServiceCartProvider } from "@/lib/services/service-cart";

type AppProvidersProps = {
  readonly children: ReactNode;
};

export const AppProviders = ({ children }: AppProvidersProps) => (
  <QueryClientProvider client={queryClient}>
    <ServiceCartProvider>{children}</ServiceCartProvider>
    <Toaster richColors theme="light" />
  </QueryClientProvider>
);
