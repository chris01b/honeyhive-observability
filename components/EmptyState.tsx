"use client";
import React from "react";

export const EmptyState: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle
}) => (
  <div className="text-center text-slate-500">
    <h3 className="text-slate-700">{title}</h3>
    {subtitle && <p className="text-sm">{subtitle}</p>}
  </div>
);
