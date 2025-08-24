"use client";
import React from "react";

export const ErrorBanner: React.FC<{
  message: string;
  onClear?: () => void;
}> = ({ message, onClear }) => (
  <div className="flex items-center justify-between gap-3 border border-rose-200 bg-rose-50 p-3 text-sm">
    <div>
      <strong>Error:</strong> {message}
    </div>
    {onClear && (
      <button 
        onClick={onClear} 
        className="border border-slate-300 bg-white px-3 py-1 text-sm"
      >
        Dismiss
      </button>
    )}
  </div>
);
