import * as Tone from "tone";
import type { Program, Track, NoteTrack, DrumKind } from "./dsl";

interface Voice {
  trigger: (accent: boolean, time: number) => void;
  dispose: () => void;
}

interface BuiltTrack {
  track: Track;
  fire: (stepCount: number, time: number) => void;
  panic: () => void;
  dispose: () => void;
}

/** noise source → static filter → destination (type-safe across Tone versions) */
function noiseVoice(dest: Tone.ToneAudioNode, opts: {
  decay: number; freq: number; type: BiquadFilterType;
  volume: number; attackDur?: string; noiseType?: "white" | "pink";
}): Voice {
  const s = new Tone.NoiseSynth({
    noise: { type: opts.noiseType ?? "white" },
    envelope: { attack: 0.001, decay: opts.decay, sustain: 0, release: opts.decay * 0.6 },
  });
  s.volume.value = opts.volume;
  const f = new Tone.Filter(opts.freq, opts.type);
  s.connect(f);
  f.connect(dest);
  return {
    trigger: (acc, t) => s.triggerAttackRelease(opts.attackDur ?? "32n", t, acc ? 1 : 0.78),
    dispose: () => { s.dispose(); f.dispose(); },
  };
}

/* ------------------------------- drum voices ------------------------------- */

function buildDrum(kind: DrumKind, dest: Tone.ToneAudioNode): Voice {
  switch (kind) {
    case "kick": {
      const s = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 7, oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.42, sustain: 0.01, release: 1.2, attackCurve: "exponential" },
      });
      s.volume.value = -1.5;
      s.connect(dest);
      return {
        trigger: (acc, t) => s.triggerAttackRelease(acc ? "D1" : "C1", "8n", t, acc ? 1 : 0.88),
        dispose: () => s.dispose(),
      };
    }
    case "snare": {
      const noise = noiseVoice(dest, { decay: 0.16, freq: 1700, type: "bandpass", volume: -7 });
      const body = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.05 },
      });
      body.volume.value = -11;
      body.connect(dest);
      return {
        trigger: (acc, t) => {
          noise.trigger(acc, t);
          body.triggerAttackRelease(acc ? "A2" : "G2", "32n", t, 0.7);
        },
        dispose: () => { noise.dispose(); body.dispose(); },
      };
    }
    case "clap":
      return noiseVoice(dest, { decay: 0.2, freq: 1200, type: "bandpass", volume: -8, noiseType: "pink", attackDur: "16n" });
    case "hat":
      return noiseVoice(dest, { decay: 0.045, freq: 7600, type: "highpass", volume: -15, attackDur: "64n" });
    case "openhat":
      return noiseVoice(dest, { decay: 0.34, freq: 7000, type: "highpass", volume: -17, attackDur: "16n" });
    case "ride":
      return noiseVoice(dest, { decay: 0.4, freq: 8800, type: "highpass", volume: -21, attackDur: "32n" });
    case "tom": {
      const s = new Tone.MembraneSynth({
        pitchDecay: 0.03, octaves: 3.5, oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.32, sustain: 0.01, release: 0.4 },
      });
      s.volume.value = -8;
      s.connect(dest);
      return {
        trigger: (acc, t) => s.triggerAttackRelease(acc ? "A1" : "G1", "16n", t, acc ? 1 : 0.8),
        dispose: () => s.dispose(),
      };
    }
    case "perc": {
      const s = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.06 },
      });
      s.volume.value = -14;
      s.connect(dest);
      return {
        trigger: (acc, t) => s.triggerAttackRelease(acc ? "C5" : "G4", "64n", t, acc ? 1 : 0.7),
        dispose: () => s.dispose(),
      };
    }
  }
}

/* ------------------------------- note voices ------------------------------- */

