// Shared client/server types (no runtime code — safe to import anywhere).

export type Band = "High" | "Mid" | "Low" | "Sub" | "Other";
export type Channel = "L" | "R" | "Pair" | "Full" | "Other";
export type Group = "FULL" | "XO" | "EQ" | "FINAL" | "PAIR" | "OTHER";

export interface SplData {
  freqs: number[];
  mags: number[];
}

export interface ImpulseData {
  t0: number;
  dt: number;
  peak: number;
  samples: number[];
  fs: number;
}

export interface Measurement {
  id: string;
  name: string;
  band: Band;
  channel: Channel;
  group: Group;
  sortIndex: number;
  spl: SplData;
  impulse: ImpulseData | null;
}

export interface ParsedTune {
  measurements: Measurement[];
}

export interface MeasurementMeta {
  id: string;
  name: string;
  band: Band;
  channel: Channel;
  group: Group;
  sortIndex: number;
  hasImpulse: boolean;
}

export interface TuneMeta {
  id: string;
  name: string;
  uploadedAt: string;
  measCount: number;
  dataUrl: string;
  rawUrl?: string;
  measurements: MeasurementMeta[];
}
