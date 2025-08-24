import { useEffect, useRef } from "react";
import { UiState } from "../store/uiTypes";

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
      } else if (type === "error") {
        dispatch({ type: "worker/error", payload });
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
    workerRef.current.postMessage(msg);
  };

  useEffect(() => {
    post({ type: "load", payload: { records: state.records } });
  }, [state.records]);

  useEffect(() => {
    post({ type: "setSettings", payload: { sloMs: state.sloMs } });
  }, [state.sloMs]);
}
