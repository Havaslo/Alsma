import { createContext } from "react";

export const themeModes = ["light", "dark"] as const;

export const projectThemeModes = ["light", "dark", "both"] as const;

export type ThemeMode = (typeof themeModes)[number];

export type ProjectThemeMode = (typeof projectThemeModes)[number];

export type ThemeContextValue = {
  readonly mode: ThemeMode;
  readonly projectThemeMode: ProjectThemeMode;
  readonly setMode: (mode: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);
