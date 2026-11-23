import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Field, Landing, NotFound, Notice, PageHead, Shell, useFlash, usePersistentState, useRoute } from './shared/ui';
import { CHORDS, KEYS, ROOTS, SCALES, SEMITONE_NAMES, SHARP_NAMES, intervalName, midiFreq, noteName, parseNote, samePitchSet, spellChord, spellScale, toMidi } from './lib/theory';

const KEY = 'tone-lab:store';
const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/scales', label: 'Scales' },
  { to: '/chords', label: 'Chords' },
  { to: '/intervals', label: 'Intervals' },
  { to: '/practice', label: 'Practice' },
];
const COMPUTER_KEYS = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k']; // C4 … C5

interface Stats {
  answered: number;
  correct: number;
  best: number;
  byType: Record<string, { answered: number; correct: number }>;
}
interface Store {
  muted: boolean;
  stats: Stats;
}

/* ---------- Audio ---------- */
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}
function playNote(midi: number, when = 0, dur = 0.6) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + when;
  const osc = a.createOscillator(), osc2 = a.createOscillator(), gain = a.createGain();
  osc.type = 'triangle';
  osc2.type = 'sine';
  osc.frequency.value = midiFreq(midi);
  osc2.frequency.value = midiFreq(midi) * 2;
  const g2 = a.createGain();
  g2.gain.value = 0.15;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.22, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  osc2.connect(g2).connect(gain);
  gain.connect(a.destination);
  osc.start(t); osc2.start(t);
  osc.stop(t + dur + 0.05); osc2.stop(t + dur + 0.05);
}

export default function App() {
  const [route] = useRoute();
  const [store, setStore] = usePersistentState<Store>(KEY, { muted: false, stats: { answered: 0, correct: 0, best: 0, byType: {} } });
  const play = (notes: number[], mode: 'seq' | 'block' = 'seq') => { if (!store.muted) notes.forEach((m, i) => playNote(m, mode === 'seq' ? i * 0.32 : 0, mode === 'seq' ? 0.5 : 1.2)); };
  const ctxp = { store, setStore, play };
  let page: ReactNode;
  if (route === '/') page = <Home />;
  else if (route === '/scales') page = <Scales {...ctxp} />;
  else if (route === '/chords') page = <Chords {...ctxp} />;
  else if (route === '/intervals') page = <Intervals {...ctxp} />;
  else if (route === '/practice') page = <Practice {...ctxp} />;
  else page = <NotFound />;
  return (
    <Shell name="Tone Lab" wordmark={['Tone', 'Lab']} nav={NAV} route={route} cta={{ to: '/practice', label: 'Practise' }} footerNote="Sound is generated in your browser with the Web Audio API. Nothing is recorded or uploaded.">
      {route !== '/' && <div className="sound-toggle"><button type="button" className="btn btn-sm" aria-pressed={!store.muted} onClick={() => setStore({ ...store, muted: !store.muted })}>{store.muted ? 'Sound off' : 'Sound on'}</button></div>}
      {page}
    </Shell>
  );
}

type Ctx = { store: Store; setStore: (s: Store) => void; play: (notes: number[], mode?: 'seq' | 'block') => void };

