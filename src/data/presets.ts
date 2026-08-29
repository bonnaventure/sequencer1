export interface Preset {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  color: string;
  blurb: string;
  code: string;
}

export const PRESETS: Preset[] = [
  {
    id: "warehouse",
    name: "Warehouse Techno",
    genre: "TECHNO",
    bpm: 132,
    color: "#ff5c5c",
    blurb: "Four-on-the-floor kick, rolling 16th bass, sparse stabs in the space.",
    code: `// WAREHOUSE TECHNO — rolling 16ths, 909-style
bpm 132
swing 0.05

kick:  x---x---x---x---
snare: ----x-------x---
clap:  ----x-------x---
hat:   x-x-x-x-x-x-x-x- x-x-x-x-x-x-xxx-
oh:    --x---x---x---x- --x---x---x-----

bass:  [C1 C1 . C1 . C1 Eb1 . C1 C1 . C1 . G1 F1 Eb1] sq cut 110..1600 res 5 vol .9
stab:  [. . C4 . . . Eb4 . . . G4 . . Bb4 . .] saw delay 3/8 vol .3
`,
  },
  {
    id: "deephouse",
    name: "Deep House",
    genre: "HOUSE",
    bpm: 122,
    color: "#2de0c8",
    blurb: "Swung hats, warm triangle bass, a Cm9 pad breathing behind plucks.",
    code: `// DEEP HOUSE — warm, swung, late-night
bpm 122
swing 0.16

kick:  x---x---x---x---
clap:  ----x-------x---
hat:   --x---x---x---x- --x---x---x---x-
oh:    ------x-------x- ------x-------x-
perc:  ---x--x---x---x- ---x--x---x-----

bass:  [C2 . . G1 . . Eb2 . C2 . . G1 . F2 Eb2 D2] tri cut 320 vol .8
pad:   [C3 Eb3 G3 A3] tri chord decay 7 vol .22
pluck: [. C5 . Eb5 . G5 . Eb5] sq delay 3/8 decay .3 vol .28
`,
  },
  {
    id: "acid",
    name: "Acid Line",
    genre: "ACID",
    bpm: 135,
    color: "#b8f05a",
    blurb: "303-style squelch — resonance 12, cutoff sweeping wide open.",
    code: `// ACID LINE — 303 squelch, resonance on full
bpm 135
swing 0.06

kick:  x---x---x---x--- x---x---x---x-x-
snare: ----x-------x--- ----x-------x---
hat:   x.x.x.x.x.x.x.x. x.x.x.x.x.x.xxx.
oh:    --x---x---x---x- --x---x---x---x-

acid:  [C2 . C2 C3 . C2 . Eb2 G2 . C2 . Bb1 . C2 .] sq cut 90..3400 res 12 vol .85
rumble:[C1 . . . . . . . C1 . . . . . . .] sine decay .5 vol .6
stab:  [. . . . C4 . . . . . Eb4 . . . G4 .] saw delay 3/8 vol .25
`,
  },
  {
    id: "dnb",
    name: "Neurofunk DnB",
    genre: "DRUM & BASS",
    bpm: 174,
    color: "#38c8f0",
    blurb: "Broken kick pattern, snare on 2 and 4, half-time growling bass.",
    code: `// NEUROFUNK — broken kicks at 174
bpm 174
swing 0.02

kick:  x---------x----- x------x--x-----
snare: ----x-------x--- ----x-------x---
hat:   x-x-x-x-x-x-x-x- x-x-x-x-x-x-x-x-
ride:  ---------------- ----------x-----

bass:  [C1 . . . Eb1 . . . C1 . . . G1 . F1 .] saw cut 200..900 res 4 vol .9
reese: [C2 . C2 . Eb2 . C2 . Bb1 . C2 . G1 . . .] saw cut 400 decay .6 vol .4
arp:   [C5 . G5 . Eb5 . Bb4 .] sq delay 3/8 vol .18
`,
  },
  {
    id: "electro",
    name: "Electro Breaks",
    genre: "ELECTRO",
    bpm: 116,
    color: "#ffb454",
    blurb: "Syncopated 808-style breaks, square-wave funk bass, zippy percs.",
    code: `// ELECTRO BREAKS — 808 syncopation
bpm 116
swing 0.1

kick:  x------x--x----- x------x--x--x--
snare: ----x-------x--- ----x-------x--X
perc:  ---x--x---x--x-- ---x--x---x---x-
hat:   x-x-x-x-x-x-x-x- x-x-x-x-x-x-x-x-

bass:  [C1 C1 . Eb1 . C1 . G1 C1 C1 . Eb1 F1 Eb1 C1 .] sq cut 260 res 2 vol .85
zap:   [. . . C5 . . Eb5 . . . . G4 . . Bb4 .] saw delay 0.75 vol .3
`,
  },
  {
    id: "trance",
    name: "Uplift Trance",
    genre: "TRANCE",
    bpm: 138,
    color: "#9bb0ff",
    blurb: "Galloping bass, off-beat open hats, supersaw arps drenched in delay.",
    code: `// UPLIFT TRANCE — 138, hands in the air
bpm 138
swing 0.0

kick:  x---x---x---x--- x---x---x---x---
clap:  ----x-------x--- ----x-------x---
oh:    --x---x---x---x- --x---x---x---x-
hat:   x-x-x-x-x-x-x-x- x-x-x-x-x-x-x-x-

bass:  [C2 . C2 C2 . C2 C2 . C2 . C2 C2 . G2 .] saw cut 300..1200 res 3 vol .8
arp:   [C4 Eb4 G4 C5 G4 Eb4 C4 Eb4] saw delay 3/8 vol .3
pad:   [C3 Eb3 G3 Bb3] tri chord decay 8 vol .2
lead:  [. . . . C5 . . Eb5 . . G5 . . . Bb5 .] saw delay 3/8 decay .5 vol .32
`,
  },
];

export const DEFAULT_PRESET = PRESETS[0];
