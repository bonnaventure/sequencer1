import { useEffect, useRef } from "react";

export interface LogEntry {
  id: number;
  kind: "ok" | "err" | "info" | "sys";
  msg: string;
  time: string;
}

const KIND_STYLE: Record<LogEntry["kind"], { dot: string; text: string; label: string }> = {
  ok:   { dot: "bg-lime-400",  text: "text-mist-200",  label: "OK" },
  err:  { dot: "bg-coral-400", text: "text-coral-400", label: "ER" },
  info: { dot: "bg-sky-400",   text: "text-mist-300",  label: "IN" },
  sys:  { dot: "bg-volt-400",  text: "text-volt-300",  label: "SY" },
};

interface ConsolePanelProps {
  entries: LogEntry[];
  onClear: () => void;
}

export default function ConsolePanel({ entries, onClear }: ConsolePanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <section className="panel flex h-44 flex-none flex-col rise-in" style={{ animationDelay: "300ms" }}>
      <header className="panel-head">
        <span className="tick bg-sky-400" />
        <span className="panel-title">Console</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[9px] tracking-widest text-mist-500">{entries.length} MSG</span>
          <button
            onClick={onClear}
            className="rounded border border-ink-600 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-mist-500 transition-colors hover:border-coral-400/60 hover:text-coral-400"
          >
            CLR
          </button>
        </span>
      </header>
      <div ref={bodyRef} className="code-font !text-[11px] min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {entries.map((e) => {
          const s = KIND_STYLE[e.kind];
          return (
            <div key={e.id} className="console-in flex items-baseline gap-2 py-[1.5px]">
              <span className={`h-[5px] w-[5px] flex-none translate-y-[-1px] rounded-full ${s.dot}`} />
              <span className="flex-none font-mono text-[9px] text-mist-600">{e.time}</span>
              <span className={`flex-none font-mono text-[9px] font-bold text-mist-500`}>{s.label}</span>
              <span className={`whitespace-pre-wrap break-words font-mono ${s.text}`}>{e.msg}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-2 pt-1">
          <span className="font-mono text-[11px] text-volt-400">❯</span>
          <span className="caret-blink inline-block h-3.5 w-[7px] bg-volt-400/80" />
        </div>
      </div>
    </section>
  );
}
