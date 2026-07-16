import { type ReactNode, useLayoutEffect, useMemo, useState } from "react";

import {
  type ProjectThemeMode,
  ThemeContext,
  type ThemeMode,
  projectThemeModes,
  themeModes,
} from "@/lib/theme/theme-context";

const storageKey = "amazi-project-theme";
const darkModeQuery = "(prefers-color-scheme: dark)";
const projectThemeModeVariable = "--amazi-theme-mode";

const isThemeMode = (value: string | null): value is ThemeMode => {
  return themeModes.some((mode) => mode === value);
};

const isProjectThemeMode = (value: string): value is ProjectThemeMode => {
  return projectThemeModes.some((mode) => mode === value);
};

const getProjectThemeMode = (): ProjectThemeMode => {
  const configuredMode = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(projectThemeModeVariable)
    .trim();

  // Themes generated before the marker was introduced always allowed both palettes.
  return isProjectThemeMode(configuredMode) ? configuredMode : "both";
};

const getStoredTheme = (): ThemeMode => {
  try {
    const storedTheme = window.localStorage.getItem(storageKey);

    return isThemeMode(storedTheme)
      ? storedTheme
      : window.matchMedia(darkModeQuery).matches
        ? "dark"
        : "light";
  } catch {
    return "light";
  }
};

type ThemeProviderProps = {
  readonly children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [selectedMode, setSelectedMode] = useState<ThemeMode>(getStoredTheme);
  const [projectThemeMode, setProjectThemeMode] =
    useState<ProjectThemeMode>(getProjectThemeMode);
  const mode = projectThemeMode === "both" ? selectedMode : projectThemeMode;

  useLayoutEffect(() => {
    let syncFrame: number | null = null;
    const syncProjectThemeMode = () => {
      syncFrame = null;
      const nextMode = getProjectThemeMode();
      setProjectThemeMode((currentMode) =>
        currentMode === nextMode ? currentMode : nextMode,
      );
    };
    const scheduleSync = () => {
      if (syncFrame !== null) window.cancelAnimationFrame(syncFrame);
      syncFrame = window.requestAnimationFrame(syncProjectThemeMode);
    };
    const headObserver = new MutationObserver(scheduleSync);

    headObserver.observe(document.head, {
      attributeFilter: ["href"],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener("load", scheduleSync);
    import.meta.hot?.on("vite:afterUpdate", scheduleSync);
    scheduleSync();

    return () => {
      headObserver.disconnect();
      window.removeEventListener("load", scheduleSync);
      import.meta.hot?.off("vite:afterUpdate", scheduleSync);
      if (syncFrame !== null) window.cancelAnimationFrame(syncFrame);
    };
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.dataset.themeMode = projectThemeMode;
    root.style.colorScheme = mode;

    if (projectThemeMode === "both") {
      try {
        window.localStorage.setItem(storageKey, selectedMode);
      } catch {
        // The selected theme still applies when storage is unavailable.
      }
    }
  }, [mode, projectThemeMode, selectedMode]);

  const value = useMemo(
    () => ({ mode, projectThemeMode, setMode: setSelectedMode }),
    [mode, projectThemeMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