/* ---------- Piano ---------- */
export function Piano({ lit = [], marks = {}, onKey, selected = [], label, compact }: { lit?: number[]; marks?: Record<number, string>; onKey?: (midi: number) => void; selected?: number[]; label: string; compact?: boolean }) {
  const [down, setDown] = useState<number | null>(null);
  const whites = KEYS.filter((k) => !k.black);
  const ref = useRef<HTMLDivElement>(null);
  function press(m: number) {
    setDown(m);
    onKey?.(m);
    setTimeout(() => setDown((d) => (d === m ? null : d)), 180);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    const i = COMPUTER_KEYS.indexOf(e.key.toLowerCase());
    if (i >= 0 && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); press(60 + i); }
  }
  const whiteIndex = (midi: number) => whites.findIndex((w) => w.midi === midi);
  return (
    <div className={`piano ${compact ? 'is-compact' : ''}`} ref={ref} onKeyDown={onKeyDown} role="group" aria-label={label}>
      <div className="whites">
        {whites.map((k) => (
          <button key={k.midi} type="button" className={`key white ${lit.includes(k.midi) ? 'lit' : ''} ${selected.includes(k.midi) ? 'sel' : ''} ${down === k.midi ? 'down' : ''}`} tabIndex={onKey ? 0 : -1} aria-pressed={onKey ? selected.includes(k.midi) : undefined}
            aria-label={`${SHARP_NAMES[k.pc]}${k.octave}${lit.includes(k.midi) ? ` (${marks[k.midi] ?? 'highlighted'})` : ''}`} onClick={() => press(k.midi)}>
            {marks[k.midi] && <span className="mark">{marks[k.midi]}</span>}
            {!compact && k.pc === 0 && <span className="c-label">C{k.octave}</span>}
          </button>
        ))}
      </div>
      {KEYS.filter((k) => k.black).map((k) => (
        <button key={k.midi} type="button" className={`key black ${lit.includes(k.midi) ? 'lit' : ''} ${selected.includes(k.midi) ? 'sel' : ''} ${down === k.midi ? 'down' : ''}`} tabIndex={onKey ? 0 : -1} aria-pressed={onKey ? selected.includes(k.midi) : undefined}
          style={{ left: `calc(${((whiteIndex(k.midi - 1) + 1) / whites.length) * 100}% - var(--bw) / 2)` }}
          aria-label={`${SHARP_NAMES[k.pc]}${k.octave}${lit.includes(k.midi) ? ` (${marks[k.midi] ?? 'highlighted'})` : ''}`} onClick={() => press(k.midi)}>
          {marks[k.midi] && <span className="mark">{marks[k.midi]}</span>}
        </button>
      ))}
    </div>
  );
}

function HeroPreview() {
  const root = parseNote('D')!;
  const notes = spellScale(root, 'major');
  const midis = toMidi(notes);
  return (
    <div className="hero-tl">
      <div className="row-between"><strong className="hero-tl-title">D major</strong><span className="small muted">two sharps · F♯ and C♯</span></div>
      <Piano lit={midis} marks={Object.fromEntries(midis.map((m, i) => [m, noteName(notes[i])]))} label="D major scale on a keyboard" compact />
      <ol className="degrees">{notes.map((x, i) => <li key={i}><span className="mono small">{i + 1}</span><b>{noteName(x)}</b></li>)}</ol>
    </div>
  );
}

function Home() {
  return (
    <Landing
      eyebrow="Music theory, hands on"
      title={<>See it, hear it, <em>spell it right.</em></>}
      lead="An interactive keyboard for exploring scales, chords and intervals — every note spelled the way a musician would write it — plus quick drills that check what you’ve learned."
      primary={{ href: '#/scales', label: 'Explore scales' }}
      secondary={{ href: '#/practice', label: 'Try a drill' }}
      previewLabel="Scale explorer — live"
      preview={<HeroPreview />}
      steps={[
        { title: 'Pick a root and a shape', body: 'Twelve keys, seven scales and nine chord types, lit up on a two-octave keyboard.' },
        { title: 'Play it', body: 'Click keys or use your computer keyboard (A–K row) and hear each note through Web Audio.' },
        { title: 'Test yourself', body: 'Name intervals and chords, or build scales on the keys, with instant feedback and a score.' },
      ]}
      stepsIntro="No sign-up and no samples to download — Tone Lab synthesises its sound in the browser."
      features={[
        { title: 'Correct spelling', body: 'F major has B♭, not A♯; F♯ major has E♯. Letter names follow the theory, not the nearest black key.' },
        { title: 'Intervals by name', body: 'Minor 3rd, augmented 4th, diminished 5th — named from the letters as well as the semitones.' },
        { title: 'Keyboard friendly', body: 'Every key is a button with a spoken name; A W S E D F T G Y H U J K play an octave.' },
        { title: 'Practice that remembers', body: 'Your best streak and accuracy by drill type are kept in this browser.' },
      ]}
      note="Tone Lab is a learning aid. Sound requires a browser with Web Audio; everything else works without it."
      closing={{ title: <>Theory is easier <em>when you can hear it.</em></>, action: { href: '#/scales', label: 'Start exploring' } }}
    />
  );
}

