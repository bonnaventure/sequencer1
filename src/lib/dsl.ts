/* ------------------------------------------------------------------ */
/*  PULSEKIT pattern language — parser, types, highlighter, note utils */
/* ------------------------------------------------------------------ */

export type DrumKind =
  | "kick" | "snare" | "clap" | "hat" | "openhat"
  | "tom" | "perc" | "ride";

export interface DrumTrack {
  kind: "drum";
  name: string;
  drum: DrumKind;
  /** normalized step string of length 16 or 32, chars: x X - . */
  steps: string;
}

export interface NoteTrack {
  kind: "notes";
  name: string;
  /** null = rest */
  notes: (string | null)[];
  wave: string;
  cutA?: number;
  cutB?: number;
  res?: number;
  /** delay send, in beats */
  delay?: number;
  decay?: number;
  vol: number;
  chord?: boolean;
}

export type Track = DrumTrack | NoteTrack;

export interface ParseError {
  line: number; // 1-based
  message: string;
}

export interface Program {
  bpm: number;
  swing: number;
  tracks: Track[];
  errors: ParseError[];
}

const DRUM_ALIASES: Record<string, DrumKind> = {
  kick: "kick", bd: "kick", k: "kick",
  snare: "snare", snr: "snare", sn: "snare", sd: "snare",
  clap: "clap", cp: "clap", claps: "clap",
  hat: "hat", hats: "hat", ch: "hat", hh: "hat", hihat: "hat",
  openhat: "openhat", oh: "openhat", open: "openhat",
  tom: "tom", toms: "tom",
  perc: "perc", percussion: "perc", rim: "perc",
  ride: "ride",
};

const DRUM_CHARS = /^[xX\-_.\s|]+$/;
const NOTE_RE = /^[A-Ga-g](#|b)?\d?$/;
const WAVES: Record<string, string> = {
  sine: "sine", sin: "sine", tri: "triangle", triangle: "triangle",
  saw: "sawtooth", sawtooth: "sawtooth", sq: "square", square: "square", pwm: "pwm",
};

function parseNoteToken(tok: string, line: number, errors: ParseError[]): string | null {
  if (tok === "." || tok === "-" || tok === "_") return null;
  if (!NOTE_RE.test(tok)) {
    errors.push({ line, message: `"${tok}" is not a note — use A–G with optional #/b and octave, e.g. Eb2 or F#4` });
    return null;
  }
  const upper = tok.charAt(0).toUpperCase() + tok.slice(1);
  return /\d$/.test(upper) ? upper : upper + "4";
}

function parseOptions(rest: string, t: NoteTrack, line: number, errors: ParseError[]) {
  const tokens = rest.trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (WAVES[tok]) { t.wave = WAVES[tok]; continue; }
    if (tok === "chord") { t.chord = true; continue; }
    const val = tokens[i + 1];
    const needVal = () => {
      if (val === undefined) {
        errors.push({ line, message: `option "${tok}" needs a value` });
        return false;
      }
      i++;
      return true;
    };
    switch (tok) {
      case "cut": {
        if (!needVal()) break;
        const m = /^(\d+(?:\.\d+)?)(?:\.\.(\d+(?:\.\d+)?))?$/.exec(val!);
        if (!m) errors.push({ line, message: `bad cut value "${val}" — use cut 400 or cut 120..1800` });
        else { t.cutA = parseFloat(m[1]); if (m[2]) t.cutB = parseFloat(m[2]); }
        break;
      }
      case "res": {
        if (needVal()) t.res = parseFloat(val!);
        break;
      }
      case "delay": {
        if (!needVal()) break;
        const frac = /^(\d+)\/(\d+)$/.exec(val!);
        if (frac) {
          const denom = parseInt(frac[2], 10);
          if (denom === 0) errors.push({ line, message: "delay division cannot be /0" });
          else t.delay = parseInt(frac[1], 10) * (4 / denom); // 3/8 → 1.5 beats
        } else if (/^\d*\.?\d+$/.test(val!)) {
          t.delay = parseFloat(val!);
        } else {
          errors.push({ line, message: `bad delay value "${val}" — use 3/8 (musical) or 0.75 (beats)` });
        }
        break;
      }
      case "decay": {
        if (needVal()) t.decay = parseFloat(val!);
        break;
      }
      case "vol": {
        if (needVal()) t.vol = Math.max(0, Math.min(1, parseFloat(val!)));
        break;
      }
      default:
        errors.push({ line, message: `unknown option "${tok}" — see DOCS for sq/saw/tri/sine, cut, res, delay, decay, vol, chord` });
    }
  }
}

