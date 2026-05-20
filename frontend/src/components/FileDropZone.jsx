import { useRef, useState } from "react";

export default function FileDropZone({
  label,
  helperText,
  accept,
  file,
  onFileSelect,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files) => {
    const selected = files?.[0];
    if (selected) {
      onFileSelect(selected);
    }
  };

  return (
    <div
      className={`group rounded-3xl border p-5 text-left transition-all duration-300 ${
        isDragging
          ? "border-slate-500 bg-slate-800 shadow-sm"
          : "border-white/10 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/55"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <button
        type="button"
        className="w-full text-left"
        onClick={() => inputRef.current?.click()}
      >
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="font-display text-lg text-white">{label}</p>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
            JSON
          </span>
        </div>
        <p className="text-sm text-slate-400">{helperText}</p>
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-6 text-sm text-slate-400">
          {file ? (
            <span className="text-slate-100">{file.name}</span>
          ) : (
            <span>Drag and drop or click to choose a file.</span>
          )}
        </div>
      </button>
    </div>
  );
}
