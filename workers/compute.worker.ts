/// <reference lib="webworker" />
import { LlmResponseRecord } from "../types/llm";
import type { Filters, Settings, SortState } from "../store/uiTypes";
import type { WorkerIn, WorkerOut } from "./types";

let records: LlmResponseRecord[] = [];
let filters: Filters = {};
let sort: SortState = null;
let settings: Settings = {
  locale: "en-US",
  timeZone: "UTC", 
  sloMs: 800,
  desiredBins: 40,
  binWidthMs: undefined
};

const quantile = (values: number[], q: number): number | undefined => {
  if (!values.length) return undefined;
  const arr = values.slice().sort((a, b) => a - b);
  const pos = (arr.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return arr[base + 1] !== undefined ? arr[base] + rest * (arr[base + 1] - arr[base]) : arr[base];
};

const buildHistogram = (lats: number[], desiredBins = 24, binWidthMs?: number) => {
  if (!lats.length) return { 
    bins: [], 
    p50: undefined, 
    p95: undefined, 
    p99: undefined 
  };
  
  const p50 = quantile(lats, 0.5);
  const p95 = quantile(lats, 0.95);
  const p99 = quantile(lats, 0.99);

  let min = Math.min(...lats);
  let max = Math.max(...lats);
  if (max === min) max = min + 1;

  let width = binWidthMs != null ? binWidthMs : (max - min) / Math.max(1, desiredBins);
  if (width <= 0 || !isFinite(width)) width = (max - min) / Math.max(1, desiredBins);
  let binsCount = Math.ceil((max - min) / width);
  if (binsCount > 120) {
    binsCount = 120;
    width = (max - min) / binsCount;
  }
  binsCount = Math.max(1, binsCount);
  const counts = new Array(binsCount).fill(0);
  
  for (const v of lats) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binsCount) idx = binsCount - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  
  const total = lats.length;
  const bins = [];
  for (let i = 0; i < binsCount; i++) {
    const startMs = min + i * width;
    const endMs = startMs + width;
    const count = counts[i];
    bins.push({ 
      startMs, 
      endMs, 
      count, 
      pct: (count / total) * 100 
    });
  }
  
  return { bins, p50, p95, p99 };
};

const compute = (): void => {
  try {
    // Apply filters to determine visible records
    const visibleIndices: number[] = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      let visible = true;
      
      // Model filter
      if (filters.models?.length && record.model) {
        visible = visible && filters.models.includes(record.model);
      }
      
      // Latency range filters
      if (filters.latencyRanges?.length && record.response_time_ms != null) {
        const latency = Number(record.response_time_ms);
        if (Number.isFinite(latency)) {
          visible = visible && filters.latencyRanges.some(range => 
            latency >= range.min && latency < range.max
          );
        }
      }
      
      // Status filter
      if (filters.status?.length && record.status) {
        visible = visible && filters.status.includes(record.status as any);
      }
      
      if (visible) {
        visibleIndices.push(i);
      }
    }
    
    // Calculate latencies for all records (for total stats)
    const allLatencies = records
      .map(r => Number(r.response_time_ms))
      .filter((n) => Number.isFinite(n));

    // Calculate latencies for visible records (for histogram)
    const visibleLatencies = visibleIndices
      .map(i => Number(records[i].response_time_ms))
      .filter((n) => Number.isFinite(n));

    const { bins, p50, p95, p99 } = buildHistogram(visibleLatencies, settings.desiredBins, settings.binWidthMs);
    
    // Calculate additional stats (visible records for histogram-related stats)
    const errorCount = records.filter(r => r.status === "error").length;
    const errPct = records.length > 0 ? (errorCount / records.length) * 100 : 0;
    
    const totalCost = records.reduce((sum, r) => sum + (r.cost_usd || 0), 0);
    const avgCostPer1k = totalCost > 0 && allLatencies.length > 0 ? (totalCost / allLatencies.length) * 1000 : undefined;
    
    const sloViolations = allLatencies.filter(lat => lat > settings.sloMs).length;
    const overSloPct = allLatencies.length > 0 ? (sloViolations / allLatencies.length) * 100 : 0;

    const result: WorkerOut = {
      type: "results",
      payload: {
        visibleIndices,
        histBins: bins,
        stats: {
          n: visibleLatencies.length,
          errPct,
          p50,
          p95,
          p99,
          totalCost,
          avgCostPer1k,
          overSloPct
        },
        lastComputeMs: Date.now()
      }
    };

    self.postMessage(result);
  } catch (error) {
    const errorResult: WorkerOut = {
      type: "error",
      payload: { message: error instanceof Error ? error.message : "Unknown error" }
    };
    self.postMessage(errorResult);
  }
};

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const message = e.data;

  switch (message.type) {
    case "load":
      records = message.payload.records;
      compute();
      break;

    case "setFilters":
      filters = message.payload;
      compute();
      break;

    case "setSort":
      sort = message.payload;
      compute();
      break;

    case "setSettings":
      settings = message.payload;
      compute();
      break;

    case "recompute":
      compute();
      break;

    default:
      console.warn("Unknown message type:", (message as any).type);
  }
};
