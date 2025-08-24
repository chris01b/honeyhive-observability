"use client";

import React, { useMemo, useState } from "react";

type LlmResponse = {
  id: string;
  timestamp: string;
  model: string;
  status: string;
  responseTimeMs: number;
};

const fmtNumber = (n: number | undefined, digits = 0) =>
  typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "—";

const fmtTime = (iso?: string, locale = "en-US", timeZone = "UTC") => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    timeZone, year: "2-digit", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).format(d);
};

function parseData(json: any): LlmResponse[] {
  if (!json.responses || !Array.isArray(json.responses)) {
    throw new Error("Expected responses array");
  }
  
  return json.responses.map((item: any) => ({
    id: item.id || "",
    timestamp: item.timestamp || "",
    model: item.model || "",
    status: item.status || "",
    responseTimeMs: item.response_time_ms || 0
  }));
}

export default function Page() {
  const [data, setData] = useState<LlmResponse[]>([]);
  const [error, setError] = useState<string>("");

  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  const timeZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const latencies = useMemo(
    () => data.map(r => Number(r.responseTimeMs)).filter((n) => Number.isFinite(n)),
    [data]
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const parsed = parseData(json);
      setData(parsed);
      setError("");
    } catch (err) {
      setError("Failed to parse JSON file");
      setData([]);
    }
  };

  return (
    <div>
      <h1>LLM Response Dashboard</h1>
      
      <div>
        <input 
          type="file" 
          accept=".json" 
          onChange={handleFileUpload}
        />
      </div>

      {error && (
        <div>
          {error}
        </div>
      )}

      <div>
        <h2>Responses ({data.length})</h2>
        {latencies.length > 0 && (
          <p>Latency data points: {latencies.length}</p>
        )}
        {data.length > 0 ? (
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
              {data.map((response) => (
                <tr key={response.id} className="border-b">
                  <td>{response.id}</td>
                  <td>{fmtTime(response.timestamp, locale, timeZone)}</td>
                  <td>{response.model}</td>
                  <td>{response.status}</td>
                  <td>{fmtNumber(response.responseTimeMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No data loaded. Upload a JSON file to get started.</p>
        )}
      </div>
    </div>
  );
}
