"use client";

import { useEffect, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

interface Props {
  data: uPlot.AlignedData;
  options: Omit<uPlot.Options, "width" | "height">;
  height?: number;
}

// Responsive uPlot wrapper: rebuilds on option changes, live-sets data,
// resizes via ResizeObserver, and shows a "Reset zoom" button whenever the
// x-axis is zoomed in (drag-to-zoom is enabled by the chart options).
export default function UPlotChart({ data, options, height = 460 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.clientWidth || 800;

    const syncZoom = (u: uPlot) => {
      const xs = u.data[0];
      if (!xs || xs.length < 2) return;
      const lo = xs[0] as number;
      const hi = xs[xs.length - 1] as number;
      const span = hi - lo || 1;
      const eps = Math.abs(span) * 1e-6;
      const min = u.scales.x.min ?? lo;
      const max = u.scales.x.max ?? hi;
      setZoomed(min > lo + eps || max < hi - eps);
    };

    const merged: Omit<uPlot.Options, "width" | "height"> = {
      ...options,
      hooks: {
        ...options.hooks,
        setScale: [
          ...(options.hooks?.setScale ?? []),
          (u, key) => {
            if (key === "x") syncZoom(u);
          },
        ],
      },
    };

    const plot = new uPlot({ ...merged, width, height }, data, el);
    plotRef.current = plot;

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) plot.setSize({ width: w, height });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, height]);

  useEffect(() => {
    if (plotRef.current) plotRef.current.setData(data);
  }, [data]);

  function resetZoom() {
    const u = plotRef.current;
    if (!u) return;
    const xs = u.data[0];
    if (!xs || xs.length < 2) return;
    u.setScale("x", { min: xs[0] as number, max: xs[xs.length - 1] as number });
    setZoomed(false);
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {zoomed && (
        <button
          onClick={resetZoom}
          className="absolute right-2 top-2 z-10 rounded-md border border-slate-600 bg-slate-800/90 px-2.5 py-1 text-xs font-medium text-slate-100 shadow hover:border-sky-500 hover:text-white"
        >
          Reset zoom
        </button>
      )}
      <div ref={containerRef} style={{ width: "100%" }} />
    </div>
  );
}
