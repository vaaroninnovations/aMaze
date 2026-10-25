import { MockAuthProvider } from "@/lib/mock-auth.tsx";
import { ThemePreferenceSync, ThemeProvider } from "./theme.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <MockAuthProvider>
      <TooltipProvider>
        <ThemeProvider>
          <ThemePreferenceSync />
          <Toaster />
          {children}
        </ThemeProvider>
      </TooltipProvider>
    </MockAuthProvider>
  );
}
