import { useRef, useState } from "react";

interface EditorProps {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  errorLines: Set<number>;
}

export default function Editor({ value, onChange, onRun, errorLines }: EditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [cursorLine, setCursorLine] = useState(1);

  const lines = value.split("\n");

  const updateCursor = () => {
    const ta = taRef.current;
    if (!ta) return;
    setCursorLine(value.slice(0, ta.selectionStart).split("\n").length);
  };

  return (
    <section className="flex flex-col rounded-lg border border-gray-700 bg-gray-800">
      <header className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
        <span className="font-mono text-sm">pattern.plk</span>
        <button onClick={onRun} className="rounded bg-blue-500 px-3 py-1 font-bold hover:bg-blue-600">RUN</button>
      </header>
      <div className="relative flex min-h-[300px] flex-1">
        <div className="w-10 border-r border-gray-700 bg-gray-900 py-2 text-right font-mono text-xs text-gray-500">
          {lines.map((_, i) => {
            const n = i + 1;
            const isErr = errorLines.has(n);
            const isCur = n === cursorLine;
            return (<div key={i} className={`leading-relaxed ${isErr ? "text-red-400" : isCur ? "text-blue-400" : ""}`}>{n}</div>);
          })}
        </div>
        <textarea ref={taRef} value={value} onChange={(e) => onChange(e.target.value)} onKeyUp={updateCursor} onClick={updateCursor}
          className="flex-1 resize-none bg-transparent p-2 font-mono text-sm outline-none" spellCheck={false} />
      </div>
    </section>
  );
}
