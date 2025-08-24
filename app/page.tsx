"use client";

import React, { useMemo, useReducer } from "react";
import { LlmResponseRecord } from "../types/llm";
import { UiState } from "../store/uiTypes";
import { reducer } from "../store/reducer";
import { useComputeWorker } from "../hooks/useComputeWorker";
import { HistogramLatency } from "../components/HistogramLatency";
import { DataGrid } from "../components/DataGrid";
import { Dropzone } from "../components/Dropzone";
import { FullResponseModal } from "../components/FullResponseModal";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";

function parseStrict(json: unknown): LlmResponseRecord[] {
  if (typeof json !== "object" || json === null || !Array.isArray((json as { responses?: unknown }).responses)) {
    throw new Error("Invalid file: expected an object with a 'responses' array.");
  }

  const toNum = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined;

  const data = json as { responses: unknown[] };
  return data.responses.map((r: unknown) => {
    const record = r as Record<string, unknown>;
    return {
      id: typeof record.id === "string" ? record.id : undefined,
      timestamp: typeof record.timestamp === "string" ? record.timestamp : undefined,
      response_time_ms: toNum(record.response_time_ms),
      model: typeof record.model === "string" ? record.model : undefined,
      status: typeof record.status === "string" && (record.status === "success" || record.status === "error" || record.status === "timeout") ? record.status : undefined,
      prompt_tokens: toNum(record.prompt_tokens),
      completion_tokens: toNum(record.completion_tokens),
      total_tokens: toNum(record.total_tokens) ?? 
        (((toNum(record.prompt_tokens) ?? 0) + (toNum(record.completion_tokens) ?? 0)) || undefined),
      cost_usd: toNum(record.cost_usd),
      temperature: toNum(record.temperature),
      max_tokens: toNum(record.max_tokens),
      prompt_template: typeof record.prompt_template === "string" ? record.prompt_template : undefined,
      output: typeof record.output === "string" ? record.output : undefined,
      evaluation_metrics: record.evaluation_metrics && typeof record.evaluation_metrics === "object" ? {
        relevance_score: toNum((record.evaluation_metrics as Record<string, unknown>).relevance_score),
        factual_accuracy: toNum((record.evaluation_metrics as Record<string, unknown>).factual_accuracy),
        coherence_score: toNum((record.evaluation_metrics as Record<string, unknown>).coherence_score),
        response_quality: toNum((record.evaluation_metrics as Record<string, unknown>).response_quality)
      } : undefined,
      error: record.error && typeof record.error === "object" ? 
        (record.error as { type?: string; message?: string }) : 
        (typeof record.error === "string" ? { message: record.error } : undefined)
    };
  });
}

const defaultLocale =
  typeof navigator !== "undefined" ? navigator.language : "en-US";
const defaultZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

const initialState: UiState = {
  records: [],
  filters: {},
  sort: null,
  highlightedIds: new Set(),
  settings: {
    locale: defaultLocale,
    timeZone: defaultZone,
    sloMs: 800,
    desiredBins: 40,
    binWidthMs: undefined
  },
  visibleIndices: [],
  histBins: [],
  stats: { n: 0, errPct: 0 },
  lastComputeMs: 0,
  error: undefined,
  isComputing: false,
  isParsing: false,
  selectedRecord: null
};

