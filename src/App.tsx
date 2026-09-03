import { useCallback, useEffect, useRef, useState } from "react";
import { PulseEngine } from "./lib/engine";
import { parseProgram } from "./lib/dsl";
import { DEFAULT_PRESET } from "./data/presets";
import Editor from "./components/Editor";
import StepGrid from "./components/StepGrid";

const LS_KEY = "pulsekit:code";

export default function App() {
  const engineRef = useRef<PulseEngine | null>(null);
  if (!engineRef.current) engineRef.current = new PulseEngine();
  const engine = engineRef.current;

  const [code, setCode] = useState(() => localStorage.getItem(LS_KEY) ?? DEFAULT_PRESET.code);
  const [program, setProgram] = useState(() => parseProgram(code));
  const [step, setStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(program.bpm);

  useEffect(() => {
    engine.onStep = (s) => setStep(s);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem(LS_KEY, code), 500);
    return () => clearTimeout(timer);
  }, [code]);

  const run = useCallback(() => {
    const p = parseProgram(code);
    setProgram(p);
    setBpm(p.bpm);
    engine.loadProgram(p);
  }, [code, engine]);

  const togglePlay = useCallback(async () => {
    if (engine.running) {
      engine.stop();
      setIsPlaying(false);
    } else {
      await engine.play();
      setIsPlaying(true);
    }
  }, [engine]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); void togglePlay(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, run]);

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <header className="flex h-14 items-center gap-4 border-b border-gray-700 px-4">
        <h1 className="text-lg font-bold">PULSEKIT</h1>
        <button onClick={() => void togglePlay()} className={`rounded px-3 py-1 font-bold ${isPlaying ? "bg-red-500" : "bg-green-500"}`}>
          {isPlaying ? "STOP" : "PLAY"}
        </button>
        <label className="flex items-center gap-2">
          <span>BPM</span>
          <input type="number" value={bpm} min={40} max={260} onChange={(e) => { const v = +e.target.value; setBpm(v); engine.setBpm(v); }} className="w-16 rounded bg-gray-800 px-2 py-1" />
        </label>
        <label className="flex items-center gap-2">
          <span>VOL</span>
          <input type="range" min={0} max={1} step={0.01} defaultValue={0.8} onChange={(e) => engine.setVolume(+e.target.value)} />
        </label>
        <span className="ml-auto font-mono text-sm">{step >= 0 ? `Step ${step}` : "Ready"}</span>
      </header>

      <main className="grid flex-1 grid-cols-2 gap-4 p-4">
        <Editor value={code} onChange={setCode} onRun={run} errorLines={new Set(program.errors.map(e => e.line))} />
        <StepGrid tracks={program.tracks} step={step} isPlaying={isPlaying} />
      </main>
    </div>
  );
}
