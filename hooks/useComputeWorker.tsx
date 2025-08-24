import { useEffect, useRef } from "react";
import { UiState } from "../store/uiTypes";

/**
 * Creates and wires a persistent Web Worker.
 * 
 * Mirrors worker results into the UI reducer.
 * Sets a UI computing flag while work is in flight.
 */
export function useComputeWorker(state: UiState, dispatch: React.Dispatch<any>) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const w = new Worker(
      new URL("../workers/compute.worker.ts", import.meta.url),
      { type: "module", name: "compute-worker" }
    );
    workerRef.current = w;

    const onMsg = (e: MessageEvent<any>) => {
      const { type, payload } = e.data || {};
      if (type === "results") {
        dispatch({ type: "worker/results", payload });
        dispatch({ type: "ui/computing", payload: false });
      } else if (type === "error") {
        dispatch({ type: "worker/error", payload });
        dispatch({ type: "ui/computing", payload: false });
      }
    };
    w.addEventListener("message", onMsg);

    return () => {
      w.removeEventListener("message", onMsg);
      w.terminate();
      workerRef.current = null;
    };
  }, [dispatch]);

  const post = (msg: any) => {
    if (!workerRef.current) return;
    dispatch({ type: "ui/computing", payload: true });
    workerRef.current.postMessage(msg);
  };

  // Send records, filters, sort, settings to the worker as they change
  useEffect(() => {
    post({ type: "load", payload: { records: state.records } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.records]);

  useEffect(() => {
    post({ type: "setFilters", payload: state.filters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filters]);

  useEffect(() => {
    post({ type: "setSort", payload: state.sort });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sort]);

  useEffect(() => {
    post({ type: "setSettings", payload: state.settings });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings]);
}
