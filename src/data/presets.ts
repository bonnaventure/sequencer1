export interface Preset { id: string; name: string; bpm: number; code: string; }

export const PRESETS: Preset[] = [
  { id: "techno", name: "Techno", bpm: 130, code: `bpm 130\nkick:  x---x---x---x---\nsnare: ----x-------x---\nhat:   x-x-x-x-x-x-x-x-\nbass:  [C1 . C1 . Eb1 . C1 .] square vol 0.8` },
  { id: "house", name: "House", bpm: 122, code: `bpm 122\nkick:  x---x---x---x---\nclap:  ----x-------x---\nhat:   --x---x---x---x-\nbass:  [C1 . G1 . F1 . Eb1 .] saw vol 0.7` },
];

export const DEFAULT_PRESET = PRESETS[0];
