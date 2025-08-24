"use client";

import React, { useEffect, useMemo, useReducer, useState } from "react";
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

  const { histBins: bins, stats } = state;

  // Extract available models for filtering
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of state.records) if (r?.model) set.add(r.model);
    return ["All", ...Array.from(set).sort()];
  }, [state.records]);

  const selectedModel = state.filters.models?.[0] ?? "All";

  // Local input states for controls
  const [sloInput, setSloInput] = useState(String(initialState.settings.sloMs));
  const [binsInput, setBinsInput] = useState(String(initialState.settings.desiredBins));
  const [binWidthInput, setBinWidthInput] = useState("");

  // Sync input values with state when state changes externally
  useEffect(() => {
    setSloInput(String(state.settings.sloMs));
  }, [state.settings.sloMs]);

  useEffect(() => {
    setBinsInput(String(state.settings.desiredBins));
  }, [state.settings.desiredBins]);

  useEffect(() => {
    setBinWidthInput(state.settings.binWidthMs ? String(state.settings.binWidthMs) : "");
  }, [state.settings.binWidthMs]);

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
    <main className="max-w-[1100px] mx-auto my-6 px-4 flex flex-col gap-4">
      {state.error && (
        <ErrorBanner
          message={state.error.msg}
          onClear={() => dispatch({ type: "ui/clearError" })}
        />
      )}

      {state.isParsing && (
        <div className="flex items-center gap-2 border border-blue-200 bg-blue-50 rounded-lg p-3 text-sm">
          <span className="h-3.5 w-3.5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" aria-hidden />
          <span>Parsing file…</span>
        </div>
      )}

      <div className="border border-slate-200 rounded-lg p-4 bg-white">
        <Dropzone onFile={handleFile} />
      </div>

      <div className="border border-slate-200 rounded-lg p-4 bg-white">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Model</span>
            <select
              className="min-w-[140px] rounded-md border border-slate-300 px-2 py-1"
              value={selectedModel}
              aria-label="Filter by model"
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
              className="min-w-[120px] rounded-md border border-slate-300 px-2 py-1"
              value={sloInput}
              aria-label="SLO threshold in milliseconds"
              onChange={(e) => {
                setSloInput(e.target.value);
                const num = Number(e.target.value);
                if (num > 0) {
                  dispatch({
                    type: "settings/set",
                    payload: { sloMs: num }
                  });
                }
              }}
              onBlur={() => {
                if (!sloInput || Number(sloInput) <= 0) {
                  setSloInput("800");
                  dispatch({
                    type: "settings/set",
                    payload: { sloMs: 800 }
                  });
                }
              }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Desired bins</span>
            <input
              type="number"
              min={1}
              max={120}
              className="min-w-[120px] rounded-md border border-slate-300 px-2 py-1"
              value={binsInput}
              aria-label="Number of histogram bins"
              onChange={(e) => {
                setBinsInput(e.target.value);
                const num = Number(e.target.value);
                if (num >= 1 && num <= 120) {
                  dispatch({
                    type: "settings/set",
                    payload: {
                      desiredBins: num,
                      binWidthMs: undefined
                    }
                  });
                }
              }}
              onBlur={() => {
                if (!binsInput || Number(binsInput) < 1 || Number(binsInput) > 120) {
                  setBinsInput("40");
                  dispatch({
                    type: "settings/set",
                    payload: { desiredBins: 40, binWidthMs: undefined }
                  });
                }
              }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Bin width (ms)</span>
            <input
              type="number"
              min={1}
              placeholder="auto"
              className="min-w-[120px] rounded-md border border-slate-300 px-2 py-1"
              value={binWidthInput}
              aria-label="Bin width in milliseconds"
              onChange={(e) => {
                setBinWidthInput(e.target.value);
                const num = Number(e.target.value);
                dispatch({
                  type: "settings/set",
                  payload: { binWidthMs: e.target.value === "" ? undefined : (num > 0 ? num : undefined) }
                });
              }}
              onBlur={() => {
                if (binWidthInput && Number(binWidthInput) <= 0) {
                  setBinWidthInput("");
                  dispatch({
                    type: "settings/set",
                    payload: { binWidthMs: undefined }
                  });
                }
              }}
            />
          </label>

          {state.isComputing && state.records.length > 0 && (
            <span className="inline-flex items-center gap-2 text-slate-500 text-sm ml-auto">
              <span className="h-3.5 w-3.5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" aria-hidden />
              Updating…
            </span>
          )}
        </div>

        {state.filters.latencyRanges?.length ? (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-slate-200 bg-slate-100 text-sm">
              {state.filters.latencyRanges
                .map((r) => `${Math.round(r.min)}–${Math.round(r.max)} ms`)
                .join(", ")}
            </span>
            <button
              className="rounded-md border border-slate-300 px-3 py-1 text-sm bg-white hover:bg-slate-50"
              onClick={() =>
                dispatch({ type: "filters/patch", payload: { latencyRanges: [] } })
              }
              aria-label="Clear latency range selection"
            >
              Clear selection
            </button>
          </div>
      ) : null}
        </div>

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
            sort={state.sort}
            onSortChange={(sort) => dispatch({ type: "sort/set", payload: sort })}
            onOpen={(record) => dispatch({ type: "modal/open", payload: record })}
            locale={state.settings.locale}
            timeZone={state.settings.timeZone}
          />
        )}

        <FullResponseModal
          record={state.selectedRecord}
          onClose={() => dispatch({ type: "modal/close" })}
          locale={state.settings.locale}
          timeZone={state.settings.timeZone}
                />
    </main>
  );
}
