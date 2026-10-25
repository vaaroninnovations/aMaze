import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button.tsx";

/** Switches between light and dark; the first visit follows the device setting. */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button size="icon" variant="ghost" className="size-8" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={label} title={label}>
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
