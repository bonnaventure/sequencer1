# UI Development Tasks - TB-303 Bass Line Replica

## Project Goal
Build a skeuomorphic, functional HTML/CSS replica of the Roland TB-303 control panel. Pure hardware emulation with no saving, exporting, collaboration, or visualization features.

---

## Phase 1: Panel Foundation & Layout

### 1.1 Container Structure
- [ ] Create `.panel` container with `aspect-ratio: 1.85`
- [ ] Implement 4 horizontal bands using CSS Grid or Flexbox:
  - Band 1 (0-6%): Jack silkscreen strip
  - Band 2 (6-20%): Logo + small knobs
  - Band 3 (20-48%): Large knobs
  - Band 4 (48-100%): Recessed sequencer deck
- [ ] Size all internals in `cqi` (container query units) or `%` for scalability

### 1.2 Visual Design Tokens
- [ ] Define CSS custom properties for colors:
  - Panel silver: `#d8d6d1` base with brushed metal gradient
  - Deck well cream: `#efece4`
  - Beige buttons: `#d9d3c2`
  - Silkscreen black: `#141414`
  - Accent orange-red: `#d94e1f`
  - LED off: `#5a1414`, LED on: `#e8261c`
- [ ] Implement brushed metal texture with `repeating-linear-gradient`
- [ ] Add recessed deck effect with `box-shadow: inset`
- [ ] Set typography: condensed grotesque, all-caps, tight letter-spacing

---

## Phase 2: Band 1 - Jack Silkscreen Strip

### 2.1 Left Group Labels
- [ ] Add text labels: `MIDI IN`, `WAVEFORM`, `SYNC IN`
- [ ] Include waveform glyphs (▲/▼ ticks)
- [ ] Style as pure silkscreen text (no controls)

### 2.2 Right Group Labels
- [ ] Add text labels: `CV`, `GATE`, `HEADPHONE`, `OUTPUT`, `DC IN`
- [ ] Include small tick marks
- [ ] Ensure proper spacing and alignment

---

## Phase 3: Band 2 - Logo & Small Knobs

### 3.1 Roland Logo
- [ ] Import inline SVG for Roland wordmark
- [ ] Position on left side of band
- [ ] Render in black

### 3.2 Six Small Knobs
- [ ] Create knob component with metallic gradient
- [ ] Implement rotation via `--v` CSS variable + JS `oninput`
- [ ] Add tick-mark arc around each knob
- [ ] Label knobs: `TUNING`, `CUT OFF FREQ`, `RESONANCE`, `ENV MOD`, `DECAY`, `ACCENT`
- [ ] Center-right positioning

### 3.3 Bass Line Logo
- [ ] Create rounded-grotesque "Bass Line" logo
- [ ] Position on far right
- [ ] Render in black

---

## Phase 4: Band 3 - Large Knobs

### 4.1 TEMPO Knob
- [ ] Create larger knob with arc ticks
- [ ] Add `SLOW` / `FAST` end labels
- [ ] Implement wide flat pointer blade

### 4.2 TRACK / PATT. GROUP Selector
- [ ] Create detented rotary selector (radio group)
- [ ] Print diagram with boxed numbers 1-7 and roman numerals I-IV
- [ ] Add bracket lines connecting positions
- [ ] Light corresponding chip via `:has()`/:checked` selectors

### 4.3 MODE Selector
- [ ] Create detented selector with printed diagram
- [ ] Label positions: `WRITE/PLAY → TRACK`, `PLAY/WRITE → PATTERN`
- [ ] Use black chips for position indicators

### 4.4 VOLUME Knob
- [ ] Create knob with arc ticks
- [ ] Add `POWER SW OFF→ON` silkscreen beneath

### 4.5 Model Text
- [ ] Add center-right text: "TB‑303 / Computer Controlled"

---

## Phase 5: Band 4 - Sequencer Deck

### 5.1 Deck Container
- [ ] Create recessed cream well (`#efece4`)
- [ ] Apply inset shadow for depth
- [ ] Implement 5-column grid: `9% 10% 46% 22% 13%`
- [ ] Add 1px black outlines around sub-clusters

### 5.2 Column 1: Utility Buttons
- [ ] Box 1: `D.C. / BAR RESET` + `PATTERN CLEAR` label over beige button
- [ ] Box 2: `RUN` + red LED + `BATTERY` over beige button with `RUN/STOP` caption
- [ ] Implement momentary button press with `:active` state

