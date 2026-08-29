import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { PulseEngine } from "./lib/engine";
import { parseProgram, noteToMidi, midiToNote } from "./lib/dsl";
import type { Program } from "./lib/dsl";
import { DEFAULT_PRESET } from "./data/presets";
import type { Preset } from "./data/presets";
import Editor from "./components/Editor";
import StepGrid from "./components/StepGrid";
import Scope from "./components/Scope";
import ConsolePanel from "./components/ConsolePanel";
import type { LogEntry } from "./components/ConsolePanel";
import SidePanel from "./components/SidePanel";

const LS_KEY = "pulsekit:session:v1";
const now = () => new Date().toTimeString().slice(0, 8);

function Slider(props: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; color?: string; onChange: (v: number) => void; width?: string;
}) {
  const { label, value, min, max, step, display, color = "#2de0c8", onChange, width = "w-20" } = props;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="group flex cursor-pointer flex-col gap-1">
      <span className="flex items-baseline justify-between font-mono text-[8.5px] font-bold tracking-[0.18em] text-mist-500 group-hover:text-mist-300">
        <span>{label}</span>
        <span className="tabular-nums" style={{ color }}>{display}</span>
      </span>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={width}
        style={{ "--pct": `${pct}%`, "--fill": color, "--thumb": color } as CSSProperties}
        aria-label={label}
      />
    </label>
  );
}

