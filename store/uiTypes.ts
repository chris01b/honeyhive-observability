import { LlmResponseRecord } from "../types/llm";

export type Filters = {
  models?: string[]; // single-select via [value], or [] for All
  status?: Array<"success" | "error" | "timeout">;
  dateRange?: { from?: Date; to?: Date };
  quality?: { min?: number; max?: number };
  latencyRanges?: Array<{ min: number; max: number }>;
};

export type SortState =
  | {
      key:
        | "timestamp"
        | "model"
        | "response_time_ms"
        | "total_tokens"
        | "cost_usd"
        | "response_quality"
        | "status";
      dir: "asc" | "desc";
    }
  | null;

export type Settings = {
  locale: string;
  timeZone: string;
  sloMs: number;
  desiredBins: number;
  binWidthMs?: number;
};

export type HistBin = {
  startMs: number;
  endMs: number;
  count: number;
  pct: number;
  medQuality?: number;
  medCompletionTokens?: number;
};

export type UiError = { msg: string };

export type UiState = {
  records: LlmResponseRecord[];
  filters: Filters;
  sort: SortState;
  highlightedIds: Set<string>;
  settings: Settings;
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
  error?: UiError;
  isComputing: boolean;
  isParsing: boolean;
  selectedRecord: LlmResponseRecord | null;
};