function buildNotes(t: NoteTrack, dest: Tone.ToneAudioNode, bpm: number): BuiltTrack {
  const nodes: { dispose: () => void }[] = [];

  const gain = new Tone.Gain(Math.max(0.001, t.vol));
  const pan = new Tone.Panner(0);
  gain.connect(pan);
  pan.connect(dest);
  nodes.push(gain, pan);

  if (t.delay && t.delay > 0) {
    const secs = Math.max(0.03, (60 / bpm) * t.delay);
    const delay = new Tone.FeedbackDelay(secs, 0.34);
    delay.wet.value = 0.42;
    pan.connect(delay);
    delay.connect(dest);
    nodes.push(delay);
  }

  let panic = () => {};

  if (t.chord) {
    const poly = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: t.wave === "square" ? "triangle" : (t.wave as "sine" | "triangle" | "sawtooth") },
      envelope: {
        attack: Math.min(1.6, (t.decay ?? 4) * 0.22),
        decay: 1.8, sustain: 0.55,
        release: Math.min(4, t.decay ?? 2.5),
      },
    });
    poly.volume.value = -9;
    poly.connect(gain);
    nodes.push(poly);
    panic = () => poly.releaseAll();
    return {
      track: t,
      fire: (stepCount, time) => {
        const idx = stepCount % t.notes.length;
        if (idx !== 0) return;
        const chordNotes = t.notes.filter((n): n is string => n !== null);
        if (!chordNotes.length) return;
        const dur = t.notes.length * Tone.Time("16n").toSeconds() * 0.98;
        poly.triggerAttackRelease(chordNotes, Math.max(0.1, dur), time, 0.5);
      },
      panic,
      dispose: () => nodes.forEach((n) => n.dispose()),
    };
  }

  const cutA = t.cutA ?? 600;
  const cutB = t.cutB;
  const mono = new Tone.MonoSynth({
    oscillator: { type: (t.wave as "sine" | "triangle" | "sawtooth" | "square" | "pwm") ?? "square" },
    envelope: { attack: 0.004, decay: Math.min(1.5, t.decay ?? 0.24), sustain: 0.18, release: 0.14 },
    filter: { rolloff: -24, Q: t.res ?? 1 },
    filterEnvelope: {
      attack: 0.004, decay: 0.16, sustain: 0.3, release: 0.18,
      baseFrequency: cutA,
      octaves: cutB ? Math.max(0.4, Math.log2(Math.max(cutB, cutA + 20) / cutA)) : 2.6,
    },
  });
  mono.volume.value = -7;
  mono.connect(gain);
  nodes.push(mono);
  panic = () => mono.triggerRelease();

  return {
    track: t,
    fire: (stepCount, time) => {
      const idx = stepCount % t.notes.length;
      const note = t.notes[idx];
      if (!note) return;
      const dur = Tone.Time("16n").toSeconds() * 0.94;
      mono.triggerAttackRelease(note, dur, time, 0.85);
    },
    panic,
    dispose: () => nodes.forEach((n) => n.dispose()),
  };
}

/* --------------------------------- engine --------------------------------- */

export class PulseEngine {
  ready = false;
  onStep: ((step: number) => void) | null = null;

  private bus!: Tone.Gain;
  private master!: Tone.Gain;
  private masterFilter!: Tone.Filter;
  private verb!: Tone.Freeverb;
  private wave!: Tone.Analyser;
  private fft!: Tone.Analyser;
  private built: BuiltTrack[] = [];
  private stepCount = 0;
  private loopId: number | null = null;
  private swingVal = 0;

  private ensureGraph() {
    if (this.ready) return;
    this.bus = new Tone.Gain(1);
    this.masterFilter = new Tone.Filter(18500, "lowpass");
    const comp = new Tone.Compressor(-14, 4.5);
    this.master = new Tone.Gain(0.8);
    this.verb = new Tone.Freeverb({ roomSize: 0.72, dampening: 5200 });
    this.verb.wet.value = 1; // parallel send — bus already carries the dry path

    this.bus.connect(this.masterFilter);
    this.masterFilter.connect(comp);
    comp.connect(this.master);
    this.master.toDestination();

    this.bus.connect(this.verb);
    this.verb.connect(this.masterFilter);

    this.wave = new Tone.Analyser("waveform", 2048);
    this.fft = new Tone.Analyser("fft", 64);
    this.bus.connect(this.wave);
    this.bus.connect(this.fft);

    Tone.getTransport().swingSubdivision = "16n";
    this.ready = true;
  }