export default function App() {
  const engineRef = useRef<PulseEngine | null>(null);
  if (!engineRef.current) engineRef.current = new PulseEngine();
  const engine = engineRef.current;

  const [code, setCode] = useState(() => {
    try { return localStorage.getItem(LS_KEY) ?? DEFAULT_PRESET.code; }
    catch { return DEFAULT_PRESET.code; }
  });
  const [program, setProgram] = useState<Program | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [step, setStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(132);
  const [swing, setSwing] = useState(0.05);
  const [volume, setVolume] = useState(0.8);
  const [cutoff, setCutoff] = useState(18500);
  const [saved, setSaved] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>(DEFAULT_PRESET.id);
  const idRef = useRef(0);
  const didInit = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const log = useCallback((kind: LogEntry["kind"], msg: string) => {
    setEntries((prev) => [...prev.slice(-80), { id: ++idRef.current, kind, msg, time: now() }]);
  }, []);

  /* ------------------------------ run / parse ------------------------------ */

  const run = useCallback((src?: string) => {
    const source = src ?? code;
    const prog = parseProgram(source);
    setProgram(prog);
    engine.loadProgram(prog);
    setBpm(prog.bpm);
    setSwing(prog.swing);
    engine.setSwing(prog.swing);

    if (prog.errors.length === 0) {
      const drums = prog.tracks.filter((t) => t.kind === "drum").length;
      const synth = prog.tracks.length - drums;
      log("ok", `${prog.tracks.length} lanes armed (${drums} drum · ${synth} synth) @ ${prog.bpm} BPM${prog.swing > 0 ? ` · swing ${Math.round(prog.swing * 100)}%` : ""}`);
    } else {
      prog.errors.forEach((e) => log("err", `L${e.line} — ${e.message}`));
      if (prog.tracks.length > 0) log("info", `${prog.tracks.length} lanes armed despite ${prog.errors.length} error(s) — fix flagged lines`);
      else log("err", "no lanes armed — pattern has fatal errors");
    }
    return prog;
  }, [code, engine, log]);

  /* ------------------------------- transport ------------------------------- */

  const togglePlay = useCallback(async () => {
    if (engine.running) {
      engine.stop();
      setIsPlaying(false);
      log("sys", "transport stopped — position reset to 1.1.1");
    } else {
      log("sys", "starting audio context — unlocking WebAudio…");
      await engine.play();
      engine.setVolume(volume);
      engine.setCutoff(cutoff);
      setIsPlaying(true);
      log("ok", `rolling @ ${bpm} BPM — Space stops, edits + RUN swap lanes live`);
    }
  }, [engine, log, volume, cutoff, bpm]);

  /* ------------------------------- boot once ------------------------------- */

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    engine.onStep = (s) => setStep(s);
    const restored = (() => { try { return localStorage.getItem(LS_KEY) !== null; } catch { return false; } })();
    log("sys", "PULSEKIT v1.0 — live-coding engine initialized (Tone.js / WebAudio)");
    log("sys", restored ? "previous session restored from local storage" : "loaded default pattern: Warehouse Techno");
    run(code);
    log("info", "press ▶ PLAY (or Space) to start audio · Ctrl/⌘+Enter re-runs the pattern");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------- persistence (debounced) ------------------------- */

  useEffect(() => {
    if (didInit.current) setSaved(false);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try { localStorage.setItem(LS_KEY, code); } catch { /* private mode */ }
      setSaved(true);
    }, 600);
  }, [code]);

  /* ------------------------------ keyboard ------------------------------ */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT" || tag === "BUTTON") return;
      if (e.code === "Space") {
        e.preventDefault();
        void togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  /* -------------------------------- mutate -------------------------------- */

  const mutate = useCallback(() => {
    const next = code.split("\n").map((line) => {
      const m = /^(\s*[A-Za-z]\w*\s*:\s*)(.+)$/.exec(line);
      if (!m) return line;
      const body = m[2];

      if (/^[xX\-_.\s|]+$/.test(body)) {
        const isKick = /kick|bd/i.test(m[1]);
        return m[1] + body.split("").map((ch) => {
          if (ch === "x" || ch === "X") {
            if (!isKick && Math.random() < 0.13) return "-";
            return ch;
          }
          if (ch === "-" && Math.random() < (isKick ? 0.035 : 0.11)) {
            return Math.random() < 0.7 ? "x" : ".";
          }
          return ch;
        }).join("");
      }

      if (body.includes("[")) {
        const shift = [-2, -1, 0, 0, 1, 2][Math.floor(Math.random() * 6)];
        return m[1] + body.replace(/\[([^\]]*)\]/, (_all, inner: string) => {
          const toks = inner.trim().split(/\s+/).map((tok) => {
            if (!/^[A-Ga-g](#|b)?\d?$/.test(tok)) return tok;
            const withOct = /\d$/.test(tok) ? tok : tok + "4";
            const midi = Math.max(24, Math.min(96, noteToMidi(withOct.charAt(0).toUpperCase() + withOct.slice(1)) + shift));
            return midiToNote(midi);
          });
          return `[${toks.join(" ")}]`;
        });
      }
      return line;
    }).join("\n");

    setCode(next);
    setActivePreset(null);
    run(next);
    log("info", "MUTATE — drum density ±, note lane transposed (seed drift)");
  }, [code, log, run]);

  /* -------------------------------- presets -------------------------------- */

  const selectPreset = useCallback((p: Preset) => {
    setCode(p.code);
    setActivePreset(p.id);
    run(p.code);
    log("sys", `preset loaded: ${p.name} (${p.genre}, ${p.bpm} BPM)`);
  }, [log, run]);

  /* -------------------------------- derived -------------------------------- */

  const errorLines = new Set<number>();
  program?.errors.forEach((e) => errorLines.add(e.line));
  const hasErrors = errorLines.size > 0;

  const bar = step >= 0 ? Math.floor(step / 16) + 1 : 1;
  const beat = step >= 0 ? Math.floor((step % 16) / 4) + 1 : 1;
  const tick = step >= 0 ? (step % 4) + 1 : 1;
  const posStr = `${String(bar).padStart(2, "0")}.${String(beat).padStart(2, "0")}.${String(tick).padStart(2, "0")}`;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="studio-bg" />
      <div className="scanline" />

      {/* ================================ HEADER ================================ */}
      <header className="flex h-[58px] flex-none items-center gap-4 border-b border-ink-700/80 bg-ink-900/80 px-4 backdrop-blur-sm">
        {/* wordmark */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-volt-400/50 bg-ink-800 shadow-[0_0_18px_rgba(45,224,200,0.18)]">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <path d="M4 20h5v-9h5v13h5V8h5v12h4" stroke="#2de0c8" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </span>
          <div className="leading-none">
            <h1 className="font-display text-[15px] font-bold tracking-wide text-mist-100">
              PULSE<span className="text-volt-400">KIT</span>
            </h1>
            <p className="mt-1 font-mono text-[8px] tracking-[0.3em] text-mist-500">LIVE-CODE EDM STUDIO</p>
          </div>
        </div>

        <div className="hidden h-8 w-px bg-ink-700 sm:block" />

        {/* transport */}
        <div className="flex flex-1 items-center gap-4 overflow-x-auto">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => void togglePlay()}
              className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg border transition-all duration-150 active:scale-90 ${
                isPlaying
                  ? "play-live border-volt-400 bg-volt-400/15 text-volt-300"
                  : "border-ink-600 bg-ink-800 text-mist-200 hover:border-volt-400/70 hover:text-volt-300"
              }`}
              title={isPlaying ? "Stop (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5-13-7.5z" /></svg>
              )}
            </button>
            {/* mini EQ, dances while playing */}
            <div className={`hidden h-8 w-7 flex-none items-end justify-center gap-[3px] pb-1 ${isPlaying ? "eq-run" : "eq-idle"} flex`} aria-hidden>
              <span className="eq-bar eq1 w-[4px] rounded-sm bg-volt-400" style={{ height: "18%" }} />
              <span className="eq-bar eq2 w-[4px] rounded-sm bg-blaze-400" style={{ height: "18%" }} />
              <span className="eq-bar eq3 w-[4px] rounded-sm bg-solar-400" style={{ height: "18%" }} />
            </div>
          </div>

          {/* BPM */}
          <div className="flex flex-none items-center gap-2">
            <label className="flex cursor-pointer flex-col gap-0.5">
              <span className="font-mono text-[8.5px] font-bold tracking-[0.18em] text-mist-500">TEMPO</span>
              <input
                type="number"
                min={40} max={260} value={bpm}
                onChange={(e) => {
                  const v = Math.max(40, Math.min(260, parseInt(e.target.value || "0", 10) || 120));
                  setBpm(v);
                  engine.setBpm(v);
                }}
                className="w-14 rounded-md border border-ink-600 bg-ink-950/70 px-1.5 py-0.5 text-center font-display text-[15px] font-bold text-volt-300 outline-none focus:border-volt-400/70"
                aria-label="Tempo in BPM"
              />
            </label>
            <Slider label="BPM" value={bpm} min={80} max={190} step={1} display={`${bpm}`} onChange={(v) => { setBpm(v); engine.setBpm(v); }} width="w-24" />
          </div>

          <div className="hidden h-8 w-px bg-ink-700 md:block" />

          <Slider label="SWING" value={swing} min={0} max={0.6} step={0.01} display={`${Math.round(swing * 100)}%`} color="#ffb454" onChange={(v) => { setSwing(v); engine.setSwing(v); }} width="w-16" />
          <div className="hidden md:block">
            <Slider label="LPF" value={cutoff} min={400} max={18500} step={50} display={cutoff >= 1000 ? `${(cutoff / 1000).toFixed(1)}k` : `${cutoff}`} color="#ff4d9e" onChange={(v) => { setCutoff(v); engine.setCutoff(v); }} width="w-16" />
          </div>
          <div className="hidden sm:block">
            <Slider label="VOL" value={volume} min={0} max={1} step={0.01} display={`${Math.round(volume * 100)}`} color="#38c8f0" onChange={(v) => { setVolume(v); engine.setVolume(v); }} width="w-16" />
          </div>
        </div>

        {/* status cluster */}
        <div className="hidden flex-none items-center gap-2 lg:flex">
          <span className={`h-2 w-2 rounded-full ${isPlaying ? "bg-lime-400 led-run" : hasErrors ? "bg-solar-400" : "bg-mist-600"}`} />
          <span className="font-mono text-[9px] font-bold tracking-[0.22em] text-mist-400">
            {isPlaying ? "RUNNING" : hasErrors ? "ARMED*" : "ARMED"}
          </span>
        </div>
      </header>

      {/* ================================= MAIN ================================= */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-12 lg:overflow-hidden">
        {/* left: editor + console */}
        <div className="flex h-[600px] flex-col gap-3 lg:col-span-5 lg:h-auto lg:min-h-0">
          <Editor
            value={code}
            onChange={(v) => { setCode(v); setActivePreset(null); }}
            onRun={() => run()}
            onMutate={mutate}
            errorLines={errorLines}
            hasErrors={hasErrors}
            saved={saved}
          />
          <ConsolePanel entries={entries} onClear={() => setEntries([])} />
        </div>

        {/* middle: step matrix + scope */}
        <div className="flex h-[540px] flex-col gap-3 lg:col-span-4 lg:h-auto lg:min-h-0">
          <StepGrid tracks={program?.tracks ?? []} step={step} isPlaying={isPlaying} />
          <Scope engine={engine} isPlaying={isPlaying} />
        </div>

        {/* right: library + docs */}
        <div className="flex h-[460px] flex-col lg:col-span-3 lg:h-auto lg:min-h-0">
          <SidePanel activePreset={activePreset} onSelect={selectPreset} />
        </div>
      </main>

      {/* =============================== STATUS =============================== */}
      <footer className="flex h-[26px] flex-none items-center gap-4 border-t border-ink-700/80 bg-ink-900/90 px-3.5 font-mono text-[9.5px] tracking-wider text-mist-500">
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? "bg-lime-400" : "bg-volt-400"}`} />
          <span className="font-bold text-mist-400">{isPlaying ? "ENGINE RUNNING" : "ENGINE READY"}</span>
        </span>
        <span className="tabular-nums text-mist-400">
          POS <span className={isPlaying ? "text-volt-300" : ""}>{posStr}</span>
        </span>
        <span className="hidden tabular-nums sm:inline">SR {(engine.sampleRate / 1000).toFixed(1)}kHz</span>
        <span className="hidden tabular-nums md:inline">16TH-GRID · 2-BAR LOOP</span>
        <span className="ml-auto flex items-center gap-3">
          {hasErrors ? (
            <span className="font-bold text-solar-400">⚠ {program?.errors.length} ERR</span>
          ) : (
            <span className="text-volt-400">✓ PATTERN VALID</span>
          )}
          <span className="hidden items-center gap-1.5 lg:flex">
            <kbd>SPACE</kbd> PLAY <kbd>⌃↵</kbd> RUN
          </span>
        </span>
      </footer>
    </div>
  );
}
