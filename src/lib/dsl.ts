/* PulseKit - Minimal pattern language */

export type DrumKind = "kick" | "snare" | "hat" | "clap";

export interface DrumTrack {
  kind: "drum";
  name: string;
  drum: DrumKind;
  steps: string;
}

export interface NoteTrack {
  kind: "notes";
  name: string;
  notes: (string | null)[];
  wave: string;
  vol: number;
}

export type Track = DrumTrack | NoteTrack;

export interface Program {
  bpm: number;
  tracks: Track[];
  errors: { line: number; message: string }[];
}

const DRUMS: Record<string, DrumKind> = {
  kick: "kick", snare: "snare", hat: "hat", clap: "clap",
};

export function parseProgram(src: string): Program {
  const errors: { line: number; message: string }[] = [];
  const tracks: Track[] = [];
  let bpm = 120;

  src.split("\n").forEach((raw, idx) => {
    const line = idx + 1;
    const text = raw.trim();
    if (!text || text.startsWith("//")) return;

    if (/^bpm\s+(\d+)$/.test(text)) {
      bpm = parseInt(text.split(/\s+/)[1], 10);
      return;
    }

    const m = /^([a-zA-Z]\w*)\s*:\s*(.+)$/.exec(text);
    if (!m) {
      errors.push({ line, message: "Use 'name: pattern' format" });
      return;
    }
    const name = m[1];
    const body = m[2];

    // Drum track
    if (DRUMS[name.toLowerCase()] || /^[xX\-.\s]+$/.test(body)) {
      const steps = body.replace(/\s/g, "");
      if (steps.length !== 16) {
        errors.push({ line, message: "Drum patterns must be 16 steps" });
        return;
      }
      tracks.push({ kind: "drum", name, drum: DRUMS[name.toLowerCase()] ?? "hat", steps });
      return;
    }

    // Note track
    const bracket = /\[([^\]]*)\]/.exec(body);
    if (!bracket) {
      errors.push({ line, message: "Use [note note ...] format" });
      return;
    }
    const notes = bracket[1].trim().split(/\s+/).map((t) => t === "." ? null : t);
    const waveMatch = body.match(/\b(sine|square|saw|tri)\b/);
    const volMatch = body.match(/vol\s+([\d.]+)/);
    tracks.push({
      kind: "notes",
      name,
      notes,
      wave: waveMatch?.[1] ?? "square",
      vol: volMatch ? parseFloat(volMatch[1]) : 0.7,
    });
  });

  return { bpm, tracks, errors };
}

export function trackColor(name: string): string {
  const colors: Record<string, string> = {
    kick: "#ff5c5c", snare: "#ffb454", hat: "#38c8f0", clap: "#ffd27f",
    bass: "#2de0c8", lead: "#ff4d9e",
  };
  return colors[name.toLowerCase()] ?? "#9bb0ff";
}
