"use client";
import React, { useCallback, useRef, useState } from "react";

type Props = { onFiles: (files: FileList) => void };

export const Dropzone: React.FC<Props> = ({ onFiles }) => {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActive(false);
      if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files);
    },
    [onFiles]
  );

  const onBrowse = useCallback(() => inputRef.current?.click(), []);

  return (
    <div
      className={[
        "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        active 
          ? "border-blue-300 bg-blue-50 text-blue-700" 
          : "border-slate-200 bg-white text-slate-900"
      ].join(" ")}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
      onClick={onBrowse}
      role="button"
      tabIndex={0}
    >
      <p>
        Drag & drop a <code>.json</code> file here, or click to browse.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  );
};
