"use client";

import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

interface Props {
  data: uPlot.AlignedData;
  options: Omit<uPlot.Options, "width" | "height">;
  height?: number;
}

// Responsive uPlot wrapper: rebuilds on option changes, live-sets data,
// and resizes to its container width via ResizeObserver.
export default function UPlotChart({ data, options, height = 460 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.clientWidth || 800;
    const plot = new uPlot({ ...options, width, height }, data, el);
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

  return <div ref={containerRef} style={{ width: "100%" }} />;
}
