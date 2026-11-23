import { describe, expect, it } from 'vitest';
import { above, intervalName, midiFreq, noteName, parseNote, pc, samePitchSet, spellChord, spellScale, toMidi, ROOTS } from './theory';

const n = (s: string) => parseNote(s)!;
const names = (xs: ReturnType<typeof spellScale>) => xs.map((x) => noteName(x, true)).join(' ');

describe('notes', () => {
  it('parses and names notes', () => {
    expect(parseNote('f#')).toEqual({ letter: 'F', acc: 1 });
    expect(parseNote('Bb')).toEqual({ letter: 'B', acc: -1 });
    expect(parseNote('H')).toBeNull();
    expect(pc(n('Cb'))).toBe(11);
    expect(noteName(n('Eb'))).toBe('E♭');
  });
  it('spells notes above a root with the right letter', () => {
    expect(noteName(above(n('E'), 4, 2), true)).toBe('G#');
    expect(noteName(above(n('Eb'), 3, 2), true)).toBe('Gb');
    expect(noteName(above(n('B'), 6, 4), true)).toBe('F');
  });
});

describe('scales', () => {
  it('spells major scales with flats or sharps as the key requires', () => {
    expect(names(spellScale(n('F'), 'major'))).toBe('F G A Bb C D E');
    expect(names(spellScale(n('D'), 'major'))).toBe('D E F# G A B C#');
    expect(names(spellScale(n('F#'), 'major'))).toBe('F# G# A# B C# D# E#');
    expect(names(spellScale(n('Db'), 'major'))).toBe('Db Eb F Gb Ab Bb C');
  });
  it('spells minor and modal scales', () => {
    expect(names(spellScale(n('A'), 'minor'))).toBe('A B C D E F G');
    expect(names(spellScale(n('A'), 'harmonic'))).toBe('A B C D E F G#');
    expect(names(spellScale(n('D'), 'dorian'))).toBe('D E F G A B C');
    expect(names(spellScale(n('E'), 'minpent'))).toBe('E G A B D');
  });
  it('never needs more than double accidentals for the offered roots', () => {
    for (const r of ROOTS) for (const k of ['major', 'minor', 'harmonic']) expect(spellScale(n(r), k).every((x) => Math.abs(x.acc) <= 2)).toBe(true);
  });
});

describe('chords and intervals', () => {
  it('spells chords', () => {
    expect(names(spellChord(n('C'), 'maj'))).toBe('C E G');
    expect(names(spellChord(n('Bb'), 'min7'))).toBe('Bb Db F Ab');
    expect(names(spellChord(n('B'), 'dim'))).toBe('B D F');
    expect(names(spellChord(n('G'), 'dom7'))).toBe('G B D F');
    expect(names(spellChord(n('C'), 'aug'))).toBe('C E G#');
  });
  it('names intervals by letter distance', () => {
    expect(intervalName(n('C'), n('E'))).toBe('Major 3rd');
    expect(intervalName(n('C'), n('Eb'))).toBe('Minor 3rd');
    expect(intervalName(n('C'), n('D#'))).toBe('Augmented 2nd');
    expect(intervalName(n('F'), n('B'))).toBe('Augmented 4th');
    expect(intervalName(n('B'), n('F'))).toBe('Diminished 5th');
    expect(intervalName(n('E'), n('D'))).toBe('Minor 7th');
  });
});

describe('keyboard helpers', () => {
  it('converts frequencies and maps notes to ascending keys', () => {
    expect(midiFreq(69)).toBe(440);
    expect(Math.round(midiFreq(60) * 100) / 100).toBe(261.63);
    expect(toMidi(spellChord(n('A'), 'min'))).toEqual([69, 72, 76]);
    expect(toMidi(spellScale(n('G'), 'majpent'))).toEqual([67, 69, 71, 74, 76]);
  });
  it('compares pitch sets regardless of octave and order', () => {
    expect(samePitchSet([64, 60, 67], [48, 52, 55])).toBe(true);
    expect(samePitchSet([60, 64], [60, 64, 67])).toBe(false);
  });
});
