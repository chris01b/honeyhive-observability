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
import { EmptyState } from "./EmptyState";

type Props = {
  bins: HistBin[];
  stats: {
    n: number;
    p50?: number;
    p95?: number;
    p99?: number;
  };
  sloMs: number;
  onSelectRange?: (range: { min: number; max: number }, additive: boolean) => void;
};

export const HistogramLatency: React.FC<Props> = ({
  bins,
  stats,
  sloMs,
  onSelectRange
}) => {
  const data = useMemo(
    () => bins.map(b => ({ ...b, label: `${Math.round(b.startMs)}–${Math.round(b.endMs)} ms` })),
    [bins]
  );

  if (!bins.length) {
    return (
      <div>
        <h3>Latency Distribution</h3>
        <EmptyState 
          title="No data to visualize" 
          subtitle="Upload data to see the latency distribution chart."
        />
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
  const labelP99 = findLabel(stats.p99);
  const labelSLO = findLabel(sloMs);

  return (
    <div>
      <h3>Latency Distribution</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart 
          data={data} 
          margin={{ top: 24, right: 10, bottom: 24, left: 10 }}
          onClick={(e: any) => {
            if (!onSelectRange) return;

            if (e?.activeIndex != null && data) {
              const index = parseInt(e.activeIndex);
              if (!isNaN(index) && data[index]) {
                const payload = data[index];
                const range = { min: payload.startMs as number, max: payload.endMs as number };
                const additive = !!(e?.event?.shiftKey);
                onSelectRange(range, additive);
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
            formatter={(value: any, name: any, props: any) => {
              if (name === "count") {
                const pct = (props?.payload?.pct ?? 0).toFixed(1);
                return [`${value} • ${pct}%`, "Completions"];
              }
              return [value, name];
            }}
          />
          <Bar 
            dataKey="count" 
            fill="#3B82F6" 
            stroke="#1E40AF" 
            strokeWidth={1}
            cursor="pointer"
          />
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
          {labelP99 && (
            <ReferenceLine x={labelP99} stroke="#6B7280" strokeDasharray="3 3">
              <Label value="p99" position="top" />
            </ReferenceLine>
          )}
          {labelSLO && (
            <ReferenceLine x={labelSLO} stroke="#DC2626" strokeDasharray="5 3">
              <Label value="SLO" position="top" />
            </ReferenceLine>
          )}
        </BarChart>
      </ResponsiveContainer>
      {onSelectRange && (
        <div className="mt-1 text-xs text-slate-500">
          Click a bar to filter by latency range. Shift-click to multi-select.
        </div>
      )}
    </div>
  );
};
