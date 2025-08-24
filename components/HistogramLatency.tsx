"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Label
} from "recharts";
import { HistBin } from "../store/uiTypes";

type Props = {
  bins: HistBin[];
  stats: {
    n: number;
    errPct: number;
    p50?: number;
    p95?: number;
    p99?: number;
    totalCost?: number;
    avgCostPer1k?: number;
    overSloPct?: number;
  };
  sloMs: number;
  locale: string;
  timeZone: string;
  isComputing: boolean;
  hasRecords: boolean;
  onSelectRange: (range: { min: number; max: number }, additive: boolean) => void;
};

export const HistogramLatency: React.FC<Props> = ({
  bins,
  stats,
  sloMs,
  isComputing,
  hasRecords,
  onSelectRange
}) => {
  const data = useMemo(
    () =>
      bins.map((b) => ({
        label: `${Math.round(b.startMs)}–${Math.round(b.endMs)} ms`,
        ...b
      })),
    [bins]
  );

  if (!bins.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-slate-500">
        {hasRecords ? "No histogram bins to display." : "No data to visualize."}
      </div>
    );
  }

  const findLabel = (value?: number) => {
    if (value == null || !bins.length) return undefined;
    const bin = bins.find(b => value >= b.startMs && value < b.endMs) ?? bins[bins.length - 1];
    return `${Math.round(bin.startMs)}–${Math.round(bin.endMs)} ms`;
  };

  const labelP50 = findLabel(stats.p50);
  const labelP95 = findLabel(stats.p95);
  const labelSLO = findLabel(sloMs);

  const total = stats.n || bins.reduce((a, b) => a + b.count, 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-base font-semibold">Latency Distribution (Histogram)</h3>
          {isComputing && hasRecords && (
            <span className="h-3.5 w-3.5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5">p50: {stats.p50 != null ? `${Math.round(stats.p50)} ms` : "—"}</span>
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5">p95: {stats.p95 != null ? `${Math.round(stats.p95)} ms` : "—"}</span>
          <span className="rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5">&gt;SLO: {stats.overSloPct != null ? `${stats.overSloPct.toFixed(1)}%` : "—"}</span>
          <span className="text-slate-500">N={total}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart 
          data={data} 
          margin={{ top: 25, right: 10, bottom: 24, left: 10 }}
          onClick={(e: unknown) => {
            if (!onSelectRange) return;

            const event = e as { activeIndex?: string | number };
            if (event?.activeIndex != null && data) {
              const index = typeof event.activeIndex === "string" 
                ? parseInt(event.activeIndex) 
                : event.activeIndex;
              if (!isNaN(index) && data[index]) {
                const payload = data[index];
                // Don't allow clicking on empty bins
                if (payload.count === 0) return;
                const range = { min: payload.startMs as number, max: payload.endMs as number };
                onSelectRange(range, false);
              }
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
            tick={{ fontSize: 12 }}
            label={{ value: "Latency (ms)", position: "insideBottom", offset: -10 }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            label={{ value: "Completions", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown, props: unknown) => {
              if (name === "count") {
                const payload = (props as { payload?: { pct?: number } })?.payload;
                const pct = (payload?.pct ?? 0).toFixed(1);
                return [`${value} • ${pct}%`, "Completions"] as [string, string];
              }
              return [String(value), String(name)] as [string, string];
            }}
          />
          <Bar dataKey="count" cursor="pointer" />
          {labelP50 && (
            <ReferenceLine x={labelP50} stroke="#111827" strokeDasharray="3 3">
              <Label value="p50" position="top" />
            </ReferenceLine>
          )}
          {labelP95 && (
            <ReferenceLine x={labelP95} stroke="#374151" strokeDasharray="3 3">
              <Label value="p95" position="top" />
            </ReferenceLine>
          )}
          {labelSLO && (
            <ReferenceLine x={labelSLO} stroke="#DC2626" strokeDasharray="5 3">
              <Label value="SLO" position="top" />
            </ReferenceLine>
          )}
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-1 text-xs text-slate-500">
        Click a bar to filter by latency range.
      </div>
    </div>
  );
};
