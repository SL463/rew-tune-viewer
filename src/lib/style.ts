import type { Band, Channel, Group, MeasurementMeta } from "@/lib/types";

// Measurement-type groups, in display/sort order.
export const MEASURE_GROUP_ORDER: Group[] = [
  "FULL",
  "XO",
  "EQ",
  "FINAL",
  "PAIR",
  "OTHER",
];
export const MEASURE_ORDER: Record<Group, number> = {
  FULL: 0,
  XO: 1,
  EQ: 2,
  FINAL: 3,
  PAIR: 4,
  OTHER: 5,
};

// Within a group, sort by speaker type/location: High→Mid→Low→Sub, then L→R.
export const BAND_ORDER: Record<Band, number> = {
  High: 0,
  Mid: 1,
  Low: 2,
  Sub: 3,
  Other: 4,
};
export const CHANNEL_ORDER: Record<Channel, number> = {
  L: 0,
  R: 1,
  Pair: 2,
  Full: 3,
  Other: 4,
};

// Speaker-only comparator (used within a measurement-type group).
export function compareSpeaker(
  a: Pick<MeasurementMeta, "band" | "channel" | "name">,
  b: Pick<MeasurementMeta, "band" | "channel" | "name">
): number {
  if (BAND_ORDER[a.band] !== BAND_ORDER[b.band])
    return BAND_ORDER[a.band] - BAND_ORDER[b.band];
  if (CHANNEL_ORDER[a.channel] !== CHANNEL_ORDER[b.channel])
    return CHANNEL_ORDER[a.channel] - CHANNEL_ORDER[b.channel];
  return a.name.localeCompare(b.name);
}

// Full comparator: measurement-type group first, then speaker within group.
export function compareMeasurement(
  a: Pick<MeasurementMeta, "band" | "channel" | "group" | "name">,
  b: Pick<MeasurementMeta, "band" | "channel" | "group" | "name">
): number {
  if (MEASURE_ORDER[a.group] !== MEASURE_ORDER[b.group])
    return MEASURE_ORDER[a.group] - MEASURE_ORDER[b.group];
  return compareSpeaker(a, b);
}

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
  FULL: "Full",
  XO: "XO",
  EQ: "EQ",
  FINAL: "Final",
  PAIR: "Pairs",
  OTHER: "Combined",
};
