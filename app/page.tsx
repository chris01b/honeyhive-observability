"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip
} from "recharts";

type LlmResponse = {
  id: string;
  timestamp: string;
  model: string;
  status: string;
  responseTimeMs: number;
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

function parseData(json: any): LlmResponse[] {
  if (!json.responses || !Array.isArray(json.responses)) {
    throw new Error("Expected responses array");
  }
  
  return json.responses.map((item: any) => ({
    id: item.id || "",
    timestamp: item.timestamp || "",
    model: item.model || "",
    status: item.status || "",
    responseTimeMs: item.response_time_ms || 0
  }));
}

export default function Page() {
  const [data, setData] = useState<LlmResponse[]>([]);
  const [error, setError] = useState<string>("");

  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  const timeZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const latencies = useMemo(
    () => data.map(r => Number(r.responseTimeMs)).filter((n) => Number.isFinite(n)),
    [data]
  );

  const { bins, p50, p95, p99 } = useMemo(
    () => buildHistogram(latencies, 24),
    [latencies]
  );

  const chartData = useMemo(
    () => bins.map(b => ({ ...b, label: `${Math.round(b.startMs)}–${Math.round(b.endMs)} ms` })),
    [bins]
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const parsed = parseData(json);
      setData(parsed);
      setError("");
    } catch (err) {
      setError("Failed to parse JSON file");
      setData([]);
    }
  };

  return (
    <div>
      <h1>LLM Response Dashboard</h1>
      
      <div>
        <input 
          type="file" 
          accept=".json" 
          onChange={handleFileUpload}
        />
      </div>

      {error && (
        <div>
          {error}
        </div>
      )}

      <div>
        <h2>Responses ({data.length})</h2>
        {latencies.length > 0 && (
          <div>
            <p>Latency data points: {latencies.length}</p>
            <p>p50: {p50 != null ? `${Math.round(p50)} ms` : "—"} | p95: {p95 != null ? `${Math.round(p95)} ms` : "—"} | p99: {p99 != null ? `${Math.round(p99)} ms` : "—"}</p>
          </div>
        )}
        
        {chartData.length > 0 && (
          <div>
            <h3>Latency Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" angle={-20} textAnchor="end" height={50} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {data.length > 0 ? (
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
              {data.map((response) => (
                <tr key={response.id} className="border-b">
                  <td>{response.id}</td>
                  <td>{fmtTime(response.timestamp, locale, timeZone)}</td>
                  <td>{response.model}</td>
                  <td>{response.status}</td>
                  <td>{fmtNumber(response.responseTimeMs)}</td>
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
