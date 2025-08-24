"use client";
import React, { useCallback, useRef, useState } from "react";

type Props = { 
  onFile: (file: File) => void;
};

export const Dropzone: React.FC<Props> = ({ onFile }) => {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList) => {
      if (files.length > 0) {
        onFile(files[0]); // Take the first file
      }
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActive(false);
      if (e.dataTransfer?.files?.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const onBrowse = useCallback(() => inputRef.current?.click(), []);

  return (
    <div
      className={[
        "cursor-pointer text-center", active ? "bg-slate-50" : ""
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
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
};
