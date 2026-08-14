import {
  JavaDeserializer,
  JavaObject,
  collectByClass,
  fieldNum,
  fieldBool,
  fieldFloatArray,
  isJavaObject,
} from "@/lib/java/deserialize";

import type { SplData, ImpulseData, Measurement, ParsedTune } from "@/lib/types";
export type { Band, Channel, Group, SplData, ImpulseData, Measurement, ParsedTune } from "@/lib/types";

import { compareMeasurement } from "@/lib/style";
import { classify } from "@/lib/classify";

// 1/6-octave smoothing evaluated on a 1/12-octave log output grid. Works for
// both log- and linearly-spaced source data by mapping a ±1/12-octave frequency
// window back to source-array indices.
const OUT_PPO = 12; // output grid resolution (points per octave)
const HALF_OCT = 1 / 12; // half of 1/6 octave

function smoothSpl(
  spl: Float32Array | Float64Array,
  startFreq: number,
  freqStep: number,
  logStep: number,
  isLog: boolean,
  validStart: number,
  validEnd: number
): SplData {
  const n = spl.length;
  const freqAt = (i: number) =>
    isLog ? startFreq * Math.pow(logStep, i) : startFreq + i * freqStep;
  const indexAt = (f: number) =>
    isLog ? Math.log(f / startFreq) / Math.log(logStep) : (f - startFreq) / freqStep;

  const fMax = freqAt(n - 1);
  const lo = Math.max(validStart > 0 ? validStart : startFreq, startFreq, 2);
  const hi = Math.min(validEnd > 0 ? validEnd : fMax, fMax);
  if (!(hi > lo)) return { freqs: [], mags: [] };

  const nOut = Math.max(1, Math.round(Math.log2(hi / lo) * OUT_PPO));
  const freqs: number[] = [];
  const mags: number[] = [];
  for (let k = 0; k <= nOut; k++) {
    const fc = lo * Math.pow(2, k / OUT_PPO);
    if (fc > hi) break;
    const fLow = fc * Math.pow(2, -HALF_OCT);
    const fHigh = fc * Math.pow(2, HALF_OCT);
    let a = Math.ceil(indexAt(fLow));
    let b = Math.floor(indexAt(fHigh));
    a = Math.max(0, a);
    b = Math.min(n - 1, b);
    let sum = 0;
    let count = 0;
    if (b < a) {
      // window narrower than sample spacing: take nearest sample
      const idx = Math.min(n - 1, Math.max(0, Math.round(indexAt(fc))));
      const v = spl[idx];
      if (Number.isFinite(v)) {
        sum = v;
        count = 1;
      }
    } else {
      for (let j = a; j <= b; j++) {
        const v = spl[j];
        if (Number.isFinite(v)) {
          sum += v;
          count++;
        }
      }
    }
    if (count > 0) {
      freqs.push(fc);
      mags.push(sum / count);
    }
  }
  return { freqs, mags };
}

function decimateImpulse(
  data: Float32Array | Float64Array,
  peakIndex: number,
  startTime: number,
  T: number,
  peak: number
): ImpulseData {
  const fs = T > 0 ? 1 / T : 48000;
  // Window: 5 ms before peak to 120 ms after.
  const preSamples = Math.round(0.005 * fs);
  const postSamples = Math.round(0.12 * fs);
  const start = Math.max(0, peakIndex - preSamples);
  const end = Math.min(data.length - 1, peakIndex + postSamples);
  const windowLen = end - start + 1;
  const targetPoints = 3000;

  // Times are referenced so the impulse peak sits at t = 0 (eases overlay).
  const samples: number[] = [];
  if (windowLen <= targetPoints) {
    for (let i = start; i <= end; i++) samples.push(data[i]);
    return { t0: (start - peakIndex) * T, dt: T, peak, samples, fs };
  }
  void startTime;
  // min/max decimation to preserve peaks
  const bucket = windowLen / (targetPoints / 2);
  for (let k = 0; k < targetPoints / 2; k++) {
    const bStart = start + Math.floor(k * bucket);
    const bEnd = Math.min(end, start + Math.floor((k + 1) * bucket));
    let mn = Infinity;
    let mx = -Infinity;
    for (let i = bStart; i <= bEnd; i++) {
      const v = data[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    // preserve time ordering roughly: push min then max
    samples.push(mn, mx);
  }
  const effDt = (windowLen / samples.length) * T;
  return { t0: (start - peakIndex) * T, dt: effDt, peak, samples, fs };
}

function getField(obj: JavaObject, name: string): unknown {
  return obj.__fields[name];
}

export function parseMdat(buf: Buffer): ParsedTune {
  const roots = JavaDeserializer.parse(buf);
  const measObjs = collectByClass(roots, "roomeqwizard.MeasData");
  const measurements: Measurement[] = [];

  measObjs.forEach((m, idx) => {
    const name = String(getField(m, "shortDesc") ?? `Measurement ${idx + 1}`);
    const splArr = fieldFloatArray(getField(m, "splValues"));
    if (!splArr) return;
    const startFreq = fieldNum(getField(m, "startFreq")) ?? 1;
    const ppo = fieldNum(getField(m, "ppo")) ?? 96;
    const freqStep = fieldNum(getField(m, "freqStep")) ?? 1;
    const logStep = fieldNum(getField(m, "logStep")) ?? Math.pow(2, 1 / (ppo || 96));
    const isLog = fieldBool(getField(m, "isLogSpaced")) ?? true;
    const validStart = fieldNum(getField(m, "validStartFreq")) ?? 0;
    const validEnd = fieldNum(getField(m, "validEndFreq")) ?? 0;

    const spl = smoothSpl(splArr, startFreq, freqStep, logStep, isLog, validStart, validEnd);

    // impulse
    let impulse: ImpulseData | null = null;
    const irData = getField(m, "irData");
    if (isJavaObject(irData)) {
      const sd = getField(irData, "ir");
      if (isJavaObject(sd)) {
        const data = fieldFloatArray(getField(sd, "data"));
        const T = fieldNum(getField(sd, "T")) ?? 1 / 48000;
        const startTime = fieldNum(getField(sd, "startTime")) ?? 0;
        const peak = fieldNum(getField(sd, "absMaxVal")) ?? fieldNum(getField(sd, "normVal")) ?? 1;
        const peakIndex = Math.round(fieldNum(getField(sd, "absMaxIndex")) ?? 0);
        if (data) {
          impulse = decimateImpulse(data, peakIndex, startTime, T, peak || 1);
        }
      }
    }

    const { band, channel, group } = classify(name);
    measurements.push({
      id: `${idx}`,
      name,
      band,
      channel,
      group,
      sortIndex: 0,
      spl,
      impulse,
    });
  });

  measurements.sort(compareMeasurement);
  measurements.forEach((m, i) => (m.sortIndex = i));

  return { measurements };
}
