import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getTrackingAccessToken,
  setTrackingAccessTokenProvider,
} from "./access-token.ts";

describe("tracking access token", () => {
  afterEach(() => {
    setTrackingAccessTokenProvider(null);
  });

  it("uses the current Convex access token", async () => {
    const provider = vi.fn(async () => "convex-token");
    setTrackingAccessTokenProvider(provider);

    await expect(getTrackingAccessToken()).resolves.toBe("convex-token");
    expect(provider).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("refreshes when no current token is available", async () => {
    const provider = vi
      .fn<(forceRefresh: boolean) => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("refreshed-token");
    setTrackingAccessTokenProvider(provider);

    await expect(getTrackingAccessToken()).resolves.toBe("refreshed-token");
    expect(provider).toHaveBeenNthCalledWith(1, false);
    expect(provider).toHaveBeenNthCalledWith(2, true);
  });

  it("requires Google sign-in when no token is available", async () => {
    setTrackingAccessTokenProvider(async () => null);

    await expect(getTrackingAccessToken()).rejects.toThrow(
      "Sign in with Google before using video tracking.",
    );
  });
});
