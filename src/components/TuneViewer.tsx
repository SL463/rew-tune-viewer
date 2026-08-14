"use client";

import { useEffect, useMemo, useState } from "react";
import type uPlot from "uplot";
import type { ParsedTune, Measurement, Group } from "@/lib/types";
import { buildSplData, buildImpulseData } from "@/lib/chartData";
import {
  traceColor,
  traceDash,
  traceWidth,
  GROUP_LABEL,
  MEASURE_GROUP_ORDER,
  compareMeasurement,
  compareSpeaker,
} from "@/lib/style";
import { classify } from "@/lib/classify";
import UPlotChart from "@/components/UPlotChart";

type Tab = "spl" | "impulse";
type ImpMode = "dbfs" | "pct";

const AXIS = "#64748b";
const GRID = "rgba(148,163,184,0.12)";
const FREQ_TICKS = [
  20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000,
];

function fmtHz(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `${v}`;
}

export default function TuneViewer({
  name,
  dataUrl,
}: {
  name: string;
  dataUrl: string;
}) {
  const [tune, setTune] = useState<ParsedTune | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("spl");
  const [impMode, setImpMode] = useState<ImpMode>("pct");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<Group>>(new Set());

  function toggleCollapse(g: Group) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    fetch(dataUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load data (${r.status})`);
        return r.json();
      })
      .then((t: ParsedTune) => {
        if (cancelled) return;
        // Re-apply classification from the name so grouping rules stay current
        // for previously-processed tunes.
        const reclassified: ParsedTune = {
          measurements: t.measurements.map((m) => ({
            ...m,
            ...classify(m.name),
          })),
        };
        setTune(reclassified);
        // default: only the FINAL group is selected; everything else off.
        const finals = reclassified.measurements.filter((m) => m.group === "FINAL");
        setSelected(new Set(finals.map((m) => m.id)));
      })
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  // Ordered by measurement-type group, then speaker (band/channel) within group.
  const measurements = useMemo(
    () => [...(tune?.measurements ?? [])].sort(compareMeasurement),
    [tune]
  );
  const selectedMeas = useMemo(
    () => measurements.filter((m) => selected.has(m.id)),
    [measurements, selected]
  );

  const groups = useMemo(() => {
    const set = new Set<Group>();
    measurements.forEach((m) => set.add(m.group));
    return MEASURE_GROUP_ORDER.filter((g) => set.has(g));
  }, [measurements]);

  function selectGroup(g: Group) {
    setSelected(new Set(measurements.filter((m) => m.group === g).map((m) => m.id)));
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---- chart data + options ----
  const splChart = useMemo(() => {
    if (tab !== "spl") return null;
    const { x, series } = buildSplData(selectedMeas);
    const data: uPlot.AlignedData = [x, ...series];
    const options: Omit<uPlot.Options, "width" | "height"> = {
      scales: { x: { distr: 3 }, y: { auto: true } },
      axes: [
        {
          stroke: AXIS,
          grid: { stroke: GRID, width: 1 },
          ticks: { stroke: GRID },
          splits: () => FREQ_TICKS,
          values: (_u, splits) =>
            splits.map((s) => (s == null || !isFinite(s) ? "" : fmtHz(s))),
          font: "12px ui-monospace, monospace",
        },
        {
          stroke: AXIS,
          grid: { stroke: GRID, width: 1 },
          ticks: { stroke: GRID },
          size: 52,
          values: (_u, splits) => splits.map((s) => `${s}`),
          font: "12px ui-monospace, monospace",
        },
      ],
      series: [
        {
          label: "Hz",
          value: (_u, v) => (v == null ? "" : `${Math.round(v)} Hz`),
        },
        ...selectedMeas.map((m) => ({
          label: m.name,
          stroke: traceColor(m),
          width: traceWidth(m.channel),
          dash: traceDash(m.channel),
          points: { show: false },
          value: (_u: unknown, v: number | null) =>
            v == null ? "" : `${v.toFixed(1)} dB`,
        })),
      ],
      legend: { show: true, live: true },
      cursor: { drag: { x: true, y: false } },
    };
    return { data, options };
  }, [tab, selectedMeas]);

  const impChart = useMemo(() => {
    if (tab !== "impulse") return null;
    const { x, series } = buildImpulseData(selectedMeas, impMode);
    const data: uPlot.AlignedData = [x, ...series];
    const yLabel = impMode === "dbfs" ? "dBFS" : "% FS";
    const options: Omit<uPlot.Options, "width" | "height"> = {
      scales: { x: { time: false }, y: { auto: true } },
      axes: [
        {
          stroke: AXIS,
          grid: { stroke: GRID, width: 1 },
          ticks: { stroke: GRID },
          values: (_u, splits) => splits.map((s) => `${s} ms`),
          font: "12px ui-monospace, monospace",
        },
        {
          stroke: AXIS,
          grid: { stroke: GRID, width: 1 },
          ticks: { stroke: GRID },
          size: 52,
          font: "12px ui-monospace, monospace",
        },
      ],
      series: [
        { label: "ms", value: (_u, v) => (v == null ? "" : `${v.toFixed(2)} ms`) },
        ...selectedMeas
          .filter((m) => m.impulse)
          .map((m) => ({
            label: m.name,
            stroke: traceColor(m),
            width: traceWidth(m.channel),
            dash: traceDash(m.channel),
            points: { show: false },
            value: (_u: unknown, v: number | null) =>
              v == null ? "" : `${v.toFixed(2)} ${yLabel}`,
          })),
      ],
      legend: { show: true, live: true },
      cursor: { drag: { x: true, y: false } },
    };
    return { data, options };
  }, [tab, selectedMeas, impMode]);

  if (error)
    return <div className="rounded-lg bg-red-950/40 p-4 text-red-300">{error}</div>;
  if (!tune) return <div className="p-8 text-slate-400">Loading measurements…</div>;

  const byGroup = groupByMeasureType(measurements);
  const impCount = selectedMeas.filter((m) => m.impulse).length;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-72 shrink-0 space-y-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Groups
          </div>
          <div className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => selectGroup(g)}
                className="rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-200 hover:border-sky-500 hover:text-white"
              >
                {GROUP_LABEL[g] ?? g}
              </button>
            ))}
            <button
              onClick={() => setSelected(new Set(measurements.map((m) => m.id)))}
              className="rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:border-sky-500"
            >
              All
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:border-sky-500"
            >
              None
            </button>
          </div>
        </div>

        <div className="pr-1">
          {byGroup.map(({ group, items }) => {
            const isCollapsed = collapsed.has(group);
            const selCount = items.filter((m) => selected.has(m.id)).length;
            return (
              <div key={group} className="mb-2">
                <button
                  onClick={() => toggleCollapse(group)}
                  className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-200"
                >
                  <svg
                    viewBox="0 0 12 12"
                    className={`h-3 w-3 shrink-0 transition-transform ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" />
                  </svg>
                  <span>{GROUP_LABEL[group] ?? group}</span>
                  <span className="ml-auto font-normal normal-case tracking-normal text-slate-600">
                    {selCount}/{items.length}
                  </span>
                </button>
                {!isCollapsed && (
                  <ul className="space-y-0.5 pl-1">
                    {items.map((m) => (
                      <li key={m.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-800/60">
                          <input
                            type="checkbox"
                            checked={selected.has(m.id)}
                            onChange={() => toggle(m.id)}
                            className="accent-sky-500"
                          />
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ background: traceColor(m) }}
                          />
                          <span className="truncate text-slate-200">{m.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-700 p-0.5">
            <TabBtn active={tab === "spl"} onClick={() => setTab("spl")}>
              SPL
            </TabBtn>
            <TabBtn active={tab === "impulse"} onClick={() => setTab("impulse")}>
              Impulse
            </TabBtn>
          </div>
          {tab === "impulse" && (
            <div className="flex rounded-lg border border-slate-700 p-0.5">
              <TabBtn active={impMode === "dbfs"} onClick={() => setImpMode("dbfs")}>
                dBFS
              </TabBtn>
              <TabBtn active={impMode === "pct"} onClick={() => setImpMode("pct")}>
                % FS
              </TabBtn>
            </div>
          )}
          <div className="ml-auto text-xs text-slate-500">
            {tab === "spl"
              ? `${selectedMeas.length} selected · 1/6 octave smoothed`
              : `${impCount} with impulse data`}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          {tab === "spl" && splChart && (
            <UPlotChart data={splChart.data} options={splChart.options} height={480} />
          )}
          {tab === "impulse" &&
            impChart &&
            (impCount ? (
              <UPlotChart data={impChart.data} options={impChart.options} height={480} />
            ) : (
              <div className="p-10 text-center text-slate-500">
                No impulse data in the selected measurements.
              </div>
            ))}
        </div>
        <p className="text-xs text-slate-600">{name}</p>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-sm font-medium transition ${
        active ? "bg-sky-600 text-white" : "text-slate-300 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// Group by measurement type (Full, XO, EQ, Final, Pairs, Other); items within
// each group are sorted by speaker type/location (High/Mid/Low/Sub, then L/R).
function groupByMeasureType(measurements: Measurement[]) {
  const map = new Map<Group, Measurement[]>();
  for (const m of measurements) {
    if (!map.has(m.group)) map.set(m.group, []);
    map.get(m.group)!.push(m);
  }
  return MEASURE_GROUP_ORDER.filter((g) => map.has(g)).map((group) => ({
    group,
    items: map.get(group)!.slice().sort(compareSpeaker),
  }));
}
