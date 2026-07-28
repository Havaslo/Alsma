import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/lib/theme/useTheme";

export const ThemeToggle = () => {
  const { mode, setMode } = useTheme();

  const isDark = mode === "dark";
  const Icon = isDark ? Moon : Sun;
  const nextMode = isDark ? "light" : "dark";
  const toggleTheme = () => setMode(nextMode);

  return (
    <Button
      aria-label={`Switch to ${nextMode} theme`}
      className="size-10 p-0"
      data-amazi-id="theme-toggle"
      onClick={toggleTheme}
      title={`Switch to ${nextMode} theme`}
      variant="secondary"
    >
      <Icon aria-hidden="true" className="size-4" />
    </Button>
  );
};