export default function Page() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useComputeWorker(state, dispatch);

  const latencies = useMemo(
    () => state.records.map(r => Number(r.response_time_ms)).filter((n) => Number.isFinite(n)),
    [state.records]
  );

  // Use state directly now that worker updates it
  const { histBins: bins, stats } = state;
  const { p50, p95, p99 } = stats;

  // Extract available models for filtering
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of state.records) if (r?.model) set.add(r.model);
    return ["All", ...Array.from(set).sort()];
  }, [state.records]);

  const selectedModel = state.filters.models?.[0] ?? "All";

  // Get filtered rows based on visibleIndices from worker
  const visibleRows = useMemo(
    () => state.visibleIndices.map((i) => state.records[i]!),
    [state.visibleIndices, state.records]
  );



  async function handleFile(file: File) {
    dispatch({ type: "ui/parsing", payload: true });
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      dispatch({ type: "load/records", payload: parseStrict(json) });
    } catch (e: unknown) {
      dispatch({ type: "load/records", payload: [] });
      dispatch({
        type: "ui/setError",
        payload: { msg: `${file.name ? `in ${file.name}: ` : ""}${(e as Error)?.message ?? "Failed to parse JSON."}` }
      });
    } finally {
      dispatch({ type: "ui/parsing", payload: false });
    }
  }

  return (
    <div>
      <h1>LLM Response Dashboard</h1>
      
      <div>
        <Dropzone onFile={handleFile} />
        </div>

      <div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Model</span>
            <select
              className="min-w-[140px] border border-slate-300 px-2 py-1"
              value={selectedModel}
              onChange={(e) =>
                dispatch({
                  type: "filters/patch",
                  payload: { models: e.target.value === "All" ? [] : [e.target.value] }
                })
              }
            >
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
        </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">SLO (ms)</span>
          <input
            type="number"
            min={1}
            step={10}
              className="min-w-[120px] border border-slate-300 px-2 py-1"
              value={state.settings.sloMs}
              onChange={(e) => dispatch({ 
                type: "settings/set", 
                payload: { sloMs: Math.max(1, Number(e.target.value) || 1) }
              })}
            />
          </label>
      </div>

        {state.filters.latencyRanges?.length ? (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 border border-slate-200 bg-slate-100 text-sm">
              {state.filters.latencyRanges
                .map((r) => `${Math.round(r.min)}–${Math.round(r.max)} ms`)
                .join(", ")}
            </span>
            <button
              className="border border-slate-300 px-3 py-1 text-sm bg-white"
              onClick={() =>
                dispatch({ type: "filters/patch", payload: { latencyRanges: [] } })
              }
            >
              Clear selection
            </button>
          </div>
        ) : null}
        </div>

      {state.error && (
        <ErrorBanner
          message={state.error.msg}
          onClear={() => dispatch({ type: "ui/clearError" })}
        />
      )}

      <div>
        <h2>
          Responses ({visibleRows.length}
          {state.records.length > visibleRows.length && ` of ${state.records.length}`})
        </h2>
        {latencies.length > 0 && (
          <div>
            <p>Latency data points: {latencies.length}</p>
            <p>p50: {p50 != null ? `${Math.round(p50)} ms` : "—"} | p95: {p95 != null ? `${Math.round(p95)} ms` : "—"} | p99: {p99 != null ? `${Math.round(p99)} ms` : "—"}</p>
            <p>SLO violations: {latencies.filter(lat => lat > state.settings.sloMs).length} / {latencies.length} ({((latencies.filter(lat => lat > state.settings.sloMs).length / latencies.length) * 100).toFixed(1)}%)</p>
          </div>
        )}
        
        {bins.length > 0 && (
          <HistogramLatency
            bins={bins}
            stats={stats}
            sloMs={state.settings.sloMs}
            onSelectRange={(range, additive) => {
              const current = state.filters.latencyRanges ?? [];
              const next = additive ? [...current, range] : [range];
              dispatch({ type: "filters/patch", payload: { latencyRanges: next } });
            }}
          />
        )}

        {state.records.length === 0 ? (
          <EmptyState
            title="No data loaded yet"
            subtitle="Upload a JSON file to begin."
          />
        ) : (
          <DataGrid
            rows={visibleRows}
            locale={state.settings.locale}
            timeZone={state.settings.timeZone}
            onOpen={(record) => dispatch({ type: "modal/open", payload: record })}
          />
        )}

        <FullResponseModal
          record={state.selectedRecord}
          onClose={() => dispatch({ type: "modal/close" })}
          locale={state.settings.locale}
          timeZone={state.settings.timeZone}
        />
      </div>
    </div>
  );
}
