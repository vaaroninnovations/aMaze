import { ConvexError } from "convex/values";

/** Extracts the friendly message from a backend error, falling back to a generic one. */
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ConvexError) {
    const data: unknown = e.data;
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") return data.message;
  }
  return fallback;
}
