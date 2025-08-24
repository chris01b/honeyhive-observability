"use client";
import React from "react";
import { LlmResponseRecord } from "../types/llm";
import { fmtNumber, fmtTime } from "../utils/formatters";

type Props = {
  rows: LlmResponseRecord[];
  locale: string;
  timeZone: string;
  onOpen?: (row: LlmResponseRecord) => void;
};

export const DataGrid: React.FC<Props> = ({
  rows,
  locale,
  timeZone,
  onOpen
}) => {
  return (
    <div>
      <h2>Responses ({rows.length})</h2>
      <table className="w-full">
        <thead>
          <tr className="">
            <th className="text-left">ID</th>
            <th className="text-left">Timestamp</th>
            <th className="text-left">Model</th>
            <th className="text-left">Status</th>
            <th className="text-left">Response Time (ms)</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="border-b">
              <td>{r.id ?? "—"}</td>
              <td>{fmtTime(r.timestamp, locale, timeZone)}</td>
              <td>{r.model ?? "—"}</td>
              <td>{r.status ?? "—"}</td>
              <td>{fmtNumber(r.response_time_ms)}</td>
              <td>
                {onOpen && (
                  <button 
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => onOpen(r)}
                  >
                    View Details
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
