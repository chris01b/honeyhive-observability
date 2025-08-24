"use client";
import React from "react";

export const EmptyState: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle
}) => (
  <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
    <h3 className="mb-1 text-base font-semibold text-slate-700">{title}</h3>
    {subtitle && <p className="m-0 text-sm">{subtitle}</p>}
  </div>
);
