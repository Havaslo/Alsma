import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { queryClient } from "@/lib/query/query-client";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { useTheme } from "@/lib/theme/useTheme";

type AppProvidersProps = {
  readonly children: ReactNode;
};

const AppToaster = () => {
  const { mode } = useTheme();

  return <Toaster richColors theme={mode} />;
};

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
        <AppToaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
};
