"use client";

import React, { useMemo, useReducer } from "react";
import { LlmResponseRecord } from "../types/llm";
import { HistBin, UiState } from "../store/uiTypes";
import { reducer } from "../store/reducer";
import { useComputeWorker } from "../hooks/useComputeWorker";
import { HistogramLatency } from "../components/HistogramLatency";
import { DataGrid } from "../components/DataGrid";

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
        
        {bins.length > 0 && state.workerResults && (
          <HistogramLatency
            bins={bins}
            stats={state.workerResults.stats}
            sloMs={state.sloMs}
          />
        )}
        <DataGrid
          rows={state.records}
          locale={state.locale}
          timeZone={state.timeZone}
        />
      </div>
    </div>
  );
}
