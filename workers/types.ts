import { LlmResponseRecord } from "../types/llm";
import type { Filters, HistBin, Settings, SortState } from "../store/uiTypes";

export type LoadMsg = { type: "load"; payload: { records: LlmResponseRecord[] } };
export type FiltersMsg = { type: "setFilters"; payload: Filters };
export type SortMsg = { type: "setSort"; payload: SortState };
export type SettingsMsg = { type: "setSettings"; payload: Settings };
export type RecomputeMsg = { type: "recompute" };

export type WorkerIn = LoadMsg | FiltersMsg | SortMsg | SettingsMsg | RecomputeMsg;

export type ResultsMsg = {
  type: "results";
  payload: {
    visibleIndices: number[];
    histBins: HistBin[];
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
    lastComputeMs: number;
  };
};
export type ErrorMsg = { type: "error"; payload: { message: string } };
export type WorkerOut = ResultsMsg | ErrorMsg;
