import { UiState } from "./uiTypes";

export function reducer(state: UiState, action: any): UiState {
  switch (action.type) {
    case "load/records":
      return {
        ...state,
        records: action.payload,
        filters: { ...state.filters, latencyRanges: [] },
        sort: null,
        highlightedIds: new Set(),
        visibleIndices: [],
        histBins: [],
        stats: { n: 0, errPct: 0 },
        lastComputeMs: 0
      };

    case "filters/patch":
      return { ...state, filters: { ...state.filters, ...action.payload } };

    case "sort/set":
      return { ...state, sort: action.payload };

    case "highlight/toggle": {
      const next = new Set(state.highlightedIds);
      const id = action.payload as string;
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...state, highlightedIds: next };
    }

    case "settings/set":
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case "worker/results":
      return {
        ...state,
        visibleIndices: action.payload.visibleIndices,
        histBins: action.payload.histBins,
        stats: action.payload.stats,
        lastComputeMs: action.payload.lastComputeMs
      };

    case "worker/error":
      return { ...state, error: { msg: action.payload.message } };

    case "ui/computing":
      return { ...state, isComputing: !!action.payload };

    case "ui/parsing":
      return { ...state, isParsing: !!action.payload };

    case "ui/setError":
      return { ...state, error: action.payload };

    case "ui/clearError":
      return { ...state, error: undefined };

    case "modal/open":
      return { 
        ...state, 
        selectedRecord: action.payload 
      };

    case "modal/close":
      return { 
        ...state, 
        selectedRecord: null 
      };

    default:
      return state;
  }
}
