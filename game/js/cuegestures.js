// Automatische gebaren bij een regel (#955 #956): welke pose-clip (poseclips.js) past bij wat er gezegd wordt?
// Puur en deterministisch: dezelfde tekst, hetzelfde personage en dezelfde regel geven altijd dezelfde keuze
// (geen willekeur, dus de gast en de host kiezen niets anders; de keuze staat in de scènedefinitie als cue).
//
//   autoClip(text, 'speaker' | 'listener', actorId, lineIndex, lineDur) -> { anim, delay, dur, mirror } of null
//
// Spreker: een vraag krijgt een open hand, een uitroep een vinger of verontwaardiging, een aarzeling (…) een
// zucht of een aarzeling, een lange regel een wijsgebaar of een gegeven. Luisteraar: nadenken, zuchten,
// aarzelen of rondkijken, niet bij elke regel. Korte regels (minder dan 24 tekens of 1,8 s) blijven rustig.
import { clipDuration } from './poseclips.js';

const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };

export const SPEAKER_POOLS = {
  vraag: ['schouderophalen', 'aarzelen', 'nadenken', 'rondkijken'],
  uitroep: ['verontwaardigd', 'wijzen', 'duimen'],
  aarzeling: ['aarzelen', 'zuchten', 'nadenken'],
  lang: ['wijzen', 'geven', 'nadenken', 'schouderophalen', 'verontwaardigd'],
};
export const LISTENER_POOL = ['nadenken', 'zuchten', 'schouderophalen', 'aarzelen', 'rondkijken'];

export function autoClip(text, role, actorId, lineIndex, lineDur) {
  const t = String(text || '');
  if (!(lineDur >= 1.8) || t.length < 24) return null;
  const h = hash(`${t}|${actorId}|${lineIndex}`);
  let pool, delay;
  if (role === 'speaker') {
    const end = t.trim().slice(-1);
    pool = t.includes('…') ? SPEAKER_POOLS.aarzeling : end === '?' ? SPEAKER_POOLS.vraag : /!/.test(t) ? SPEAKER_POOLS.uitroep : t.length >= 60 ? SPEAKER_POOLS.lang : null;
    delay = 0.35;
  } else {
    if (h % 5 >= 3) return null; // niet bij elke regel
    pool = LISTENER_POOL;
    delay = 0.9;
  }
  if (!pool) return null;
  const anim = pool[(h >>> 3) % pool.length];
  const dur = Math.max(0.8, Math.min(clipDuration(anim), lineDur - delay - 0.1));
  return { anim, delay: Math.round(delay * 100) / 100, dur: Math.round(dur * 10) / 10, mirror: ((h >>> 9) & 1) === 1 };
}
