"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Label
} from "recharts";

type LlmResponseRecord = {
  id?: string;
  timestamp?: string;
  responseTimeMs?: number;
  model?: string;
  status?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  qualityScore?: number;
  responseText?: string;
};

type HistBin = { startMs: number; endMs: number; count: number; pct: number };

const fmtNumber = (n: number | undefined, digits = 0) =>
  typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "—";

const fmtTime = (iso?: string, locale = "en-US", timeZone = "UTC") => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    timeZone, year: "2-digit", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).format(d);
};

function quantile(values: number[], q: number) {
  if (!values.length) return undefined;
  const arr = values.slice().sort((a, b) => a - b);
  const pos = (arr.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return arr[base + 1] !== undefined ? arr[base] + rest * (arr[base + 1] - arr[base]) : arr[base];
}

function buildHistogram(lats: number[], desiredBins = 24): {
  bins: HistBin[], p50?: number, p95?: number, p99?: number
} {
  if (!lats.length) return { bins: [] };
  const p50 = quantile(lats, 0.5);
  const p95 = quantile(lats, 0.95);
  const p99 = quantile(lats, 0.99);

  let min = Math.min(...lats);
  let max = Math.max(...lats);
  if (max === min) max = min + 1;

  const binsCount = Math.max(1, Math.min(120, desiredBins));
  const width = (max - min) / binsCount;
  const counts = new Array(binsCount).fill(0);
  for (const v of lats) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binsCount) idx = binsCount - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  const total = lats.length;
  const bins: HistBin[] = [];
  for (let i = 0; i < binsCount; i++) {
    const startMs = min + i * width;
    const endMs = startMs + width;
    const count = counts[i];
    bins.push({ startMs, endMs, count, pct: (count / total) * 100 });
  }
  return { bins, p50, p95, p99 };
}

function parseStrict(json: any): LlmResponseRecord[] {
  if (typeof json !== "object" || json === null || !Array.isArray(json.responses)) {
    throw new Error("Invalid file: expected an object with a 'responses' array.");
  }

  const toNum = (v: any): number | undefined =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined;

  return json.responses.map((r: any) => {
    const prompt = toNum(r.prompt_tokens);
    const completion = toNum(r.completion_tokens);
    const totalTokensExplicit = toNum(r.total_tokens);
    const totalTokens =
      totalTokensExplicit ??
      (prompt != null || completion != null
        ? (prompt ?? 0) + (completion ?? 0)
        : undefined);

    const quality = toNum(r?.evaluation_metrics?.response_quality);

    return {
      id: typeof r.id === "string" ? r.id : undefined,
      timestamp: typeof r.timestamp === "string" ? r.timestamp : undefined,
      responseTimeMs: toNum(r.response_time_ms),
      model: typeof r.model === "string" ? r.model : undefined,
      status: typeof r.status === "string" ? r.status : undefined,
      promptTokens: prompt,
      completionTokens: completion,
      totalTokens,
      costUsd: toNum(r.cost_usd),
      qualityScore: quality,
      responseText: typeof r.output === "string" ? r.output : undefined
    };
  });
}

export default function Page() {
  const [records, setRecords] = useState<LlmResponseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sloMs, setSloMs] = useState<number>(800);

  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  const timeZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const latencies = useMemo(
    () => records.map(r => Number(r.responseTimeMs)).filter((n) => Number.isFinite(n)),
    [records]
  );

  const { bins, p50, p95, p99 } = useMemo(
    () => buildHistogram(latencies, 24),
    [latencies]
  );

  const data = useMemo(
    () => bins.map(b => ({ ...b, label: `${Math.round(b.startMs)}–${Math.round(b.endMs)} ms` })),
    [bins]
  );

  const findLabel = (value?: number) => {
    if (value == null || !bins.length) return undefined;
    const bin = bins.find(b => value >= b.startMs && value < b.endMs) ?? bins[bins.length - 1];
    return `${Math.round(bin.startMs)}–${Math.round(bin.endMs)} ms`;
  };
  const labelP50 = findLabel(p50);
  const labelP95 = findLabel(p95);
  const labelP99 = findLabel(p99);
  const labelSLO = findLabel(sloMs);

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setRecords(parseStrict(json));
    } catch (e: any) {
      setRecords([]);
      setError(`${file.name ? `in ${file.name}: ` : ""}${e?.message ?? "Failed to parse JSON."}`);
    }
  }

  return (
    <div>
      <h1>LLM Response Dashboard</h1>
      
      <div>
        <input 
          type="file" 
          accept=".json" 
          onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
        />
        
        <div>
          <label htmlFor="slo">SLO (ms):</label>
          <input
            id="slo"
            type="number"
            min={1}
            step={10}
            value={sloMs}
            onChange={(e) => setSloMs(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
      </div>

      {error && (
        <div>
          {error}
        </div>
      )}

      <div>
        <h2>Responses ({records.length})</h2>
        {latencies.length > 0 && (
          <div>
            <p>Latency data points: {latencies.length}</p>
            <p>p50: {p50 != null ? `${Math.round(p50)} ms` : "—"} | p95: {p95 != null ? `${Math.round(p95)} ms` : "—"} | p99: {p99 != null ? `${Math.round(p99)} ms` : "—"}</p>
            <p>SLO violations: {latencies.filter(lat => lat > sloMs).length} / {latencies.length} ({((latencies.filter(lat => lat > sloMs).length / latencies.length) * 100).toFixed(1)}%)</p>
          </div>
        )}
        
        {data.length > 0 && (
          <div>
            <h3>Latency Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" angle={-20} textAnchor="end" height={50} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" />
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
          </div>
        )}
        {records.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="">
                <th className="text-left">ID</th>
                <th className="text-left">Timestamp</th>
                <th className="text-left">Model</th>
                <th className="text-left">Status</th>
                <th className="text-left">Response Time (ms)</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id ?? i} className="border-b">
                  <td>{r.id ?? "—"}</td>
                  <td>{fmtTime(r.timestamp, locale, timeZone)}</td>
                  <td>{r.model ?? "—"}</td>
                  <td>{r.status ?? "—"}</td>
                  <td>{fmtNumber(r.responseTimeMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No data loaded. Upload a JSON file to get started.</p>
        )}
      </div>
    </div>
  );
}