### 5.3 Column 2: Mode Controls
- [ ] Black rectangle with white `PITCH MODE` text + red LED + beige button
- [ ] White box with `FUNCTION` label + red LED + vertical beige button
- [ ] Add `NORMAL MODE` text
- [ ] State chips: `BAR` (white text on black), `PATTERN` (orange text on black)

### 5.4 Column 3: Piano Keyboard (Centerpiece)
- [ ] **Black header strip**: white note names `C C# D D# E F F# G G# A A# B C`
- [ ] **White keys**: 13 cream rectangular buttons (lower ~55%)
- [ ] **Black keys**: 5 charcoal rectangles with gray caps (upper ~60%), offset piano-style
- [ ] Position black keys absolutely: `left: calc(n * 100%/13 - offset)`
- [ ] **LEDs per key**: 
  - Black key LEDs at top edge
  - White key LEDs in mid-height row
- [ ] First two black keys: silkscreen `DEL` and `INS`
- [ ] **Black footer strip**: orange `PATTERN` label + orange digits `1–8`
- [ ] **Selector row**: white chips `1 DEL 2 INS 3 4 5 6 7 8` continuing as `9 0 100 200`
- [ ] Add `aria-pressed` and `.lit` LED sibling for each key

### 5.5 Column 4: Time Mode
- [ ] Header: `TIME MODE` + red LED
- [ ] Row of tiny music-glyph icons
- [ ] Four black chips: `TRANSPOSE DOWN`, `UP`, `ACCENT`, `SLIDE`
- [ ] Four beige buttons with red LED above each
- [ ] Captions: `STEP`, triplet squiggle glyph, orange `PATT. SECTION`

### 5.6 Column 5: Right Edge
- [ ] Box 1: back-arrow glyph + `BACK` label + beige button
- [ ] Box 2: `D.S.` chip + beige button
- [ ] Captions: `WRITE/NEXT` and `TAP`

---

## Phase 6: Interactivity & States

### 6.1 Knob Behavior
- [ ] Map `<input type="range">` with `appearance:none` to knob rotation
- [ ] Formula: `transform: rotate(calc(var(--v) * 270deg - 135deg))`
- [ ] Single-line JS `oninput` to update `--v`

### 6.2 Button States
- [ ] Momentary buttons: `<button>` with `:active` translateY + inverted shadows
- [ ] Latching buttons: checkbox+label pattern for ACCENT/SLIDE
- [ ] Add bevel effects: `box-shadow: inset 0 1px 0 #fff, inset 0 -2px 0 rgba(0,0,0,.25)`

### 6.3 LED Behavior
- [ ] Off state: dark red radial gradient
- [ ] On state: `#e8261c` + glow `box-shadow: 0 0 6px 2px rgba(232,38,28,.6)`
- [ ] Toggle via `:checked ~ .led` (zero JS for latching)
- [ ] Optional blink animation for RUN state

### 6.4 Detented Selectors
- [ ] Radio group implementation for TRACK/PATT.GROUP and MODE
- [ ] Swap pointer angle on `:checked`
- [ ] Light corresponding diagram chip via CSS selectors

---

## Phase 7: Accessibility & Polish

### 7.1 Focus States
- [ ] Add `:focus-visible` rings: 2px dashed `#141414` offset outside widget

### 7.2 Motion Preferences
- [ ] Implement `prefers-reduced-motion` to kill LED blink animations

### 7.3 User Experience
- [ ] Apply `user-select: none` on all silkscreen text
- [ ] Ensure keyboard navigation works for all buttons
- [ ] Add `aria-label` and `aria-pressed` where appropriate

---

## Out of Scope (Explicitly Excluded)
- ❌ No saving or loading patterns
- ❌ No exporting (MIDI, WAV, etc.)
- ❌ No collaboration features
- ❌ No visualization (oscilloscope, spectrum, etc.)
- ❌ No bookmarks or presets
- ❌ No file management
- ❌ No complex onboarding

---

## Success Criteria
1. Panel scales perfectly at any size via `cqi` units
2. All knobs rotate smoothly with visual feedback
3. All buttons depress with realistic shadow changes
4. LEDs glow red when activated
5. Piano keyboard feels tactile and responsive
6. Silkscreen text is crisp and properly positioned
7. Zero JS for latching states; minimal JS for continuous knobs only
