import { UiState } from "./uiTypes";

export function reducer(state: UiState, action: any): UiState {
  switch (action.type) {
    case "load/records":
      return {
        ...state,
        records: action.payload,
        error: null
      };

    case "set/error":
      return { ...state, error: action.payload };

    case "set/sloMs":
      return { ...state, sloMs: action.payload };

    case "worker/results":
      return { 
        ...state, 
        workerResults: action.payload 
      };

    case "worker/error":
      return { 
        ...state, 
        workerError: action.payload?.message || "Worker error" 
      };

    default:
      return state;
  }
}
