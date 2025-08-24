"use client";

import React, { useState } from "react";

type LlmResponse = {
  id: string;
  timestamp: string;
  model: string;
  status: string;
  responseTimeMs: number;
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
                  <td>{response.timestamp}</td>
                  <td>{response.model}</td>
                  <td>{response.status}</td>
                  <td>{response.responseTimeMs}</td>
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
