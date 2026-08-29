import { useMemo, useRef, useState } from "react";
import { tokenizeLine } from "../lib/dsl";

interface EditorProps {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  onMutate: () => void;
  errorLines: Set<number>;
  hasErrors: boolean;
  saved: boolean;
}

export default function Editor({ value, onChange, onRun, onMutate, errorLines, hasErrors, saved }: EditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLDivElement>(null);
  const gutRef = useRef<HTMLDivElement>(null);
  const [cursorLine, setCursorLine] = useState(1);

  const lines = useMemo(() => value.split("\n"), [value]);

  const highlighted = useMemo(
    () =>
      lines.map((line, i) => {
        const toks = tokenizeLine(line);
        return (
          <div key={i} className="whitespace-pre">
            {toks.map((t, j) => (
              <span key={j} className={t.cls} style={t.color ? { color: t.color } : undefined}>
                {t.text}
              </span>
            ))}
            {toks.length === 0 ? "\u00a0" : null}
          </div>
        );
      }),
    [lines],
  );

  const syncScroll = () => {
    const ta = taRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutRef.current) gutRef.current.scrollTop = ta.scrollTop;
  };

  const updateCursor = () => {
    const ta = taRef.current;
    if (!ta) return;
    setCursorLine(value.slice(0, ta.selectionStart).split("\n").length);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart;
      const en = ta.selectionEnd;
      const next = value.slice(0, s) + "  " + value.slice(en);
      onChange(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }
  };

  return (
    <section className="panel flex min-h-0 flex-1 flex-col rise-in" style={{ animationDelay: "60ms" }}>
      <header className="panel-head justify-between">
        <div className="flex items-center gap-2.5">
          <span className="tick bg-volt-400" />
          <span className="panel-title">pattern.plk</span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${saved ? "bg-lime-400" : "bg-solar-400"} transition-colors`} />
            <span className="font-mono text-[9px] tracking-widest text-mist-500">
              {saved ? "SAVED" : "EDITING"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMutate}
            className="group flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-800 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-mist-300 transition-all hover:border-solar-400/60 hover:text-solar-400 active:scale-95"
            title="Randomly mutate the current pattern"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            MUTATE
          </button>
          <button
            onClick={onRun}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1 font-mono text-[10px] font-bold tracking-wider transition-all active:scale-95 ${
              hasErrors
                ? "border-solar-400/60 bg-solar-400/10 text-solar-400 hover:bg-solar-400/20"
                : "border-volt-400/60 bg-volt-400/10 text-volt-300 hover:bg-volt-400/20 hover:shadow-[0_0_16px_rgba(45,224,200,0.25)]"
            }`}
            title="Evaluate pattern (Ctrl+Enter)"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L4.5 13.5H11L9.5 22 19 9.5h-7L13 2z" />
            </svg>
            RUN
            <kbd className="!text-[8px]">⌃↵</kbd>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* gutter */}
        <div
          ref={gutRef}
          className="code-font w-11 flex-none overflow-hidden border-r border-ink-700/70 bg-ink-900/50 py-3.5 text-right select-none"
          aria-hidden
        >
          {lines.map((_, i) => {
            const n = i + 1;
            const isErr = errorLines.has(n);
            const isCur = n === cursorLine;
            return (
              <div
                key={i}
                className={`pr-3 leading-[1.7] ${isErr ? "font-bold text-coral-400" : isCur ? "text-volt-300" : "text-mist-600"}`}
              >
                {isErr ? `${n}!` : n}
              </div>
            );
          })}
        </div>

        {/* code area */}
        <div className="relative min-w-0 flex-1">
          <div ref={preRef} className="code-font pointer-events-none absolute inset-0 overflow-hidden py-3.5 pr-4 pl-4" aria-hidden>
            {highlighted}
            <div className="h-8" />
          </div>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={onKeyDown}
            onKeyUp={updateCursor}
            onClick={updateCursor}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            className="code-font absolute inset-0 resize-none overflow-auto bg-transparent py-3.5 pr-4 pl-4 text-transparent caret-lime-400 outline-none"
            style={{ WebkitTextFillColor: "transparent" }}
            aria-label="Pattern code editor"
          />
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-ink-700/70 px-3.5 py-1.5">
        <span className="font-mono text-[9.5px] tracking-wider text-mist-500">
          {lines.length} LN · PULSEKIT DSL v1
        </span>
        <span className={`font-mono text-[9.5px] font-bold tracking-wider ${hasErrors ? "text-solar-400" : "text-volt-400"}`}>
          {hasErrors ? `⚠ ${errorLines.size} LINE${errorLines.size > 1 ? "S" : ""} FLAGGED` : "SYNTAX OK"}
        </span>
      </footer>
    </section>
  );
}
