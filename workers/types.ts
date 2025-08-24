import { LlmResponseRecord } from "../types/llm";
import { HistBin } from "../store/uiTypes";

export type LoadMsg = { type: "load"; payload: { records: LlmResponseRecord[] } };
export type SettingsMsg = { type: "setSettings"; payload: { sloMs: number } };

export type WorkerIn = LoadMsg | SettingsMsg;

export type ResultsMsg = {
  type: "results";
  payload: {
    histBins: HistBin[];
    stats: {
      n: number;
      p50?: number;
      p95?: number;
      p99?: number;
    };
  };
};

export type ErrorMsg = { type: "error"; payload: { message: string } };
export type WorkerOut = ResultsMsg | ErrorMsg;
