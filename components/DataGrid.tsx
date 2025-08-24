"use client";
import React from "react";
import { LlmResponseRecord } from "../types/llm";
import { fmtNumber, fmtTime } from "../utils/formatters";
import { SortState } from "../store/uiTypes";

type Props = {
  rows: LlmResponseRecord[];
  sort: SortState;
  onSortChange: (next: SortState) => void;
  onOpen: (row: LlmResponseRecord) => void;
  locale: string;
  timeZone: string;
};

const header = (
  label: string,
  key: NonNullable<SortState>["key"],
  sort: SortState,
  onSort: (k: any) => void,
  className: string = ""
) => {
  const dir = sort && sort.key === key ? (sort.dir === "asc" ? "▲" : "▼") : "";
  return (
    <th
      onClick={() => onSort(key)}
      className={`cursor-pointer border-t border-slate-200 px-1 py-2 text-left text-xs font-medium ${className}`}
    >
      {label} <span className="ml-1 text-xs text-slate-500">{dir}</span>
    </th>
  );
};

export const DataGrid: React.FC<Props> = ({
  rows,
  sort,
  onSortChange,
  onOpen,
  locale,
  timeZone
}) => {
  const toggle = (key: NonNullable<SortState>["key"]) => {
    if (!sort || sort.key !== key) onSortChange({ key, dir: "asc" });
    else onSortChange({ key, dir: sort.dir === "asc" ? "desc" : "asc" });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-base font-semibold">Responses</h3>
      <div>
        <table className="w-full border-collapse text-sm table-fixed">
          <thead>
            <tr>
              {header("Timestamp", "timestamp", sort, toggle, "w-32")}
              {header("Model", "model", sort, toggle, "w-20")}
              {header("Time(ms)", "response_time_ms", sort, toggle, "w-16")}
              {header("Tokens", "total_tokens", sort, toggle, "w-24")}
              {header("Cost", "cost_usd", sort, toggle, "w-16")}
              {header("Quality", "response_quality", sort, toggle, "w-14")}
              {header("Status", "status", sort, toggle, "w-16")}
              <th className="border-t border-slate-200 px-1 py-2 text-left text-xs font-medium">Response</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id ?? i} className="align-top">
                <td className="border-t border-slate-200 px-1 py-2 text-xs">{fmtTime(r.timestamp, locale, timeZone)}</td>
                <td className="border-t border-slate-200 px-1 py-2 text-xs">{r.model ?? "—"}</td>
                <td className="border-t border-slate-200 px-1 py-2 text-xs">{fmtNumber(r.response_time_ms)}</td>
                <td className="border-t border-slate-200 px-1 py-2 text-xs">
                  <div className="text-xs">{fmtNumber(r.prompt_tokens)}/{fmtNumber(r.completion_tokens)}/{fmtNumber(r.total_tokens)}</div>
                </td>
                <td className="border-t border-slate-200 px-1 py-2 text-xs">{fmtNumber(r.cost_usd, 4)}</td>
                <td className="border-t border-slate-200 px-1 py-2 text-xs">{fmtNumber(r.evaluation_metrics?.response_quality, 2)}</td>
                <td className="border-t border-slate-200 px-1 py-2 text-xs">{r.status ?? "—"}</td>
                <td className="border-t border-slate-200 px-1 py-2">
                  <div className="text-xs truncate">{r.output ?? "—"}</div>
                  {r.output && (
                    <button className="mt-1 text-xs text-blue-600 hover:underline" onClick={() => onOpen(r)}>
                      View Full
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
