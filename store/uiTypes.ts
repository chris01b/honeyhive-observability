import { LlmResponseRecord } from "../types/llm";

export type HistBin = {
  startMs: number;
  endMs: number;
  count: number;
  pct: number;
};

export type UiState = {
  records: LlmResponseRecord[];
  error: string | null;
  sloMs: number;
  locale: string;
  timeZone: string;
  workerResults?: {
    histBins: HistBin[];
    stats: {
      n: number;
      p50?: number;
      p95?: number;
      p99?: number;
    };
  };
  workerError?: string;
  selectedRecord: LlmResponseRecord | null;
};