  async unlock(): Promise<void> {
    await Tone.start();
    this.ensureGraph();
  }

  get running(): boolean {
    return Tone.getTransport().state === "started";
  }

  get sampleRate(): number {
    try { return (Tone.getContext() as unknown as { sampleRate: number }).sampleRate || 48000; }
    catch { return 48000; }
  }

  loadProgram(p: Program) {
    this.ensureGraph();
    // retire old voices softly so tails ring out instead of clicking
    const old = this.built;
    old.forEach((b) => { try { b.panic(); } catch { /* noop */ } });
    setTimeout(() => old.forEach((b) => { try { b.dispose(); } catch { /* noop */ } }), 450);

    this.built = [];
    const Transport = Tone.getTransport();
    Transport.bpm.value = p.bpm;
    this.swingVal = p.swing;
    Transport.swing = p.swing;

    p.tracks.forEach((t, i) => {
      const send = new Tone.Gain(1);
      const pan = new Tone.Panner(((i % 5) - 2) * 0.16);
      send.connect(pan);
      pan.connect(this.bus);

      if (t.kind === "drum") {
        const voice = buildDrum(t.drum, send);
        const len = t.steps.length;
        this.built.push({
          track: t,
          fire: (stepCount, time) => {
            const ch = t.steps[stepCount % len];
            if (ch === "x" || ch === "X") voice.trigger(ch === "X", time);
          },
          panic: () => {},
          dispose: () => { voice.dispose(); send.dispose(); pan.dispose(); },
        });
      } else {
        const b = buildNotes(t, send, p.bpm);
        this.built.push({
          ...b,
          dispose: () => { b.dispose(); send.dispose(); pan.dispose(); },
        });
      }
    });

    if (!this.running) {
      this.stepCount = 0;
      this.onStep?.(-1);
    }
  }

  async play(): Promise<void> {
    await this.unlock();
    const Transport = Tone.getTransport();
    if (Transport.state === "started") return;
    Transport.swing = this.swingVal;
    if (this.loopId !== null) Transport.clear(this.loopId);
    this.loopId = Transport.scheduleRepeat((time) => {
      const s = this.stepCount++;
      for (const b of this.built) {
        try { b.fire(s, time); } catch { /* voice error — keep the groove */ }
      }
      Tone.Draw.schedule(() => this.onStep?.(s % 32), time);
    }, "16n");
    Transport.start("+0.06");
  }

  stop() {
    const Transport = Tone.getTransport();
    Transport.stop();
    Transport.position = 0;
    this.built.forEach((b) => { try { b.panic(); } catch { /* noop */ } });
    this.stepCount = 0;
    this.onStep?.(-1);
  }

  setBpm(v: number) { Tone.getTransport().bpm.rampTo(Math.max(40, Math.min(260, v)), 0.08); }
  setSwing(v: number) {
    this.swingVal = v;
    Tone.getTransport().swing = v;
  }
  setVolume(v: number) { if (this.ready) this.master.gain.rampTo(Math.max(0, Math.min(1, v)), 0.05); }
  setCutoff(v: number) { if (this.ready) this.masterFilter.frequency.rampTo(v, 0.05); }

  getWaveform(): Float32Array {
    if (!this.ready) return new Float32Array(1024);
    return this.wave.getValue() as Float32Array;
  }
  getFFT(): Float32Array {
    if (!this.ready) return new Float32Array(64);
    return this.fft.getValue() as Float32Array;
  }
}
