import { useConvexAuth } from "@convex-dev/auth/react";
import { useEffect } from "react";
import { setTrackingAccessTokenProvider } from "@/lib/tracking/access-token.ts";

export function TrackingAuthProvider() {
  const { fetchAccessToken } = useConvexAuth();

  useEffect(() => {
    const provider = (forceRefresh: boolean) =>
      fetchAccessToken({ forceRefreshToken: forceRefresh });
    setTrackingAccessTokenProvider(provider);
    return () => setTrackingAccessTokenProvider(null);
  }, [fetchAccessToken]);

  return null;
}
