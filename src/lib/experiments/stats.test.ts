import { describe as suite, expect, it } from "vitest";
import { bonferroni, describe, formatP, fUpperP, oneWayAnova, tTwoSidedP, welchTTest } from "./stats.ts";

suite("descriptives", () => {
  it("computes mean, sample SD, SEM and median", () => {
    const d = describe([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(d?.mean).toBe(5);
    expect(d?.sd).toBeCloseTo(2.138, 3);
    expect(d?.sem).toBeCloseTo(2.138 / Math.sqrt(8), 3);
    expect(d?.median).toBe(4.5);
  });

  it("returns null for no data and zero SD for one value", () => {
    expect(describe([])).toBeNull();
    expect(describe([3])?.sd).toBe(0);
  });
});

suite("distribution tails", () => {
  it("matches published t and F critical values", () => {
    expect(tTwoSidedP(2.228, 10)).toBeCloseTo(0.05, 3);
    expect(tTwoSidedP(0, 5)).toBeCloseTo(1, 6);
    expect(fUpperP(3.885, 2, 12)).toBeCloseTo(0.05, 3);
  });
});

suite("Welch t-test", () => {
  it("matches a hand-computed Welch result", () => {
    // Means 19.78 vs 22.825; variances 0.847 and 0.8958 -> t = -3.045 / sqrt(0.1694 + 0.22396) = -4.855.
    const r = welchTTest([19.1, 20.3, 18.7, 21.0, 19.8], [22.4, 23.1, 21.8, 24.0]);
    expect(r?.t).toBeCloseTo(-4.855, 2);
    expect(r?.df).toBeCloseTo(6.476, 2);
    expect(r?.p).toBeCloseTo(tTwoSidedP(-4.855, r?.df ?? 0), 3);
    expect(r?.p).toBeGreaterThan(0.001);
    expect(r?.p).toBeLessThan(0.005);
  });

  it("needs two values per group", () => {
    expect(welchTTest([1], [2, 3])).toBeNull();
  });

  it("handles groups without variance", () => {
    expect(welchTTest([5, 5], [5, 5])?.p).toBe(1);
    expect(welchTTest([5, 5], [6, 6])?.p).toBe(0);
  });
});

suite("one-way ANOVA", () => {
  it("matches a textbook example", () => {
    // Means 5, 6, 9 (grand 6.667): SSB = 43.33, SSW = 22 -> F = 21.67 / 1.833 = 11.82 on (2, 12).
    const r = oneWayAnova([
      [4, 5, 6, 5, 5],
      [6, 7, 5, 4, 8],
      [9, 8, 10, 11, 7],
    ]);
    expect(r?.dfBetween).toBe(2);
    expect(r?.dfWithin).toBe(12);
    expect(r?.f).toBeCloseTo(11.818, 2);
    // F crit at alpha 0.01 on (2, 12) is 6.93 and at 0.001 is 12.97, so 0.001 < p < 0.01.
    expect(r?.p).toBeGreaterThan(0.001);
    expect(r?.p).toBeLessThan(0.01);
    expect(r?.etaSquared).toBeCloseTo(43.333 / 65.333, 3);
  });

  it("ignores empty groups and needs two real groups", () => {
    expect(oneWayAnova([[1, 2], []])).toBeNull();
  });
});

suite("helpers", () => {
  it("caps Bonferroni at 1 and formats tiny p-values", () => {
    expect(bonferroni(0.4, 3)).toBe(1);
    expect(formatP(0.0004)).toBe("p < 0.001");
    expect(formatP(0.0412)).toBe("p = 0.041");
  });
});
