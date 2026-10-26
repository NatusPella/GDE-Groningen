// Hengelen aan het Meerstad-meer (minigames batch 3, Meerstad-activiteiten):
// the rules of a quiet fishing minigame (pure, no DOM, no THREE; node-tested in
// scripts/minigames3_test.mjs). Cast with Spatie, wait for the float to dip and
// strike with Spatie inside the bite window; too early scares the fish, too
// late and it spits the hook. Ninety seconds, the heaviest total wins.
import { medalFrom } from './minigamekit.js';

export const HENGEL = { duration: 90, waitMin: 2.5, waitMax: 7, castT: 0.8, scareT: 1.6, tries: 99 };
// weight in kg, share of the bites, and how long the float is under (s)
export const FISH = [
  { id: 'voorn', name: 'Voorn', kg: 0.3, share: 0.34, window: 1.1 },
  { id: 'baars', name: 'Baars', kg: 0.6, share: 0.28, window: 0.9 },
  { id: 'brasem', name: 'Brasem', kg: 1.2, share: 0.2, window: 0.8 },
  { id: 'snoek', name: 'Snoek', kg: 2.4, share: 0.12, window: 0.65 },
  { id: 'karper', name: 'Karper', kg: 4.0, share: 0.06, window: 0.55 },
];
export const MEDAL_AT = [4, 7.5, 12];
export const hengelMedal = (kg) => medalFrom(kg, MEDAL_AT);

export function pickFish(rand) {
  let r = rand(), acc = 0;
  for (const f of FISH) { acc += f.share; if (r < acc) return f; }
  return FISH[0];
}

// opts (hengelen overal, #412): kies(rand) -> { id, name, kg, window } kiest de vis van dit water in plaats van de vaste
// Meerstad-lijst, duur is de tijd (Infinity: vrij hengelen zonder klok) en wacht is [min, max] seconden tot de beet.
// venster (#492) is de factor op het beetvenster uit het hengeltuig: een sterkere lijn houdt de dobber langer onder.
// Zonder tuig is die factor precies 1 en verandert er niets.
export function createHengel(rand, opts = {}) {
  return {
    phase: 'idle', t: 0, left: opts.duur ?? HENGEL.duration, timer: 0, fish: null, bite: 0, kg: 0, catches: [], lost: 0, scared: 0, rand, flash: null,
    kies: opts.kies || null, wacht: opts.wacht || [HENGEL.waitMin, HENGEL.waitMax], venster: Number.isFinite(opts.venster) && opts.venster > 0 ? opts.venster : 1,
    vangsten: [],
  };
}

// inp: { cast: bool } (Spatie); returns events
export function stepHengel(st, inp, dt) {
  const ev = [];
  if (st.phase === 'done') return ev;
  st.t += dt;
  st.left -= dt;
  const press = !!(inp && inp.cast);
  if (st.left <= 0 && st.phase !== 'bite') { st.phase = 'done'; ev.push({ type: 'done' }); return ev; }
  if (st.phase === 'idle') {
    if (press) { st.phase = 'cast'; st.timer = HENGEL.castT; ev.push({ type: 'cast' }); }
  } else if (st.phase === 'cast') {
    st.timer -= dt;
    if (st.timer <= 0) { st.phase = 'wait'; st.timer = st.wacht[0] + st.rand() * (st.wacht[1] - st.wacht[0]); st.fish = st.kies ? st.kies(st.rand) : pickFish(st.rand); }
  } else if (st.phase === 'wait') {
    st.timer -= dt;
    if (press) { st.phase = 'scare'; st.timer = HENGEL.scareT; st.scared++; ev.push({ type: 'early' }); }
    else if (st.timer <= 0) { st.phase = 'bite'; st.bite = (st.fish.window || 0) * (st.venster || 1); ev.push({ type: 'bite', fish: st.fish.id }); }
  } else if (st.phase === 'bite') {
    st.bite -= dt;
    if (press) {
      st.kg = Math.round((st.kg + st.fish.kg) * 100) / 100;
      st.catches.push(st.fish.id);
      st.vangsten.push({ id: st.fish.id, kg: st.fish.kg });
      ev.push({ type: 'catch', fish: st.fish.id, kg: st.fish.kg });
      st.phase = 'idle'; st.fish = null;
    } else if (st.bite <= 0) { st.lost++; ev.push({ type: 'lost', fish: st.fish.id }); st.phase = 'idle'; st.fish = null; }
  } else if (st.phase === 'scare') {
    st.timer -= dt;
    if (st.timer <= 0) st.phase = 'idle';
  }
  if (st.left <= 0 && st.phase === 'idle') { st.phase = 'done'; ev.push({ type: 'done' }); }
  return ev;
}

// A bot with a reaction time (s) and a chance to strike early.
export function botHengel(st, reaction, rand) {
  if (st.phase === 'idle') return { cast: true };
  if (st.phase === 'bite') return { cast: (st.fish.window || 0) * (st.venster || 1) - st.bite >= reaction };
  if (st.phase === 'wait' && rand() < 0.002) return { cast: true };
  return {};
}
