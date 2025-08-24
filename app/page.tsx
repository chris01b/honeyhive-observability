"use client";

import React, { useMemo, useReducer } from "react";
import {
  ResponsiveContainer, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Label
} from "recharts";
import { LlmResponseRecord } from "../types/llm";
import { fmtNumber, fmtTime } from "../utils/formatters";
import { HistBin, UiState } from "../store/uiTypes";
import { reducer } from "../store/reducer";
import { useComputeWorker } from "../hooks/useComputeWorker";

function parseStrict(json: any): LlmResponseRecord[] {
  if (typeof json !== "object" || json === null || !Array.isArray(json.responses)) {
    throw new Error("Invalid file: expected an object with a 'responses' array.");
  }

  const toNum = (v: any): number | undefined =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined;

  return json.responses.map((r: any) => {
    return {
      id: typeof r.id === "string" ? r.id : undefined,
      timestamp: typeof r.timestamp === "string" ? r.timestamp : undefined,
      response_time_ms: toNum(r.response_time_ms),
      model: typeof r.model === "string" ? r.model : undefined,
      status: typeof r.status === "string" ? r.status : undefined,
      prompt_tokens: toNum(r.prompt_tokens),
      completion_tokens: toNum(r.completion_tokens),
      total_tokens: toNum(r.total_tokens) ?? 
        (((toNum(r.prompt_tokens) ?? 0) + (toNum(r.completion_tokens) ?? 0)) || undefined),
      cost_usd: toNum(r.cost_usd),
      temperature: toNum(r.temperature),
      max_tokens: toNum(r.max_tokens),
      prompt_template: typeof r.prompt_template === "string" ? r.prompt_template : undefined,
      output: typeof r.output === "string" ? r.output : undefined,
      evaluation_metrics: r.evaluation_metrics ? {
        relevance_score: toNum(r.evaluation_metrics.relevance_score),
        factual_accuracy: toNum(r.evaluation_metrics.factual_accuracy),
        coherence_score: toNum(r.evaluation_metrics.coherence_score),
        response_quality: toNum(r.evaluation_metrics.response_quality)
      } : undefined,
      error: r.error || undefined
    };
  });
}

const initialState: UiState = {
  records: [],
  error: null,
  sloMs: 800,
  locale: typeof navigator !== "undefined" ? navigator.language : "en-US",
  timeZone: typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "UTC",
  workerResults: undefined,
  workerError: undefined
};

export default function Page() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useComputeWorker(state, dispatch);

  const latencies = useMemo(
    () => state.records.map(r => Number(r.response_time_ms)).filter((n) => Number.isFinite(n)),
    [state.records]
  );

  // Use worker results only
  const { bins, p50, p95, p99 } = useMemo(() => {
    if (state.workerResults) {
      return {
        bins: state.workerResults.histBins,
        p50: state.workerResults.stats.p50,
        p95: state.workerResults.stats.p95,
        p99: state.workerResults.stats.p99
      };
    }
    // No data until worker returns results
    return { bins: [], p50: undefined, p95: undefined, p99: undefined };
  }, [state.workerResults]);

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
  const labelSLO = findLabel(state.sloMs);

  async function handleFile(file: File) {
    dispatch({ type: "set/error", payload: null });
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      dispatch({ type: "load/records", payload: parseStrict(json) });
    } catch (e: any) {
      dispatch({ type: "load/records", payload: [] });
      dispatch({ type: "set/error", payload: `${file.name ? `in ${file.name}: ` : ""}${e?.message ?? "Failed to parse JSON."}` });
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
            value={state.sloMs}
            onChange={(e) => dispatch({ type: "set/sloMs", payload: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
      </div>

      {state.error && (
        <div>
          {state.error}
        </div>
      )}

      {state.workerError && (
        <div>
          Worker Error: {state.workerError}
        </div>
      )}

      <div>
        <h2>Responses ({state.records.length})</h2>
        {latencies.length > 0 && (
          <div>
            <p>Latency data points: {latencies.length}</p>
            <p>p50: {p50 != null ? `${Math.round(p50)} ms` : "—"} | p95: {p95 != null ? `${Math.round(p95)} ms` : "—"} | p99: {p99 != null ? `${Math.round(p99)} ms` : "—"}</p>
            <p>SLO violations: {latencies.filter(lat => lat > state.sloMs).length} / {latencies.length} ({((latencies.filter(lat => lat > state.sloMs).length / latencies.length) * 100).toFixed(1)}%)</p>
          </div>
        )}
        
        {data.length > 0 && (
          <div>
            <h3>Latency Distribution</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data} margin={{ top: 24, right: 10, bottom: 24, left: 10 }}>
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
        {state.records.length > 0 ? (
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
              {state.records.map((r, i) => (
                <tr key={r.id ?? i} className="border-b">
                  <td>{r.id ?? "—"}</td>
                  <td>{fmtTime(r.timestamp, state.locale, state.timeZone)}</td>
                  <td>{r.model ?? "—"}</td>
                  <td>{r.status ?? "—"}</td>
                  <td>{fmtNumber(r.response_time_ms)}</td>
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
