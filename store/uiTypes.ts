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
};
