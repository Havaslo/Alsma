import { App } from "@/app/App";
import { AppProviders } from "@/app/AppProviders";

export const LegacyApplication = () => {
  return (
    <AppProviders>
      <App />
    </AppProviders>
  );
};
