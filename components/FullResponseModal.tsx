"use client";
import React from "react";
import { LlmResponseRecord } from "../types/llm";
import { fmtNumber, fmtTime } from "../utils/formatters";

type Props = { 
  record: LlmResponseRecord | null; 
  onClose: () => void;
  locale: string;
  timeZone: string;
};

export const FullResponseModal: React.FC<Props> = ({ record, onClose, locale, timeZone }) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={onClose}>
      <div
        className="mx-auto max-w-3xl rounded-lg bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Response Details</h3>
        
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div><strong>ID:</strong> {record.id ?? "—"}</div>
          <div><strong>Timestamp:</strong> {fmtTime(record.timestamp, locale, timeZone)}</div>
          <div><strong>Model:</strong> {record.model ?? "—"}</div>
          <div><strong>Status:</strong> {record.status ?? "—"}</div>
          <div><strong>Response Time:</strong> {fmtNumber(record.response_time_ms)} ms</div>
          {record.prompt_tokens !== undefined && <div><strong>Prompt Tokens:</strong> {fmtNumber(record.prompt_tokens)}</div>}
          {record.completion_tokens !== undefined && <div><strong>Completion Tokens:</strong> {fmtNumber(record.completion_tokens)}</div>}
          {record.total_tokens !== undefined && <div><strong>Total Tokens:</strong> {fmtNumber(record.total_tokens)}</div>}
          {record.cost_usd !== undefined && <div><strong>Cost:</strong> ${fmtNumber(record.cost_usd, 4)}</div>}
          {record.temperature !== undefined && <div><strong>Temperature:</strong> {fmtNumber(record.temperature, 2)}</div>}
          {record.max_tokens !== undefined && <div><strong>Max Tokens:</strong> {fmtNumber(record.max_tokens)}</div>}
        </div>

        {record.evaluation_metrics && (
          <div className="mb-2 bg-slate-50 p-2">
            <strong>Evaluation Metrics:</strong>
            <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
              {record.evaluation_metrics.relevance_score !== undefined && <div>Relevance: {fmtNumber(record.evaluation_metrics.relevance_score, 2)}</div>}
              {record.evaluation_metrics.factual_accuracy !== undefined && <div>Accuracy: {fmtNumber(record.evaluation_metrics.factual_accuracy, 2)}</div>}
              {record.evaluation_metrics.coherence_score !== undefined && <div>Coherence: {fmtNumber(record.evaluation_metrics.coherence_score, 2)}</div>}
              {record.evaluation_metrics.response_quality !== undefined && <div>Quality: {fmtNumber(record.evaluation_metrics.response_quality, 2)}</div>}
            </div>
          </div>
        )}

        {record.error && (
          <div className="mb-2 rounded-md bg-red-50 p-2 text-red-700">
            <strong>Error:</strong> {record.error.type} - {record.error.message}
          </div>
        )}

        {record.prompt_template && (
          <div className="mb-2">
            <strong>Prompt Template:</strong>
            <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-slate-50 p-2 text-sm">{record.prompt_template}</pre>
          </div>
        )}

        <div className="mb-2">
          <strong>Output:</strong>
          <pre className="mt-1 max-h-[50vh] overflow-auto rounded-md bg-slate-50 p-3 text-sm">{record.output ?? "—"}</pre>
        </div>

        <div className="mt-3 flex justify-end">
          <button 
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm" 
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
