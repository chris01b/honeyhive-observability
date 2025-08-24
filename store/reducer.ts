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

    default:
      return state;
  }
}
