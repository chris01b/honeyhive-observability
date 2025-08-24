/// <reference lib="webworker" />
import { LlmResponseRecord } from "../types/llm";
import { HistBin } from "../store/uiTypes";
import type { WorkerIn, WorkerOut } from "./types";

let records: LlmResponseRecord[] = [];
let sloMs = 800;

const quantile = (values: number[], q: number): number | undefined => {
  if (!values.length) return undefined;
  const arr = values.slice().sort((a, b) => a - b);
  const pos = (arr.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return arr[base + 1] !== undefined ? arr[base] + rest * (arr[base + 1] - arr[base]) : arr[base];
};

const buildHistogram = (lats: number[], desiredBins = 24): {
  bins: HistBin[], p50?: number, p95?: number, p99?: number
} => {
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
};

const compute = (): void => {
  try {
    const latencies = records
      .map(r => Number(r.response_time_ms))
      .filter((n) => Number.isFinite(n));

    const { bins, p50, p95, p99 } = buildHistogram(latencies, 24);

    const result: WorkerOut = {
      type: "results",
      payload: {
        histBins: bins,
        stats: {
          n: latencies.length,
          p50,
          p95,
          p99
        }
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
  const { type, payload } = e.data;

  switch (type) {
    case "load":
      records = payload.records;
      compute();
      break;

    case "setSettings":
      sloMs = payload.sloMs;
      compute();
      break;

    default:
      console.warn("Unknown message type:", type);
  }
};
