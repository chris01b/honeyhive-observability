"use client";
import React from "react";

export const ErrorBanner: React.FC<{
  message: string;
  fileName?: string;
  onClear?: () => void;
}> = ({ message, fileName, onClear }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm">
    <div>
      <strong className="mr-1">Error</strong>
      {fileName ? ` in ${fileName}` : ""}: {message}
    </div>
    {onClear && (
      <button 
        onClick={onClear} 
        className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-50"
      >
        Dismiss
      </button>
    )}
  </div>
);
