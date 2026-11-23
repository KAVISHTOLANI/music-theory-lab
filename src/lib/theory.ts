/* Music theory helpers with correct letter-name spelling (e.g. F major has B♭, not A♯). */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export interface Note {
  letter: (typeof LETTERS)[number];
  acc: number; // -2..2 (♭♭ .. ##)
}

export function parseNote(s: string): Note | null {
  const m = /^([A-Ga-g])(#{1,2}|b{1,2}|♯|♭|x)?$/.exec(s.trim());
  if (!m) return null;
  const a = m[2] ?? '';
  const acc = a === '#' || a === '♯' ? 1 : a === '##' || a === 'x' ? 2 : a === 'b' || a === '♭' ? -1 : a === 'bb' ? -2 : 0;
  return { letter: m[1].toUpperCase() as Note['letter'], acc };
}

export const pc = (n: Note) => (((LETTER_PC[n.letter] + n.acc) % 12) + 12) % 12;

export function noteName(n: Note, ascii = false): string {
  const sym = ascii ? { '-2': 'bb', '-1': 'b', '0': '', '1': '#', '2': '##' } : { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
  return n.letter + sym[String(n.acc) as keyof typeof sym];
}

/** Spells the note that is `semis` semitones and `steps` letter-steps above `root`. */
export function above(root: Note, semis: number, steps: number): Note {
  const li = (LETTERS.indexOf(root.letter) + steps) % 7;
  const letter = LETTERS[li];
  const target = (pc(root) + semis) % 12;
  let acc = target - LETTER_PC[letter];
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  return { letter, acc };
}

/** Each step: [semitones from root, letter steps from root]. */
export const SCALES: Record<string, { name: string; steps: [number, number][] }> = {
  major: { name: 'Major', steps: [[0, 0], [2, 1], [4, 2], [5, 3], [7, 4], [9, 5], [11, 6]] },
  minor: { name: 'Natural minor', steps: [[0, 0], [2, 1], [3, 2], [5, 3], [7, 4], [8, 5], [10, 6]] },
  harmonic: { name: 'Harmonic minor', steps: [[0, 0], [2, 1], [3, 2], [5, 3], [7, 4], [8, 5], [11, 6]] },
  dorian: { name: 'Dorian', steps: [[0, 0], [2, 1], [3, 2], [5, 3], [7, 4], [9, 5], [10, 6]] },
  mixolydian: { name: 'Mixolydian', steps: [[0, 0], [2, 1], [4, 2], [5, 3], [7, 4], [9, 5], [10, 6]] },
  majpent: { name: 'Major pentatonic', steps: [[0, 0], [2, 1], [4, 2], [7, 4], [9, 5]] },
  minpent: { name: 'Minor pentatonic', steps: [[0, 0], [3, 2], [5, 3], [7, 4], [10, 6]] },
};

export const CHORDS: Record<string, { name: string; symbol: string; steps: [number, number][] }> = {
  maj: { name: 'Major', symbol: '', steps: [[0, 0], [4, 2], [7, 4]] },
  min: { name: 'Minor', symbol: 'm', steps: [[0, 0], [3, 2], [7, 4]] },
  dim: { name: 'Diminished', symbol: 'dim', steps: [[0, 0], [3, 2], [6, 4]] },
  aug: { name: 'Augmented', symbol: 'aug', steps: [[0, 0], [4, 2], [8, 4]] },
  sus2: { name: 'Suspended 2nd', symbol: 'sus2', steps: [[0, 0], [2, 1], [7, 4]] },
  sus4: { name: 'Suspended 4th', symbol: 'sus4', steps: [[0, 0], [5, 3], [7, 4]] },
  dom7: { name: 'Dominant 7th', symbol: '7', steps: [[0, 0], [4, 2], [7, 4], [10, 6]] },
  maj7: { name: 'Major 7th', symbol: 'maj7', steps: [[0, 0], [4, 2], [7, 4], [11, 6]] },
  min7: { name: 'Minor 7th', symbol: 'm7', steps: [[0, 0], [3, 2], [7, 4], [10, 6]] },
};

export const spellScale = (root: Note, key: string) => SCALES[key].steps.map(([s, l]) => above(root, s, l));
export const spellChord = (root: Note, key: string) => CHORDS[key].steps.map(([s, l]) => above(root, s, l));

/** Roots offered in the explorer — the common key names (no triple accidentals in their scales). */
export const ROOTS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

const QUALITY: Record<number, Record<number, string>> = {
  0: { 0: 'Perfect unison', 1: 'Augmented unison' },
  1: { 1: 'Minor 2nd', 2: 'Major 2nd', 3: 'Augmented 2nd' },
  2: { 2: 'Diminished 3rd', 3: 'Minor 3rd', 4: 'Major 3rd' },
  3: { 4: 'Diminished 4th', 5: 'Perfect 4th', 6: 'Augmented 4th' },
  4: { 6: 'Diminished 5th', 7: 'Perfect 5th', 8: 'Augmented 5th' },
  5: { 8: 'Minor 6th', 9: 'Major 6th' },
  6: { 9: 'Diminished 7th', 10: 'Minor 7th', 11: 'Major 7th' },
};

/** Names the interval from a lower to a higher note (within an octave), using letter distance. */
export function intervalName(low: Note, high: Note): string {
  const steps = (LETTERS.indexOf(high.letter) - LETTERS.indexOf(low.letter) + 7) % 7;
  const semis = (pc(high) - pc(low) + 12) % 12;
  if (steps === 0 && semis === 0) return 'Perfect unison / octave';
  return QUALITY[steps]?.[semis] ?? `${semis} semitones`;
}

/** Simple name for an interval of n semitones between two keys on the keyboard (uses the common spelling). */
export const SEMITONE_NAMES = ['Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd', 'Perfect 4th', 'Tritone', 'Perfect 5th', 'Minor 6th', 'Major 6th', 'Minor 7th', 'Major 7th', 'Octave'];

export const midiFreq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Keyboard keys from C4 (midi 60) for two octaves. */
export const KEYS = Array.from({ length: 25 }, (_, i) => {
  const midi = 60 + i;
  const p = midi % 12;
  return { midi, black: [1, 3, 6, 8, 10].includes(p), pc: p, octave: Math.floor(midi / 12) - 1 };
});

export const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** Which midi notes (C4–C6) to light up for a set of spelled notes, starting at the root at or above C4. */
export function toMidi(notes: Note[]): number[] {
  if (!notes.length) return [];
  let prev = 60 + pc(notes[0]);
  const out = [prev];
  for (const n of notes.slice(1)) {
    let m = Math.floor(prev / 12) * 12 + pc(n);
    while (m <= prev) m += 12;
    out.push(m);
    prev = m;
  }
  return out;
}

/** Quiz checks: does a set of chosen pitch classes exactly match the scale/chord? */
export function samePitchSet(a: number[], b: number[]): boolean {
  const A = new Set(a.map((x) => ((x % 12) + 12) % 12)), B = new Set(b.map((x) => ((x % 12) + 12) % 12));
  return A.size === B.size && [...A].every((x) => B.has(x));
}
