import { useState } from "react";
import { PRESETS } from "../data/presets";
import type { Preset } from "../data/presets";

interface SidePanelProps {
  activePreset: string | null;
  onSelect: (p: Preset) => void;
}

const DOCS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Global",
    body: (
      <pre className="whitespace-pre-wrap">{`bpm 128        tempo (40–260)
swing 0.12     16th swing 0–1
// comment     ignored`}</pre>
    ),
  },
  {
    title: "Drum lanes",
    body: (
      <pre className="whitespace-pre-wrap">{`kick: x---x---x---x---
snare: ----x-------x---
hat:  x-x-x-x-x-x-x-x- x-x-…

x hit · X accent · - rest · . ghost
16 steps = 1 bar, 32 = 2 bars
spaces and | are just grouping`}</pre>
    ),
  },
  {
    title: "Drum names",
    body: (
      <pre className="whitespace-pre-wrap">{`kick/bd  snare/snr  clap/cp
hat/ch   openhat/oh ride
tom      perc/rim
anything else → perc`}</pre>
    ),
  },
  {
    title: "Melodic lanes",
    body: (
      <pre className="whitespace-pre-wrap">{`bass: [C1 . Eb1 G1] sq cut 110..1600

[notes]  loops over its own length
.        rest inside the loop
A–G + #/b + octave (C1, F#4, Bb2)
wave:    sq saw tri sine pwm`}</pre>
    ),
  },
  {
    title: "Options",
    body: (
      <pre className="whitespace-pre-wrap">{`cut N      filter cutoff (Hz)
cut A..B   cutoff sweep per note
res N      filter resonance
delay 3/8  echo send (musical)
delay 0.75 echo send (beats)
decay N    envelope length (s)
vol 0..1   lane volume
chord      play [..] as one chord`}</pre>
    ),
  },
  {
    title: "Workflow",
    body: (
      <pre className="whitespace-pre-wrap">{`Ctrl/⌘+Enter   run pattern
Space          play / stop
Edit while playing — RUN
re-arms lanes without
stopping the groove.
MUTATE rolls random variations.`}</pre>
    ),
  },
];

export default function SidePanel({ activePreset, onSelect }: SidePanelProps) {
  const [tab, setTab] = useState<"library" | "docs">("library");

  return (
    <section className="panel flex min-h-0 flex-col rise-in" style={{ animationDelay: "180ms" }}>
      <div className="flex border-b border-ink-700/70">
        {(["library", "docs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex flex-1 items-center justify-center gap-2 px-3 py-2.5 font-mono text-[10px] font-bold tracking-[0.2em] transition-colors ${
              tab === t
                ? "border-b-2 border-volt-400 bg-ink-800/60 text-volt-300"
                : "border-b-2 border-transparent text-mist-500 hover:text-mist-300"
            }`}
          >
            {t === "library" ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-2.5" />
              </svg>
            )}
            {t === "library" ? "LIBRARY" : "DOCS"}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {tab === "library" ? (
          <div className="flex flex-col gap-2">
            {PRESETS.map((p) => {
              const active = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className={`group relative overflow-hidden rounded-lg border p-3 text-left transition-all duration-150 active:scale-[0.985] ${
                    active
                      ? "border-mist-400/50 bg-ink-700/50"
                      : "border-ink-600/70 bg-ink-800/40 hover:-translate-y-[1px] hover:border-mist-500/60 hover:bg-ink-700/40"
                  }`}
                >
                  <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: p.color, boxShadow: `0 0 10px ${p.color}77` }} />
                  <div className="flex items-center gap-2 pl-2">
                    <span className="font-body text-[13px] font-bold text-mist-100">{p.name}</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className="rounded-sm border px-1 py-px font-mono text-[8px] font-bold tracking-widest" style={{ borderColor: `${p.color}66`, color: p.color }}>
                        {p.genre}
                      </span>
                      <span className="rounded-sm border border-ink-600 px-1 py-px font-mono text-[8px] font-bold text-mist-400">
                        {p.bpm}
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 pl-2 font-body text-[10.5px] leading-snug text-mist-400">{p.blurb}</p>
                  <div className={`mt-1.5 pl-2 font-mono text-[8.5px] tracking-wider ${active ? "text-volt-300" : "text-mist-600 group-hover:text-mist-400"}`}>
                    {active ? "▶ LOADED IN EDITOR" : "CLICK TO LOAD →"}
                  </div>
                </button>
              );
            })}
            <p className="px-1 pt-1 pb-2 font-mono text-[9px] leading-relaxed text-mist-600">
              Loading a preset while the engine runs swaps the groove live — no drop in the beat.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {DOCS.map((d) => (
              <div key={d.title} className="rounded-lg border border-ink-600/60 bg-ink-800/40 p-2.5">
                <h4 className="mb-1.5 font-mono text-[9px] font-bold tracking-[0.22em] text-volt-300">{d.title.toUpperCase()}</h4>
                <div className="font-mono text-[10px] leading-[1.55] text-mist-300 [&_pre]:m-0">{d.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
