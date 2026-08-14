import type { Band, Channel, Group } from "@/lib/types";

// Derives speaker band, channel, and measurement-type group from a measurement
// name. Kept client-safe (name-only, no server deps) so the viewer can re-apply
// it to already-stored tunes — classification rule changes then take effect
// without re-processing uploads.
export function classify(name: string): {
  band: Band;
  channel: Channel;
  group: Group;
} {
  const n = name.toLowerCase();

  let band: Band = "Other";
  if (/\bsub\b|sub/.test(n)) band = "Sub";
  else if (/high/.test(n)) band = "High";
  else if (/mid/.test(n)) band = "Mid";
  else if (/low/.test(n)) band = "Low";

  let channel: Channel = "Other";
  if (/\bfl\b|front left|left|\bl\b/.test(n)) channel = "L";
  if (/\bfr\b|front right|right|\br\b/.test(n)) channel = "R";
  if (/pair/.test(n)) channel = "Pair";
  if (/full system|full sys/.test(n)) channel = "Full";
  if (/^left\b/.test(n)) channel = "L";
  if (/^right\b/.test(n)) channel = "R";

  let group: Group = "OTHER";
  if (/system/.test(n)) group = "OTHER"; // e.g. "Full System" belongs in Other
  else if (/final/.test(n)) group = "FINAL";
  else if (/\bxo\b|xover|cross/.test(n)) group = "XO";
  else if (/\beq\b|equal/.test(n)) group = "EQ";
  else if (/full/.test(n)) group = "FULL";
  else if (/pair/.test(n)) group = "PAIR";

  return { band, channel, group };
}
