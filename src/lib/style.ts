import type { Band, Channel, MeasurementMeta } from "@/lib/types";

export const BAND_COLOR: Record<Band, string> = {
  High: "#f59e0b", // amber
  Mid: "#22c55e", // green
  Low: "#3b82f6", // blue
  Sub: "#a855f7", // purple
  Other: "#94a3b8", // slate
};

// Slightly distinct hue per channel within a band keeps overlaid L/R readable.
export function traceColor(m: Pick<MeasurementMeta, "band" | "channel">): string {
  if (m.band === "Other") {
    if (m.channel === "L") return "#ef4444";
    if (m.channel === "R") return "#06b6d4";
    if (m.channel === "Full") return "#e5e7eb";
    return "#94a3b8";
  }
  return BAND_COLOR[m.band];
}

// L solid, R dashed, Pair dotted, Full thick solid — mirrors REW conventions.
export function traceDash(channel: Channel): number[] | undefined {
  switch (channel) {
    case "R":
      return [8, 4];
    case "Pair":
      return [2, 3];
    default:
      return undefined;
  }
}

export function traceWidth(channel: Channel): number {
  if (channel === "Full") return 2.5;
  if (channel === "Pair") return 2;
  return 1.6;
}

export const GROUP_LABEL: Record<string, string> = {
  FINAL: "Final",
  XO: "Crossover",
  FULL: "Full-range",
  PAIR: "Pairs",
  OTHER: "Other",
};
