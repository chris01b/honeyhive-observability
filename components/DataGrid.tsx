"use client";
import React from "react";
import { LlmResponseRecord } from "../types/llm";
import { fmtNumber, fmtTime } from "../utils/formatters";

type Props = {
  rows: LlmResponseRecord[];
  locale: string;
  timeZone: string;
};

export const DataGrid: React.FC<Props> = ({
  rows,
  locale,
  timeZone
}) => {
  if (rows.length === 0) {
    return (
      <div>
        <h2>Responses (0)</h2>
        <p>No data loaded. Upload a JSON file to get started.</p>
      </div>
    );
  }

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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
