import { ConvexProvider as ReactConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "VITE_CONVEX_URL must be configured before starting the app.",
  );
}
const convex = new ConvexReactClient(convexUrl);

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactConvexProvider client={convex}>{children}</ReactConvexProvider>
  );
}
