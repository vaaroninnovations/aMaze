import { describe, expect, it } from "vitest";
import { decodeTrack, encodeTrack } from "./trial-data.ts";

describe("track file encoding", () => {
  it("round-trips points including lost detections", () => {
    const points = [
      { t: 0, x: 10.123, y: 20.456, found: true, area: 41.6 },
      { t: 0.1, x: 0, y: 0, found: false, area: 0 },
      { t: 0.2, x: 11.5, y: 21, found: true, area: 40 },
    ];
    const decoded = decodeTrack(JSON.parse(encodeTrack(points)));
    expect(decoded).toEqual([
      { t: 0, x: 10.12, y: 20.46, found: true, area: 42 },
      { t: 0.1, x: 0, y: 0, found: false, area: 0 },
      { t: 0.2, x: 11.5, y: 21, found: true, area: 40 },
    ]);
  });

  it("rejects files with mismatched columns", () => {
    expect(() => decodeTrack({ v: 1, t: [0, 1], x: [1], y: [1], f: [1], a: [1] })).toThrow(/incomplete/);
  });

  it("rejects unknown formats", () => {
    expect(() => decodeTrack({ points: [] })).toThrow(/unknown format/);
  });
});
