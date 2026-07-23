import {
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type ProjectThemeMode,
  ThemeContext,
  type ThemeMode,
  projectThemeModes,
  themeModes,
} from "@/lib/theme/theme-context";

const storageKey = "amazi-project-theme";
const preferenceStorageKey = "amazi-project-theme-preference";

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

  if (configuredMode === "both") return "system";

  // Themes generated before the preference marker was introduced allowed both palettes.
  return isProjectThemeMode(configuredMode) ? configuredMode : "system";
};

const getPreferredTheme = (projectThemeMode: ProjectThemeMode): ThemeMode => {
  if (projectThemeMode !== "system") return projectThemeMode;

  return window.matchMedia(darkModeQuery).matches ? "dark" : "light";
};

const getStoredTheme = (): ThemeMode => {
  const projectThemeMode = getProjectThemeMode();

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    const storedPreference = window.localStorage.getItem(preferenceStorageKey);

    if (isThemeMode(storedTheme) && storedPreference === projectThemeMode) {
      return storedTheme;
    }
  } catch {
    // Fall through to the project preference when storage is unavailable.
  }

  return getPreferredTheme(projectThemeMode);
};

type ThemeProviderProps = {
  readonly children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [selectedMode, setSelectedMode] = useState<ThemeMode>(getStoredTheme);
  const [projectThemeMode, setProjectThemeMode] =
    useState<ProjectThemeMode>(getProjectThemeMode);
  const previousProjectThemeMode = useRef(projectThemeMode);
  const mode = selectedMode;

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
    if (previousProjectThemeMode.current === projectThemeMode) return;

    previousProjectThemeMode.current = projectThemeMode;
    setSelectedMode(getPreferredTheme(projectThemeMode));
  }, [projectThemeMode]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.dataset.themeMode = projectThemeMode;
    root.style.colorScheme = mode;

    try {
      window.localStorage.setItem(storageKey, selectedMode);
      window.localStorage.setItem(preferenceStorageKey, projectThemeMode);
    } catch {
      // The selected theme still applies when storage is unavailable.
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
