import { useEffect } from "react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useTheme } from "next-themes";
import { api } from "@/convex/_generated/api.js";
import {
  ThemeProvider as NextThemeProvider,
  type ThemeProviderProps,
} from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      {children}
    </NextThemeProvider>
  );
}

export function ThemePreferenceSync() {
  const { isAuthenticated } = useConvexAuth();
  const { setTheme } = useTheme();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (user?.preferences?.theme) setTheme(user.preferences.theme);
  }, [setTheme, user?.preferences?.theme]);

  return null;
}
