import type { Track } from "../lib/dsl";
import { trackColor } from "../lib/dsl";

interface StepGridProps {
  tracks: Track[];
  step: number; // -1 when stopped
  isPlaying: boolean;
}

export default function StepGrid({ tracks, step, isPlaying }: StepGridProps) {
  return (
    <section className="panel flex min-h-0 flex-1 flex-col rise-in" style={{ animationDelay: "140ms" }}>
      <header className="panel-head">
        <span className={`tick ${isPlaying ? "bg-lime-400" : "bg-mist-500"}`} />
        <span className="panel-title">Step Matrix</span>
        <span className="ml-auto font-mono text-[9px] tracking-widest text-mist-500">
          {tracks.length} LANE{tracks.length === 1 ? "" : "S"}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-2.5">
        {tracks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#3d4d63" strokeWidth="1.5">
              <path d="M3 12h3l2-7 4 14 3-10 2 3h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="font-mono text-[10px] tracking-wider text-mist-500">
              NO LANES — RUN A PATTERN TO ARM THE GRID
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-[7px]">
            {tracks.map((t) => {
              const color = trackColor(t.name);
              const cells = t.kind === "drum" ? t.steps.split("") : t.notes.map((n) => n ?? "");
              const len = cells.length;
              const playCol = step >= 0 ? step % len : -1;

              return (
                <div key={t.name} className="group flex items-center gap-2">
                  {/* lane label */}
                  <div className="w-20 flex-none text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full transition-transform ${isPlaying && playCol >= 0 ? "scale-125" : ""}`}
                        style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
                      />
                      <span className="truncate font-mono text-[10.5px] font-bold tracking-wide" style={{ color }}>
                        {t.name}
                      </span>
                    </div>
                    <div className="font-mono text-[8px] tracking-[0.18em] text-mist-600">
                      {t.kind === "drum" ? `${t.drum.toUpperCase()} · ${len}ST` : `${t.wave.slice(0, 3).toUpperCase()} · ${len}ST`}
                    </div>
                  </div>

                  {/* cells */}
                  <div className="flex min-w-0 items-center">
                    {cells.map((c, i) => {
                      const isBeat = i % 4 === 0 && i > 0;
                      const isBar = i % 16 === 0 && i > 0;
                      const isCur = i === playCol;
                      const hit = t.kind === "drum" ? c === "x" || c === "X" : c !== "";
                      const accent = t.kind === "drum" && c === "X";
                      const ghost = t.kind === "drum" && c === ".";

                      return (
                        <div key={i} className={`flex items-center ${isBar ? "ml-[7px]" : isBeat ? "ml-[4px]" : "ml-[2px]"}`}>
                          <div
                            className={`relative flex items-center justify-center rounded-[3px] border transition-all duration-75 ${
                              hit ? "h-[18px] min-w-[18px]" : "h-[14px] min-w-[14px]"
                            } ${isCur && isPlaying ? "cell-hit" : ""}`}
                            style={{
                              background: hit
                                ? `${color}${accent ? "" : "26"}`
                                : isCur
                                  ? "rgba(150,175,205,0.10)"
                                  : i % 4 === 0
                                    ? "rgba(60,78,105,0.16)"
                                    : "rgba(38,50,72,0.28)",
                              borderColor: isCur && isPlaying
                                ? "#e8f2ff"
                                : hit
                                  ? `${color}${accent ? "ee" : "77"}`
                                  : "rgba(63,82,110,0.22)",
                              boxShadow: isCur && isPlaying && hit ? `0 0 12px ${color}aa` : isCur && isPlaying ? "0 0 8px rgba(200,220,245,0.25)" : "none",
                              transform: isCur && isPlaying ? "scale(1.12)" : "scale(1)",
                            }}
                          >
                            {hit && (
                              t.kind === "drum" ? (
                                <span
                                  className={`rounded-[2px] ${ghost ? "" : ""}`}
                                  style={{
                                    width: accent ? 9 : 7,
                                    height: accent ? 9 : 7,
                                    background: color,
                                    boxShadow: `0 0 ${accent ? 8 : 5}px ${color}`,
                                  }}
                                />
                              ) : (
                                <span className="px-0.5 font-mono text-[7.5px] font-bold" style={{ color }}>
                                  {c}
                                </span>
                              )
                            )}
                            {ghost && (
                              <span className="h-[3px] w-[3px] rounded-full" style={{ background: `${color}66` }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