export function parseProgram(src: string): Program {
  const errors: ParseError[] = [];
  const tracks: Track[] = [];
  let bpm = 126;
  let swing = 0;

  src.split("\n").forEach((raw, idx) => {
    const line = idx + 1;
    const text = raw.trim();
    if (!text || text.startsWith("//")) return;

    const global = /^(bpm|swing)\s+(\S+)$/.exec(text);
    if (global) {
      const v = parseFloat(global[2]);
      if (Number.isNaN(v)) {
        errors.push({ line, message: `${global[1]} needs a number` });
        return;
      }
      if (global[1] === "bpm") {
        if (v < 40 || v > 260) errors.push({ line, message: `bpm ${v} out of range (40–260)` });
        else bpm = v;
      } else {
        if (v < 0 || v > 1) errors.push({ line, message: "swing must be 0–1 (try 0.12)" });
        else swing = v;
      }
      return;
    }

    const m = /^([A-Za-z][\w]*)\s*:\s*(.+)$/.exec(text);
    if (!m) {
      errors.push({ line, message: `can't read this line — expected "bpm 128" or "trackname: pattern"` });
      return;
    }
    const name = m[1];
    const body = m[2];
    const alias = name.toLowerCase();

    // -------- drum lane --------
    if (DRUM_ALIASES[alias] || DRUM_CHARS.test(body)) {
      const steps = body.replace(/[|\s]/g, "");
      if (!/^[xX\-_.]+$/.test(steps)) {
        errors.push({ line, message: `drum lane "${name}" has unexpected characters — use x X - and .` });
        return;
      }
      if (steps.length !== 16 && steps.length !== 32) {
        errors.push({ line, message: `"${name}" is ${steps.length} steps — drums need exactly 16 or 32 (one or two bars)` });
        return;
      }
      if (steps.replace(/-/g, "").length === 0) return; // fully muted lane — skip silently
      tracks.push({ kind: "drum", name, drum: DRUM_ALIASES[alias] ?? "perc", steps });
      return;
    }

    // -------- melodic lane --------
    const bracket = /\[([^\]]*)\]/.exec(body);
    if (!bracket) {
      errors.push({ line, message: `"${name}": wrap the note sequence in [ ], e.g. [C1 . Eb1 G1]` });
      return;
    }
    const notes = bracket[1].trim().split(/\s+/).filter(Boolean)
      .map((tok) => parseNoteToken(tok, line, errors));
    if (notes.length === 0) {
      errors.push({ line, message: `"${name}": the [ ] sequence is empty` });
      return;
    }
    if (notes.length > 64) {
      errors.push({ line, message: `"${name}": sequence too long (max 64 steps)` });
      return;
    }
    const t: NoteTrack = {
      kind: "notes", name, notes, wave: "square", vol: 0.7,
    };
    parseOptions(body.slice(bracket.index + bracket[0].length), t, line, errors);
    tracks.push(t);
  });

  return { bpm, swing, tracks, errors };
}

/* ------------------------------ note utils ------------------------------ */

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function noteToMidi(note: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(note);
  if (!m) return 60;
  let pc = SEMI[m[1] as keyof typeof SEMI];
  if (m[2] === "#") pc += 1;
  if (m[2] === "b") pc -= 1;
  return (parseInt(m[3], 10) + 1) * 12 + pc;
}

export function midiToNote(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${NAMES[pc]}${oct}`;
}

/* --------------------------- track color hashing --------------------------- */

export const TRACK_PALETTE = [
  "#ff5c5c", "#ffb454", "#b8f05a", "#2de0c8",
  "#38c8f0", "#9bb0ff", "#ff4d9e", "#f2e86d",
];

export function trackColor(name: string): string {
  const known: Record<string, string> = {
    kick: "#ff5c5c", snare: "#ffb454", clap: "#ffd27f", hat: "#38c8f0",
    openhat: "#7fdcf5", oh: "#7fdcf5", ride: "#8ca0b8", tom: "#f2a06d",
    perc: "#b8f05a", bass: "#2de0c8", acid: "#b8f05a", lead: "#ff4d9e",
    stab: "#ff84bf", pad: "#9bb0ff", arp: "#38c8f0", keys: "#ffd27f",
  };
  if (known[name.toLowerCase()]) return known[name.toLowerCase()];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TRACK_PALETTE[h % TRACK_PALETTE.length];
}

/* ------------------------------ highlighter ------------------------------ */

export interface Tok { cls: string; text: string; color?: string }

/** Tokenize one source line for the editor overlay. Never throws. */
export function tokenizeLine(line: string): Tok[] {
  const out: Tok[] = [];
  const push = (cls: string, text: string, color?: string) => { if (text) out.push({ cls, text, color }); };

  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) { push("tk-com", line); return out; }
  const leading = line.length - line.trimStart().length;
  if (leading) push("tk-plain", line.slice(0, leading));
  const body = line.slice(leading);

  const g = /^(bpm|swing)(\s+)([\d.]+)(.*)$/.exec(body);
  if (g) {
    push("tk-glob", g[1]); push("tk-plain", g[2]); push("tk-num", g[3]);
    push(g[4] ? "tk-bad" : "tk-plain", g[4]);
    return out;
  }

  const m = /^([A-Za-z][\w]*)(\s*:\s*)(.*)$/.exec(body);
  if (!m) { push(line.trim() ? "tk-bad" : "tk-plain", body); return out; }

  const color = trackColor(m[1]);
  push("tk-name", m[1], color);
  push("tk-punc", m[2]);
  const rest = m[3];

  if (DRUM_CHARS.test(rest) && /[xX\-_.]/.test(rest)) {
    for (const ch of rest) {
      if (ch === "x") push("tk-drum-hit", ch);
      else if (ch === "X") push("tk-drum-acc", ch);
      else if (ch === ".") push("tk-drum-soft", ch);
      else if (ch === "|") push("tk-bar", ch);
      else push("tk-rest", ch);
    }
    return out;
  }

  // melodic: scan brackets / keywords / notes / numbers (keywords before notes
  // so "cut"/"decay" aren't read as note letters)
  const re = /(\[|\])|(triangle|sawtooth|sine|square|sin|tri|saw|sq|pwm|cut|res|delay|decay|vol|chord)\b|([A-Ga-g](?:#|b)?\d?)|(\d+(?:\.\d+)?(?:\.\.\d+(?:\.\d+)?)?)|(\s+)|(.)/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(rest))) {
    if (mm[1]) push("tk-punc", mm[1]);
    else if (mm[2]) push("tk-kw", mm[2]);
    else if (mm[3]) push(mm[3] === "." ? "tk-rest" : "tk-note", mm[3]);
    else if (mm[4]) push("tk-num", mm[4]);
    else if (mm[5]) push("tk-plain", mm[5]);
    else push("tk-punc", mm[6]);
  }
  return out;
}
