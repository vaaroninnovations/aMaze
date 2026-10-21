import { useQuery } from "@tanstack/react-query";
import { decodeTrack } from "@/lib/experiments/trial-data.ts";
import type { TrackPoint } from "@/lib/tracking/types.ts";

/** Loads the saved track file; cached forever since stored files never change. */
export function useTrackFile(url: string | null | undefined) {
  return useQuery<TrackPoint[]>({
    queryKey: ["track-file", url],
    enabled: !!url,
    staleTime: Infinity,
    queryFn: async () => {
      if (!url) return [];
      const res = await fetch(url);
      if (!res.ok) throw new Error("Could not download the saved track.");
      return decodeTrack(await res.json());
    },
  });
}

/** Loads the arena snapshot into an image element for canvas drawing. */
export function useSnapshot(url: string | null | undefined) {
  return useQuery<HTMLImageElement | null>({
    queryKey: ["trial-snapshot", url],
    enabled: url !== undefined,
    staleTime: Infinity,
    queryFn: () =>
      new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        // A missing snapshot only removes the background picture; the trial still works.
        img.onerror = () => resolve(null);
        img.src = url;
      }),
  });
}
