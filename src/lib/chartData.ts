import type { Measurement } from "@/lib/types";

// Linear interpolation of (xs, ys) at query x. Returns null outside range.
function interpAt(xs: number[], ys: number[], x: number): number | null {
  const n = xs.length;
  if (n === 0) return null;
  if (x < xs[0] || x > xs[n - 1]) return null;
  // binary search
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const x0 = xs[lo];
  const x1 = xs[hi];
  if (x1 === x0) return ys[lo];
  const t = (x - x0) / (x1 - x0);
  return ys[lo] + t * (ys[hi] - ys[lo]);
}

export function buildLogGrid(fMin: number, fMax: number, ppo = 24): number[] {
  const grid: number[] = [];
  const n = Math.ceil(Math.log2(fMax / fMin) * ppo);
  for (let i = 0; i <= n; i++) grid.push(fMin * Math.pow(2, i / ppo));
  return grid;
}

// SPL: shared log-frequency x, each selected measurement resampled onto it.
export function buildSplData(
  measurements: Measurement[],
  fMin = 15,
  fMax = 20000
): { x: number[]; series: (number | null)[][] } {
  const grid = buildLogGrid(fMin, fMax, 24);
  const series = measurements.map((m) => {
    const xs = m.spl.freqs;
    const ys = m.spl.mags;
    // interpolate in log-x domain for accuracy
    return grid.map((f) => interpAt(xs, ys, f));
  });
  return { x: grid, series };
}

// Impulse: shared time grid (ms), peak referenced to t = 0.
export function buildImpulseData(
  measurements: Measurement[],
  mode: "dbfs" | "pct"
): { x: number[]; series: (number | null)[][] } {
  const withImp = measurements.filter((m) => m.impulse);
  if (!withImp.length) return { x: [], series: [] };

  let tMin = Infinity;
  let tMax = -Infinity;
  let minDt = Infinity;
  for (const m of withImp) {
    const imp = m.impulse!;
    const t0 = imp.t0;
    const t1 = imp.t0 + imp.dt * (imp.samples.length - 1);
    tMin = Math.min(tMin, t0);
    tMax = Math.max(tMax, t1);
    minDt = Math.min(minDt, imp.dt);
  }
  const dt = Math.max(minDt, (tMax - tMin) / 6000);
  const grid: number[] = [];
  for (let t = tMin; t <= tMax; t += dt) grid.push(t);

  const series = withImp.map((m) => {
    const imp = m.impulse!;
    const xs: number[] = new Array(imp.samples.length);
    for (let i = 0; i < imp.samples.length; i++) xs[i] = imp.t0 + i * imp.dt;
    return grid.map((t) => {
      const v = interpAt(xs, imp.samples, t);
      if (v === null) return null;
      if (mode === "pct") return v * 100; // % of full scale
      const a = Math.abs(v);
      return a > 0 ? Math.max(20 * Math.log10(a), -100) : -100; // dBFS
    });
  });
  // x in milliseconds
  return { x: grid.map((t) => t * 1000), series };
}
