import { useEffect, useRef } from "react";
import type { PulseEngine } from "../lib/engine";

interface ScopeProps {
  engine: PulseEngine;
  isPlaying: boolean;
}

export default function Scope({ engine, isPlaying }: ScopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // graticule
      ctx.strokeStyle = "rgba(120,150,190,0.09)";
      ctx.lineWidth = 1;
      const cols = 12;
      for (let i = 1; i < cols; i++) {
        const x = (w / cols) * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      // center line
      ctx.strokeStyle = "rgba(120,150,190,0.18)";
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

      const playing = playingRef.current;

      // ---- FFT bars ----
      const fft = engine.getFFT();
      const n = fft.length;
      const bw = w / n;
      for (let i = 0; i < n; i++) {
        let mag = playing ? (fft[i] + 100) / 100 : 0;
        if (!playing) mag = 0.02 + 0.015 * Math.sin(now / 900 + i * 0.7);
        mag = Math.max(0, Math.min(1, mag));
        const bh = mag * h * 0.92;
        const hue = i / n;
        ctx.fillStyle = playing
          ? `rgba(255, 77, 158, ${0.10 + hue * 0.28})`
          : "rgba(255, 77, 158, 0.05)";
        ctx.fillRect(i * bw + 1, h - bh, Math.max(1, bw - 2), bh);
      }

      // ---- waveform ----
      const data = engine.getWaveform();
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = playing ? "#2de0c8" : "rgba(45,224,200,0.5)";
      ctx.shadowColor = "rgba(45,224,200,0.55)";
      ctx.shadowBlur = playing ? 14 : 6;
      ctx.beginPath();
      const len = data.length;
      for (let i = 0; i < len; i++) {
        let v = data[i];
        if (!playing) v = Math.sin(i / len * Math.PI * 6 + now / 700) * 0.03;
        const x = (i / (len - 1)) * w;
        const y = h / 2 - v * (h / 2) * 0.92;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [engine]);

  return (
    <section className="panel flex h-48 flex-none flex-col rise-in" style={{ animationDelay: "220ms" }}>
      <header className="panel-head">
        <span className={`tick ${isPlaying ? "bg-blaze-400" : "bg-mist-500"}`} />
        <span className="panel-title">Master Bus · Scope</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? "bg-blaze-400 led-run" : "bg-mist-600"}`} />
          <span className="font-mono text-[9px] tracking-widest text-mist-500">{isPlaying ? "LIVE" : "IDLE"}</span>
        </span>
      </header>
      <div className="min-h-0 flex-1 p-1.5">
        <canvas ref={canvasRef} className="h-full w-full rounded-md bg-ink-950/60" />
      </div>
    </section>
  );
}
