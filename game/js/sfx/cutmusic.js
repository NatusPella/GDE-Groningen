// De muziek onder een cutscene, runtime (aaa30): de regels staan in sfx/cutmix.js (puur). Hier de stand: cinematics.js meldt het begin
// van een scène (de stand, de regels), de klok en het eind; audio/radio.js tikt per beeld en vermenigvuldigt de radiobus en de scenarioloop
// met cutMusicGain(). Alles lokaal: een gast die dezelfde scène speelt rekent dezelfde mix uit zijn eigen regels (Samen spelen).
import * as speech from '../speech.js';
import { createCutMix, speechWindows, speakingAt, nextSpeechIn, sceneMusicMode, normMusicMode } from './cutmix.js';
import { SCENE_MUSIC } from './cutmuziek.js';

let mix = null, windows = [], clock = 0, ending = false, off = false, lastSpeaking = false;

// scene: { id?, music?, lines, duration } (de spec van playCinematic). De stand: scene.music, de tabel van de regie, anders automatisch.
export function beginCutMusic(scene) {
  if (!scene) return;
  const prevDb = mix ? mix.state.db : 0;
  windows = speechWindows(scene.lines);
  clock = 0;
  ending = false;
  const mode = sceneMusicMode({ id: scene.id, music: scene.music }, scene.lines, scene.duration, SCENE_MUSIC);
  // de muziek speelde net op normaal niveau (of nog ducked van het vorige): begin daar, de aanzet doet de rest
  mix = createCutMix(mode, { startDb: prevDb });
}
export function clockCutMusic(t) { if (Number.isFinite(t)) clock = t; }
export function endCutMusic() {
  if (!mix) return;
  mix.setMode('vol');
  windows = [];
  ending = true;
}
export function cutMusicActive() { return !!mix && !off; }
export function setCutMixOff(v) { off = !!v; }

// per beeld, vóór het lezen van de gain. Stem = een echte opname die nu klinkt, of een regel uit de plannen.
export function tickCutMusic(dt) {
  if (!mix) return;
  const speaking = !ending && (speech.clipPlaying() || speakingAt(windows, clock));
  lastSpeaking = speaking;
  const db = mix.step(speaking, dt, ending ? Infinity : nextSpeechIn(windows, clock));
  if (ending && db >= -0.2) mix = null; // weer op normaal niveau: de bus is vrij
}
export const cutMusicGain = () => (mix && !off ? mix.gain() : 1);
export const cutMusicDb = () => (mix && !off ? mix.state.db : 0);
export function cutMusicState() {
  return mix ? { mode: mix.state.mode, db: +mix.state.db.toFixed(1), speaking: lastSpeaking, ending, off, clock: +clock.toFixed(2) } : { mode: null, db: 0, speaking: false, ending: false, off, clock: 0 };
}
// Een sting mag alleen in een stilte (cutmix.js stingOkAt): wacht tot de stem zwijgt, uiterlijk maxS seconden.
export function whenSpeechQuiet(fn, maxS = 6) {
  const quiet = () => !speech.clipPlaying() && !(mix && !ending && speakingAt(windows, clock));
  if (!mix && !speech.clipPlaying()) { fn(); return; }
  if (quiet() && !(mix && nextSpeechIn(windows, clock) < 0.25)) { fn(); return; }
  const t0 = Date.now();
  const id = setInterval(() => {
    if (Date.now() - t0 > maxS * 1000 || (quiet() && !(mix && nextSpeechIn(windows, clock) < 0.25))) { clearInterval(id); fn(); }
  }, 80);
}
export { normMusicMode };