function RootPicker({ root, setRoot }: { root: string; setRoot: (r: string) => void }) {
  return <Field label="Root">{(p) => <select {...p} value={root} onChange={(e) => setRoot(e.target.value)}>{ROOTS.map((r) => <option key={r} value={r}>{noteName(parseNote(r)!)}</option>)}</select>}</Field>;
}

function Scales({ play }: Ctx) {
  const [root, setRoot] = useState('C');
  const [scale, setScale] = useState('major');
  const notes = spellScale(parseNote(root)!, scale);
  const midis = toMidi(notes);
  const withOctave = [...midis, midis[0] + 12];
  return (
    <div className="stack">
      <PageHead eyebrow="Scales" title={<>{noteName(parseNote(root)!)} <em>{SCALES[scale].name.toLowerCase()}</em></>} actions={<button type="button" className="btn btn-primary" onClick={() => play(withOctave)}>Play scale ▶</button>} />
      <div className="card filters">
        <RootPicker root={root} setRoot={setRoot} />
        <Field label="Scale">{(p) => <select {...p} value={scale} onChange={(e) => setScale(e.target.value)}>{Object.entries(SCALES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>}</Field>
      </div>
      <section className="card stack">
        <Piano lit={midis} marks={Object.fromEntries(midis.map((m, i) => [m, noteName(notes[i])]))} onKey={(m) => play([m])} label={`${noteName(parseNote(root)!)} ${SCALES[scale].name} on a keyboard; keys are playable`} />
        <ol className="degrees" data-testid="spelling">{notes.map((x, i) => <li key={i}><span className="mono small">{i + 1}</span><b>{noteName(x)}</b><span className="small muted">{i ? SEMITONE_NAMES[SCALES[scale].steps[i][0]] : 'root'}</span></li>)}</ol>
        <p className="small muted">{notes.filter((x) => x.acc > 0).length ? `${notes.filter((x) => x.acc > 0).length} sharp${notes.filter((x) => x.acc > 0).length === 1 ? '' : 's'}` : notes.filter((x) => x.acc < 0).length ? `${notes.filter((x) => x.acc < 0).length} flat${notes.filter((x) => x.acc < 0).length === 1 ? '' : 's'}` : 'No sharps or flats'} · each letter appears once{scale.includes('pent') ? ' (pentatonic scales skip two)' : ''}.</p>
      </section>
    </div>
  );
}

function Chords({ play }: Ctx) {
  const [root, setRoot] = useState('C');
  const [q, setQ] = useState('maj');
  const r = parseNote(root)!;
  const notes = spellChord(r, q);
  const midis = toMidi(notes);
  return (
    <div className="stack">
      <PageHead eyebrow="Chords" title={<>{noteName(r)}{CHORDS[q].symbol} <em>· {CHORDS[q].name.toLowerCase()}</em></>} actions={<><button type="button" className="btn btn-primary" onClick={() => play(midis, 'block')}>Play chord ▶</button><button type="button" className="btn" onClick={() => play(midis)}>Arpeggio</button></>} />
      <div className="card filters">
        <RootPicker root={root} setRoot={setRoot} />
        <Field label="Quality">{(p) => <select {...p} value={q} onChange={(e) => setQ(e.target.value)}>{Object.entries(CHORDS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>}</Field>
      </div>
      <section className="card stack">
        <Piano lit={midis} marks={Object.fromEntries(midis.map((m, i) => [m, noteName(notes[i])]))} onKey={(m) => play([m])} label={`${noteName(r)}${CHORDS[q].symbol} chord on a keyboard`} />
        <div className="table-wrap"><table className="table"><caption className="sr-only">Chord tones</caption><thead><tr><th scope="col">Tone</th><th scope="col">Note</th><th scope="col">Interval from root</th><th scope="col" className="num">Semitones</th></tr></thead>
          <tbody>{notes.map((x, i) => <tr key={i}><td>{['Root', '', '3rd', '4th', '5th', '', '7th'][CHORDS[q].steps[i][1]] || `${CHORDS[q].steps[i][1] + 1}th`}</td><td><b>{noteName(x)}</b></td><td>{i ? intervalName(r, x) : 'Unison'}</td><td className="num">{CHORDS[q].steps[i][0]}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

function Intervals({ play }: Ctx) {
  const [picked, setPicked] = useState<number[]>([60, 64]);
  const [lo, hi] = [...picked].sort((a, b) => a - b);
  const semis = hi != null ? hi - lo : null;
  function onKey(m: number) {
    play([m]);
    setPicked((p) => (p.length >= 2 ? [m] : p.includes(m) ? p : [...p, m]));
  }
  return (
    <div className="stack">
      <PageHead eyebrow="Intervals" title={<>The distance <em>between two notes.</em></>} description="Click two keys. The first click after a pair starts a new one." actions={hi != null && <button type="button" className="btn btn-primary" onClick={() => play([lo, hi])}>Play interval ▶</button>} />
      <section className="card stack">
        <Piano lit={picked} selected={picked} onKey={onKey} label="Pick two keys to name the interval" />
        <div className="interval-out" aria-live="polite" data-testid="interval">
          {semis == null ? <p className="muted">Pick a second key.</p> : <>
            <b className="display-num">{SEMITONE_NAMES[semis] ?? `${semis} semitones`}</b>
            <span className="small">{SHARP_NAMES[lo % 12]} → {SHARP_NAMES[hi % 12]} · {semis} semitone{semis === 1 ? '' : 's'} · frequency ratio {(midiFreq(hi) / midiFreq(lo)).toFixed(3)}</span>
            {semis === 6 && <span className="small muted">Spelled F–B it’s an augmented 4th; spelled B–F it’s a diminished 5th.</span>}
          </>}
        </div>
      </section>
    </div>
  );
}

/* ---------- Practice ---------- */
type Q = { type: 'interval'; lo: number; hi: number; answer: string; options: string[] } | { type: 'chord'; root: string; q: string; midis: number[]; answer: string; options: string[] } | { type: 'scale'; root: string; scale: string; target: number[] };
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

function makeQuestion(type: Q['type']): Q {
  if (type === 'interval') {
    const lo = 60 + Math.floor(Math.random() * 12), semis = 1 + Math.floor(Math.random() * 12);
    const answer = SEMITONE_NAMES[semis];
    return { type, lo, hi: lo + semis, answer, options: shuffle([answer, ...shuffle(SEMITONE_NAMES.slice(1).filter((x) => x !== answer)).slice(0, 3)]) };
  }
  if (type === 'chord') {
    const root = pick(ROOTS), q = pick(['maj', 'min', 'dim', 'aug', 'dom7', 'maj7', 'min7']);
    const answer = `${noteName(parseNote(root)!)}${CHORDS[q].symbol}`;
    const others = shuffle(Object.keys(CHORDS).filter((k) => k !== q)).slice(0, 3).map((k) => `${noteName(parseNote(root)!)}${CHORDS[k].symbol}`);
    return { type, root, q, midis: toMidi(spellChord(parseNote(root)!, q)), answer, options: shuffle([answer, ...others]) };
  }
  const root = pick(['C', 'G', 'D', 'F', 'A', 'E', 'Bb']), scale = pick(['major', 'minor']);
  return { type, root, scale, target: toMidi(spellScale(parseNote(root)!, scale)) };
}

function Practice({ store, setStore, play }: Ctx) {
  const [type, setType] = useState<Q['type']>('interval');
  const [q, setQ] = useState<Q>(() => makeQuestion('interval'));
  const [chosen, setChosen] = useState<string | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [run, setRun] = useState(0);
  const [flash, setFlash] = useFlash(3000);
  const s = store.stats;
  const acc = s.answered ? Math.round((s.correct / s.answered) * 100) : null;
  useEffect(() => { setQ(makeQuestion(type)); setChosen(null); setSel([]); }, [type]);
  const record = (ok: boolean) => {
    const bt = s.byType[q.type] ?? { answered: 0, correct: 0 };
    const nextRun = ok ? run + 1 : 0;
    setRun(nextRun);
    setStore({ ...store, stats: { answered: s.answered + 1, correct: s.correct + (ok ? 1 : 0), best: Math.max(s.best, nextRun), byType: { ...s.byType, [q.type]: { answered: bt.answered + 1, correct: bt.correct + (ok ? 1 : 0) } } } });
  };
  function answer(opt: string) {
    if (chosen || q.type === 'scale') return;
    setChosen(opt);
    record(opt === q.answer);
  }
  function checkScale() {
    if (q.type !== 'scale') return;
    const ok = samePitchSet(sel, q.target);
    setChosen(ok ? 'right' : 'wrong');
    record(ok);
    if (!ok) setFlash({ kind: 'error', text: `Not quite — the highlighted keys show ${noteName(parseNote(q.root)!)} ${SCALES[q.scale].name.toLowerCase()}.` });
  }
  function next() { setQ(makeQuestion(type)); setChosen(null); setSel([]); }
  const byType = useMemo(() => Object.entries(s.byType), [s]);
  return (
    <div className="stack">
      <PageHead eyebrow="Practice" title={<>Quick <em>drills.</em></>} />
      <div className="stats">
        <div className="stat"><span className="stat-label">Current run</span><span className="stat-value" data-testid="run">{run}</span></div>
        <div className="stat"><span className="stat-label">Best run</span><span className="stat-value">{s.best}</span></div>
        <div className="stat"><span className="stat-label">Accuracy</span><span className="stat-value">{acc == null ? '—' : `${acc}%`}</span><span className="small muted">{s.answered} answered{byType.length ? ` · ${byType.map(([k, v]) => `${k} ${Math.round((v.correct / v.answered) * 100)}%`).join(', ')}` : ''}</span></div>
      </div>
      <div className="tabs" role="radiogroup" aria-label="Drill">
        {([['interval', 'Name the interval'], ['chord', 'Name the chord'], ['scale', 'Build the scale']] as const).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={type === k} onClick={() => setType(k)}>{l}</button>)}
      </div>
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      <section className="card stack drill" aria-live="polite">
        {q.type === 'interval' && <>
          <p className="drill-q">What’s the interval between the two lit keys?</p>
          <Piano lit={[q.lo, q.hi]} label="Two highlighted keys" />
          <div className="row"><button type="button" className="btn btn-sm" onClick={() => play([q.lo, q.hi])}>Hear it ▶</button></div>
        </>}
        {q.type === 'chord' && <>
          <p className="drill-q">Which chord is lit?</p>
          <Piano lit={q.midis} label="Highlighted chord" />
          <div className="row"><button type="button" className="btn btn-sm" onClick={() => play(q.midis, 'block')}>Hear it ▶</button></div>
        </>}
        {q.type !== 'scale' && (
          <div className="options">
            {q.options.map((o) => <button key={o} type="button" className={`btn option ${chosen ? (o === q.answer ? 'right' : o === chosen ? 'wrong' : '') : ''}`} disabled={!!chosen} onClick={() => answer(o)}>{o}</button>)}
          </div>
        )}
        {q.type === 'scale' && <>
          <p className="drill-q">Select the notes of <strong>{noteName(parseNote(q.root)!)} {SCALES[q.scale].name.toLowerCase()}</strong> (one octave), then check.</p>
          <Piano lit={chosen === 'wrong' ? q.target : []} selected={sel} onKey={(m) => { if (chosen) return; play([m]); setSel(sel.includes(m) ? sel.filter((x) => x !== m) : [...sel, m]); }} label="Select keys to build the scale" />
          {!chosen && <div className="row"><button type="button" className="btn btn-primary" disabled={!sel.length} onClick={checkScale}>Check ({sel.length} selected)</button><button type="button" className="btn btn-ghost" onClick={() => setSel([])}>Clear</button></div>}
        </>}
        {chosen && (
          <div className={`result ${(q.type === 'scale' ? chosen === 'right' : chosen === q.answer) ? 'ok' : 'no'}`} role="status">
            <strong>{(q.type === 'scale' ? chosen === 'right' : chosen === q.answer) ? 'Correct!' : `Not quite${q.type !== 'scale' ? ` — it’s ${q.answer}` : ''}.`}</strong>
            {q.type === 'chord' && <span className="small"> Notes: {spellChord(parseNote(q.root)!, q.q).map((x) => noteName(x)).join(' – ')}</span>}
            <button type="button" className="btn btn-primary btn-sm" onClick={next} autoFocus>Next question →</button>
          </div>
        )}
      </section>
      <p className="small muted">Tip: with a keyboard focused, the A–K row (A W S E D F T G Y H U J K) plays C4 to C5.</p>
    </div>
  );
}
