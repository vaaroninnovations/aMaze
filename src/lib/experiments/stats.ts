/** Small, dependency-free statistics for comparing groups (descriptives, Welch t-test, one-way ANOVA). */

export type Descriptives = { n: number; mean: number; sd: number; sem: number; min: number; max: number; median: number };

export type TTestResult = { t: number; df: number; p: number; meanDiff: number; cohensD: number };

export type AnovaResult = {
  f: number;
  dfBetween: number;
  dfWithin: number;
  p: number;
  etaSquared: number;
};

export function describe(values: number[]): Descriptives | null {
  const n = values.length;
  if (n === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { n, mean, sd, sem: sd / Math.sqrt(n), min: sorted[0], max: sorted[n - 1], median };
}

/** Natural log of the gamma function (Lanczos approximation, ~15 significant digits). */
function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const z = x - 1;
  let a = c[0];
  const t = z + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Continued fraction for the incomplete beta function (modified Lentz). */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const TINY = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  // Use the symmetry relation where the continued fraction converges fastest.
  return x < (a + 1) / (a + b + 2) ? (front * betaContinuedFraction(a, b, x)) / a : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** Two-sided p-value of a Student t statistic. */
export function tTwoSidedP(t: number, df: number): number {
  if (!Number.isFinite(t)) return 0;
  return incompleteBeta(df / (df + t * t), df / 2, 0.5);
}

/** Upper-tail p-value of an F statistic. */
export function fUpperP(f: number, df1: number, df2: number): number {
  if (!Number.isFinite(f)) return 0;
  if (f <= 0) return 1;
  return incompleteBeta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2);
}

/** Welch's unequal-variance t-test (two-sided). Needs at least 2 values per group. */
export function welchTTest(a: number[], b: number[]): TTestResult | null {
  const da = describe(a);
  const db = describe(b);
  if (!da || !db || da.n < 2 || db.n < 2) return null;
  const va = da.sd ** 2 / da.n;
  const vb = db.sd ** 2 / db.n;
  const meanDiff = da.mean - db.mean;
  const pooledSd = Math.sqrt(((da.n - 1) * da.sd ** 2 + (db.n - 1) * db.sd ** 2) / (da.n + db.n - 2));
  const cohensD = pooledSd > 0 ? meanDiff / pooledSd : 0;
  if (va + vb === 0) {
    // Zero variance in both groups: identical means are not different, distinct means are.
    return { t: meanDiff === 0 ? 0 : Infinity * Math.sign(meanDiff), df: da.n + db.n - 2, p: meanDiff === 0 ? 1 : 0, meanDiff, cohensD };
  }
  const t = meanDiff / Math.sqrt(va + vb);
  const df = (va + vb) ** 2 / (va ** 2 / (da.n - 1) + vb ** 2 / (db.n - 1));
  return { t, df, p: tTwoSidedP(t, df), meanDiff, cohensD };
}

/** One-way ANOVA across groups. Groups with no values are ignored; needs 2+ groups and N > k. */
export function oneWayAnova(groups: number[][]): AnovaResult | null {
  const gs = groups.filter((g) => g.length > 0);
  const k = gs.length;
  const n = gs.reduce((a, g) => a + g.length, 0);
  if (k < 2 || n <= k) return null;
  const grand = gs.flat().reduce((a, b) => a + b, 0) / n;
  let ssBetween = 0;
  let ssWithin = 0;
  for (const g of gs) {
    const m = g.reduce((a, b) => a + b, 0) / g.length;
    ssBetween += g.length * (m - grand) ** 2;
    for (const v of g) ssWithin += (v - m) ** 2;
  }
  const dfBetween = k - 1;
  const dfWithin = n - k;
  const total = ssBetween + ssWithin;
  if (ssWithin === 0) {
    return { f: ssBetween === 0 ? 0 : Infinity, dfBetween, dfWithin, p: ssBetween === 0 ? 1 : 0, etaSquared: ssBetween === 0 ? 0 : 1 };
  }
  const f = ssBetween / dfBetween / (ssWithin / dfWithin);
  return { f, dfBetween, dfWithin, p: fUpperP(f, dfBetween, dfWithin), etaSquared: total > 0 ? ssBetween / total : 0 };
}

/** Bonferroni-adjusted p-value for `m` comparisons. */
export const bonferroni = (p: number, m: number) => Math.min(1, p * m);

export function formatP(p: number): string {
  if (p < 0.001) return "p < 0.001";
  return `p = ${p.toFixed(3)}`;
}

export function significanceStars(p: number): string {
  if (p < 0.001) return "***";
  if (p < 0.01) return "**";
  if (p < 0.05) return "*";
  return "ns";
}
