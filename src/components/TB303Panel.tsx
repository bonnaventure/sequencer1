import { useCallback, useEffect, useRef, useState } from "react";
import type { Program, Track, DrumTrack, NoteTrack } from "../lib/dsl";
import { PulseEngine } from "../lib/engine";

// Visual design tokens
const COLORS = {
  panelSilver: "#d8d6d1",
  panelGradientTop: "#e8e6e1",
  panelGradientBottom: "#c9c7c2",
  deckWell: "#efece4",
  buttonBeige: "#d9d3c2",
  buttonBeigeDark: "#c4bfb0",
  knobMetal: "#b9b8b4",
  knobDark: "#6e6d6a",
  ledOff: "#5a1414",
  ledOn: "#e8261c",
  inkBlack: "#141414",
  accentOrange: "#d94e1f",
  blackChip: "#1a1a1a",
  whiteKey: "#f4f2ec",
  blackKey: "#26262a",
  blackKeyCap: "#b9b7b2",
};

interface TB303PanelProps {
  engine: PulseEngine;
}

export default function TB303Panel({ engine }: TB303PanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [tempo, setTempo] = useState(120);
  const [volume, setVolume] = useState(0.8);
  const [tuning, setTuning] = useState(50);
  const [cutoff, setCutoff] = useState(50);
  const [resonance, setResonance] = useState(50);
  const [envMod, setEnvMod] = useState(50);
  const [decay, setDecay] = useState(50);
  const [accent, setAccent] = useState(0);
  
  // Pattern state - 16 steps, each can have a note or rest
  const [pattern, setPattern] = useState<(string | null)[]>([
    "C1", null, "D#1", null, "F1", null, "G1", null,
    "A#1", null, "C2", null, "D#2", null, "F2", null
  ]);
  
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [writeMode, setWriteMode] = useState(false);
  const [pitchMode, setPitchMode] = useState(false);
  const [slideActive, setSlideActive] = useState(false);
  const [accentActive, setAccentActive] = useState(false);

  // Keyboard layout - 13 white keys (C to C), 5 black keys
  const whiteNotes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C2"];
  const blackNotePositions = [1, 2, 4, 5, 6]; // positions between white keys where black keys sit
  
  useEffect(() => {
    engine.onStep = (step) => {
      setCurrentStep(step);
      if (step >= 0 && pattern[step % 16]) {
        // Note would be triggered here by engine
      }
    };
    
    return () => {
      engine.onStep = null;
    };
  }, [engine, pattern]);

  const handleRunStop = useCallback(async () => {
    await engine.unlock();
    if (isRunning) {
      engine.stop();
      setIsRunning(false);
    } else {
      await engine.play();
      setIsRunning(true);
    }
  }, [engine, isRunning]);

  const handleTempoChange = useCallback((value: number) => {
    setTempo(value);
    engine.setBpm(value);
  }, [engine]);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    engine.setVolume(value);
  }, [engine]);

  const handleStepClick = useCallback((stepIndex: number) => {
    if (writeMode) {
      setPattern(prev => {
        const newPattern = [...prev];
        if (selectedStep !== null && selectedStep < 16) {
          // Insert note at selected step
          newPattern[stepIndex] = pitchMode ? whiteNotes[Math.floor(selectedStep / 2)] : "C1";
        } else {
          // Toggle current step
          newPattern[stepIndex] = newPattern[stepIndex] ? null : "C1";
        }
        return newPattern;
      });
    } else {
      setSelectedStep(stepIndex);
    }
  }, [writeMode, selectedStep, pitchMode]);

  const handleKeyClick = useCallback((note: string, isBlack: boolean) => {
    if (selectedStep !== null && selectedStep < 16) {
      setPattern(prev => {
        const newPattern = [...prev];
        newPattern[selectedStep] = note;
        return newPattern;
      });
    }
  }, [selectedStep]);

  const handleClear = useCallback(() => {
    setPattern(Array(16).fill(null));
  }, []);

  const Knob = ({ label, value, onChange, small = false, ticks = false }: { 
    label: string; 
    value: number; 
    onChange: (v: number) => void;
    small?: boolean;
    ticks?: boolean;
  }) => {
    const rotation = (value / 100) * 270 - 135;
    const size = small ? "w-10 h-10" : "w-16 h-16";
    
    return (
      <div className="flex flex-col items-center gap-1">
        <div 
          className={`${size} rounded-full relative cursor-pointer select-none`}
          style={{
            background: `radial-gradient(circle at 35% 30%, #f4f4f2, ${COLORS.knobMetal} 55%, ${COLORS.knobDark} 75%)`,
            boxShadow: "0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)"
          }}
          onClick={(e) => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const y = e.clientY - rect.top - rect.height / 2;
            const newValue = Math.max(0, Math.min(100, Math.round(50 - (y / (rect.height / 2)) * 50)));
            onChange(newValue);
          }}
        >
          {/* Tick marks */}
          {ticks && (
            <>
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-0.5 h-1.5 bg-gray-800"
                  style={{
                    left: "50%",
                    top: "4px",
                    transformOrigin: "50% calc(50% - 4px)",
                    transform: `translateX(-50%) rotate(${(i / 8) * 270 - 135}deg)`
                  }}
                />
              ))}
            </>
          )}
          
          {/* Pointer */}
          <div
            className="absolute w-1 h-3 bg-gray-900 rounded-full"
            style={{
              left: "50%",
              top: "8px",
              transformOrigin: "50% calc(50% - 8px)",
              transform: `translateX(-50%) rotate(${rotation}deg)`
            }}
          />
        </div>
        <span className="text-[8px] uppercase tracking-tight text-gray-800 text-center leading-tight">{label}</span>
      </div>
    );
  };

  const LED = ({ lit, blink = false }: { lit: boolean; blink?: boolean }) => (
    <div
      className={`w-2 h-2 rounded-full transition-all duration-75 ${blink && lit ? "animate-pulse" : ""}`}
      style={{
        background: lit 
          ? COLORS.ledOn 
          : `radial-gradient(${COLORS.ledOff}, #3a0d0d)`,
        boxShadow: lit ? `0 0 6px 2px rgba(232,38,28,0.6)` : "none"
      }}
    />
  );

  const BeigeButton = ({ 
    children, 
    onClick, 
    active = false,
    small = false
  }: { 
    children: React.ReactNode; 
    onClick?: () => void;
    active?: boolean;
    small?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`${small ? "px-2 py-1 text-[9px]" : "px-3 py-2 text-[10px]"} font-bold uppercase tracking-wide select-none`}
      style={{
        background: active ? COLORS.buttonBeigeDark : COLORS.buttonBeige,
        border: "none",
        borderRadius: "2px",
        boxShadow: active
          ? "inset 0 1px 0 rgba(0,0,0,0.2), inset 0 -1px 0 rgba(255,255,255,0.1)"
          : "inset 0 1px 0 #fff, inset 0 -2px 0 rgba(0,0,0,0.25), 0 2px 3px rgba(0,0,0,0.35)",
        transform: active ? "translateY(1px)" : "none",
      }}
    >
      {children}
    </button>
  );

  return (
    <div 
      className="w-full max-w-6xl mx-auto p-4 select-none"
      style={{ aspectRatio: "1.85 / 1" }}
    >
      {/* Main Panel */}
      <div
        className="w-full h-full rounded-lg relative overflow-hidden"
        style={{
          background: `linear-gradient(${COLORS.panelGradientTop}, ${COLORS.panelGradientBottom})`,
          backgroundImage: `
            linear-gradient(${COLORS.panelGradientTop}, ${COLORS.panelGradientBottom}),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 3px)
          `,
          boxShadow: "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)"
        }}
      >
        {/* Band 1: Jack Silkscreen Strip (0-6%) */}
        <div className="absolute top-0 left-0 right-0 h-[6%] flex justify-between items-center px-8 pt-1">
          <div className="flex gap-4 text-[7px] uppercase tracking-wider text-gray-700">
            <span>MIDI IN</span>
            <span>WAVEFORM ▲▼</span>
            <span>SYNC IN</span>
          </div>
          <div className="flex gap-4 text-[7px] uppercase tracking-wider text-gray-700">
            <span>CV</span>
            <span>GATE</span>
            <span>HEADPHONE</span>
            <span>OUTPUT</span>
            <span>DC IN</span>
          </div>
        </div>

        {/* Band 2: Logo + Small Knobs (6-20%) */}
        <div className="absolute top-[6%] left-0 right-0 h-[14%] flex items-center px-6">
          {/* Roland Logo */}
          <svg className="h-6 w-auto" viewBox="0 0 100 30">
            <text x="0" y="20" fontFamily="Arial Black" fontSize="18" fill="#000">Roland</text>
          </svg>
          
          {/* Six Small Knobs */}
          <div className="flex-1 flex justify-center gap-3">
            <Knob label="TUNING" value={tuning} onChange={setTuning} small />
            <Knob label="CUTOFF" value={cutoff} onChange={setCutoff} small />
            <Knob label="RESONANCE" value={resonance} onChange={setResonance} small />
            <Knob label="ENV MOD" value={envMod} onChange={setEnvMod} small />
            <Knob label="DECAY" value={decay} onChange={setDecay} small />
            <Knob label="ACCENT" value={accent} onChange={setAccent} small />
          </div>
          
          {/* Bass Line Logo */}
          <div className="text-xl font-bold italic tracking-wide" style={{ color: COLORS.inkBlack }}>
            Bass Line
          </div>
        </div>

        {/* Band 3: Large Knobs (20-48%) */}
        <div className="absolute top-[20%] left-0 right-0 h-[28%] flex items-center px-6">
          {/* TEMPO Knob */}
          <div className="flex flex-col items-center">
            <Knob label="TEMPO" value={(tempo - 40) / 220 * 100} onChange={(v) => handleTempoChange(40 + (v / 100) * 220)} ticks />
            <div className="flex justify-between w-20 text-[6px] uppercase mt-1">
              <span>SLOW</span>
              <span>FAST</span>
            </div>
          </div>
          
          {/* TRACK/PATT GROUP Selector */}
          <div className="ml-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-2 border-gray-600 flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-6 bg-gray-800" style={{ transformOrigin: "bottom center", transform: "rotate(45deg)" }} />
              </div>
            </div>
            <span className="text-[7px] uppercase mt-1 text-center leading-tight">TRACK<br/>PATT.GROUP</span>
          </div>
          
          {/* MODE Selector */}
          <div className="ml-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-2 border-gray-600 flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-6 bg-gray-800" style={{ transformOrigin: "bottom center", transform: "rotate(-45deg)" }} />
              </div>
            </div>
            <span className="text-[7px] uppercase mt-1">MODE</span>
          </div>
          
          {/* VOLUME Knob */}
          <div className="ml-8 flex flex-col items-center">
            <Knob label="" value={volume * 100} onChange={handleVolumeChange} />
            <div className="flex justify-between w-20 text-[6px] uppercase mt-1">
              <span>OFF</span>
              <span>ON</span>
            </div>
            <span className="text-[7px] uppercase">VOLUME</span>
          </div>
          
          {/* Model Text */}
          <div className="ml-auto text-right">
            <div className="text-lg font-bold tracking-widest" style={{ color: COLORS.inkBlack }}>TB-303</div>
            <div className="text-[8px] uppercase tracking-wide" style={{ color: COLORS.inkBlack }}>Computer Controlled</div>
          </div>
        </div>

        {/* Band 4: Sequencer Deck (48-100%) */}
        <div
          className="absolute top-[48%] left-[2%] right-[2%] bottom-[2%] rounded"
          style={{
            background: COLORS.deckWell,
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.25)",
            borderTop: "1px solid rgba(0,0,0,0.1)"
          }}
        >
          <div className="grid grid-cols-5 gap-2 h-full p-2">
            
            {/* Column 1: Utility Buttons */}
            <div className="flex flex-col gap-2">
              <div className="border border-gray-600 p-1 flex flex-col items-center gap-1">
                <span className="text-[7px] uppercase text-center leading-tight">D.C.<br/>BAR RESET</span>
                <BeigeButton small>PATTERN CLEAR</BeigeButton>
              </div>
              <div className="border border-gray-600 p-1 flex flex-col items-center gap-1">
                <div className="flex items-center gap-1">
                  <LED lit={isRunning} blink />
                  <span className="text-[7px] uppercase">RUN</span>
                </div>
                <BeigeButton small onClick={handleRunStop}>RUN/STOP</BeigeButton>
                <span className="text-[6px] uppercase">BATTERY</span>
              </div>
            </div>
            
            {/* Column 2: Mode Buttons */}
            <div className="flex flex-col gap-2">
              <div className="bg-black p-1 flex flex-col items-center gap-1 rounded">
                <span className="text-[7px] uppercase text-white">PITCH MODE</span>
                <LED lit={pitchMode} />
                <BeigeButton small onClick={() => setPitchMode(!pitchMode)} active={pitchMode}>
                  {pitchMode ? "ON" : "OFF"}
                </BeigeButton>
              </div>
              <div className="bg-white border border-gray-400 p-1 flex flex-col items-center gap-1 rounded">
                <span className="text-[7px] uppercase">FUNCTION</span>
                <LED lit={!pitchMode} />
                <BeigeButton onClick={() => setPitchMode(false)} active={!pitchMode} small>
                  NORMAL
                </BeigeButton>
                <div className="flex gap-1 mt-1">
                  <span className="text-[6px] bg-black text-white px-1">BAR</span>
                  <span className="text-[6px] bg-orange-600 text-white px-1">PATTERN</span>
                </div>
              </div>
            </div>
            
            {/* Column 3: Piano Keyboard (Centerpiece) */}
            <div className="relative border border-black p-1">
              {/* Header strip with note names */}
              <div className="absolute top-0 left-0 right-0 h-[8%] bg-black flex">
                {whiteNotes.map((note, i) => (
                  <div key={i} className="flex-1 flex items-center justify-center text-[6px] text-white">
                    {note.replace(/[0-9]/g, "")}
                  </div>
                ))}
              </div>
              
              {/* Keyboard area */}
              <div className="absolute top-[8%] left-0 right-0 bottom-[15%] flex">
                {/* White keys */}
                {whiteNotes.map((note, i) => (
                  <button
                    key={`white-${i}`}
                    className="flex-1 mx-px border border-gray-400 relative"
                    style={{
                      background: COLORS.whiteKey,
                      borderBottomLeftRadius: "2px",
                      borderBottomRightRadius: "2px",
                      boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.2)"
                    }}
                    onClick={() => handleKeyClick(note, false)}
                  >
                    {/* LED for white key */}
                    <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2">
                      <LED lit={pattern[i] === note && selectedStep === i} />
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Black keys overlay */}
              <div className="absolute top-[8%] left-0 right-0 bottom-[15%] pointer-events-none">
                {blackNotePositions.map((pos, i) => {
                  const blackNote = whiteNotes[pos].replace("2", "#2");
                  return (
                    <button
                      key={`black-${i}`}
                      className="absolute w-[6%] h-[55%] pointer-events-auto"
                      style={{
                        left: `calc(${pos} * (100% / 13) - 3%)`,
                        background: `linear-gradient(${COLORS.blackKeyCap}, ${COLORS.blackKey})`,
                        borderBottomLeftRadius: "2px",
                        borderBottomRightRadius: "2px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.4)"
                      }}
                      onClick={() => handleKeyClick(blackNote, true)}
                    >
                      {/* LED for black key */}
                      <div className="absolute top-1 left-1/2 transform -translate-x-1/2">
                        <LED lit={false} />
                      </div>
                      {i < 2 && (
                        <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-[5px] text-white">
                          {i === 0 ? "DEL" : "INS"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Footer strip */}
              <div className="absolute bottom-[8%] left-0 right-0 h-[7%] bg-black flex items-center justify-center">
                <span className="text-[7px] text-orange-400 uppercase tracking-wider">PATTERN</span>
              </div>
              
              {/* Selector row */}
              <div className="absolute bottom-0 left-0 right-0 h-[8%] flex items-center justify-around">
                {[1, "DEL", 2, "INS", 3, 4, 5, 6, 7, 8].map((label, i) => (
                  <span key={i} className="text-[6px] text-white">
                    {typeof label === "number" ? label : label}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Column 4: Time Mode */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[7px] uppercase">TIME MODE</span>
                <LED lit={false} />
              </div>
              <div className="flex gap-1 justify-center">
                <span className="text-[8px]">♪</span>
                <span className="text-[8px]">♫</span>
                <span className="text-[8px]">♬</span>
              </div>
              <div className="flex flex-col gap-1">
                <BeigeButton small>TRANSPOSE ↓</BeigeButton>
                <BeigeButton small>TRANSPOSE ↑</BeigeButton>
                <BeigeButton small onClick={() => setAccentActive(!accentActive)} active={accentActive}>ACCENT</BeigeButton>
                <BeigeButton small onClick={() => setSlideActive(!slideActive)} active={slideActive}>SLIDE</BeigeButton>
              </div>
              <div className="mt-auto">
                <span className="text-[7px] uppercase">STEP</span>
                <div className="flex gap-1 mt-1">
                  <BeigeButton small>♪</BeigeButton>
                  <BeigeButton small>♫</BeigeButton>
                </div>
                <span className="text-[6px] uppercase text-orange-600 block mt-1">PATT. SECTION</span>
              </div>
            </div>
            
            {/* Column 5: Right Edge */}
            <div className="flex flex-col gap-2">
              <div className="border border-gray-600 p-1 flex flex-col items-center gap-1">
                <span className="text-[8px]">←</span>
                <BeigeButton small>BACK</BeigeButton>
              </div>
              <div className="border border-gray-600 p-1 flex flex-col items-center gap-1">
                <span className="text-[7px] bg-black text-white px-1">D.S.</span>
                <BeigeButton small>WRITE/NEXT</BeigeButton>
                <span className="text-[6px] uppercase">TAP</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
