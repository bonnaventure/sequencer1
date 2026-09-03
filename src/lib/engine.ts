import * as Tone from "tone";
import type { Program, Track, NoteTrack, DrumKind } from "./dsl";

interface Voice {
  trigger: (accent: boolean, time: number) => void;
  dispose: () => void;
}

function noiseVoice(dest: Tone.ToneAudioNode, opts: { decay: number; freq: number; type: BiquadFilterType; volume: number }): Voice {
  const s = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: opts.decay, sustain: 0, release: opts.decay * 0.6 } });
  s.volume.value = opts.volume;
  const f = new Tone.Filter(opts.freq, opts.type);
  s.connect(f).connect(dest);
  return { trigger: (_, t) => s.triggerAttackRelease("32n", t), dispose: () => { s.dispose(); f.dispose(); } };
}

function buildDrum(kind: DrumKind, dest: Tone.ToneAudioNode): Voice {
  switch (kind) {
    case "kick": {
      const s = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 7, oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.2 } });
      s.volume.value = -1.5;
      s.connect(dest);
      return { trigger: (_, t) => s.triggerAttackRelease("C1", "8n", t), dispose: () => s.dispose() };
    }
    case "snare": {
      const noise = noiseVoice(dest, { decay: 0.16, freq: 1700, type: "bandpass", volume: -7 });
      const body = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.05 } });
      body.volume.value = -11;
      body.connect(dest);
      return { trigger: (_, t) => { noise.trigger(false, t); body.triggerAttackRelease("G2", "32n", t); }, dispose: () => { noise.dispose(); body.dispose(); } };
    }
    case "hat": return noiseVoice(dest, { decay: 0.045, freq: 7600, type: "highpass", volume: -15 });
    case "clap": return noiseVoice(dest, { decay: 0.2, freq: 1200, type: "bandpass", volume: -8 });
  }
}

function buildNotes(t: NoteTrack, dest: Tone.ToneAudioNode): { fire: (step: number, time: number) => void; dispose: () => void } {
  const gain = new Tone.Gain(Math.max(0.001, t.vol));
  const pan = new Tone.Panner(0);
  gain.connect(pan).connect(dest);

  const synth = new Tone.Synth({ oscillator: { type: t.wave as "sine" | "square" | "sawtooth" | "triangle" }, envelope: { attack: 0.004, decay: 0.24, sustain: 0.18, release: 0.14 } });
  synth.volume.value = -7;
  synth.connect(gain);

  return {
    fire: (step, time) => {
      const note = t.notes[step % t.notes.length];
      if (!note) return;
      synth.triggerAttackRelease(note, Tone.Time("16n").toSeconds() * 0.94, time);
    },
    dispose: () => { gain.dispose(); pan.dispose(); synth.dispose(); },
  };
}

export class PulseEngine {
  ready = false;
  onStep: ((step: number) => void) | null = null;
  private bus!: Tone.Gain;
  private master!: Tone.Gain;
  private built: { fire: (step: number, time: number) => void; dispose: () => void }[] = [];
  private stepCount = 0;
  private loopId: number | null = null;

  async unlock(): Promise<void> { await Tone.start(); if (!this.ready) { this.bus = new Tone.Gain(1); this.master = new Tone.Gain(0.8); this.bus.connect(this.master).toDestination(); this.ready = true; } }

  get running(): boolean { return Tone.getTransport().state === "started"; }
  get sampleRate(): number { return 48000; }

  loadProgram(p: Program) {
    if (!this.ready) return;
    const old = this.built;
    setTimeout(() => old.forEach((b) => b.dispose()), 100);
    this.built = [];
    Tone.getTransport().bpm.value = p.bpm;

    p.tracks.forEach((t) => {
      const send = new Tone.Gain(1);
      const pan = new Tone.Panner(0);
      send.connect(pan).connect(this.bus);
      if (t.kind === "drum") {
        const voice = buildDrum(t.drum, send);
        this.built.push({ fire: (s, time) => { if (t.steps[s % t.steps.length] === "x") voice.trigger(false, time); }, dispose: () => { voice.dispose(); send.dispose(); pan.dispose(); } });
      } else {
        const n = buildNotes(t, send);
        this.built.push({ ...n, dispose: () => { n.dispose(); send.dispose(); pan.dispose(); } });
      }
    });
    this.stepCount = 0;
    this.onStep?.(-1);
  }

  async play(): Promise<void> {
    await this.unlock();
    const Transport = Tone.getTransport();
    if (Transport.state === "started") return;
    if (this.loopId !== null) Transport.clear(this.loopId);
    this.loopId = Transport.scheduleRepeat((time) => {
      const s = this.stepCount++;
      for (const b of this.built) try { b.fire(s, time); } catch {}
      Tone.Draw.schedule(() => this.onStep?.(s % 16), time);
    }, "16n");
    Transport.start("+0.06");
  }

  stop() {
    const Transport = Tone.getTransport();
    Transport.stop();
    Transport.position = 0;
    this.stepCount = 0;
    this.onStep?.(-1);
  }

  setBpm(v: number) { Tone.getTransport().bpm.rampTo(Math.max(40, Math.min(260, v)), 0.08); }
  setVolume(v: number) { if (this.ready) this.master.gain.rampTo(Math.max(0, Math.min(1, v)), 0.05); }
}
