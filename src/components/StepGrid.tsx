import type { Track } from "../lib/dsl";
import { trackColor } from "../lib/dsl";

interface StepGridProps {
  tracks: Track[];
  step: number;
  isPlaying: boolean;
}

export default function StepGrid({ tracks, step, isPlaying }: StepGridProps) {
  return (
    <section className="flex flex-col rounded-lg border border-gray-700 bg-gray-800">
      <header className="border-b border-gray-700 px-3 py-2 font-mono text-sm">{tracks.length} TRACKS</header>
      <div className="min-h-[300px] flex-1 overflow-auto p-3">
        {tracks.length === 0 ? (
          <p className="text-center text-gray-500">No tracks - run a pattern</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tracks.map((t) => {
              const color = trackColor(t.name);
              const cells = t.kind === "drum" ? t.steps.split("") : t.notes.map((n) => n ?? "");
              const len = cells.length;
              const playCol = step >= 0 ? step % len : -1;
              return (
                <div key={t.name} className="flex items-center gap-2">
                  <div className="w-20 text-right font-mono text-xs" style={{ color }}>{t.name}</div>
                  <div className="flex">
                    {cells.map((c, i) => {
                      const isCur = i === playCol;
                      const hit = t.kind === "drum" ? c === "x" : c !== "";
                      return (
                        <div key={i} className={`mx-px h-4 w-4 rounded ${isCur && isPlaying ? "ring-2 ring-white" : ""}`}
                          style={{ background: hit ? color : isCur ? "#374151" : i % 4 === 0 ? "#1f2937" : "#374151" }} />
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
