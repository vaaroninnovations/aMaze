import { ConvexProvider } from "./convex.tsx";
import { QueryClientProvider } from "./query-client.tsx";
import { ThemeProvider } from "./theme.tsx";
import { TrackingAuthProvider } from "./tracking-auth.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider>
      <TrackingAuthProvider />
      <QueryClientProvider>
        <TooltipProvider>
          <ThemeProvider>
            <Toaster />
            {children}
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ConvexProvider>
  );
}
