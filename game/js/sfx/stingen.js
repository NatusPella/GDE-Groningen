// De missie-stings als API (docs/missies/BOUWSTENEN.md, "Missie-stings"): `stingen.speel('start')` en de andere namen
// hieronder. De klanken zelf staan in sfx/missiebank.js; dit bestand is de regie: welke naam hoort bij welke klank,
// hoe vaak een sting mag klinken, welke sting een andere overstemt, het niveau (mixplan, categorie `sting`),
// de spraakdemping en de gebeurtenis voor de missie-agents (world.audioEvents, soort 'missiesting').
//
// De regels zijn puur (geen DOM, geen audio): scripts/sfx_stingen_test.mjs draait ze met een nagemaakte kit.
// Alleen speel() en init() raken de kit (audio.js) aan; alles gaat over de sting-bus, dus onder de Effecten-schuif en
// de dempknop, en een sting is alleen voor de speler zelf (geen netwerkverkeer, zie "Samen spelen" in BOUWSTENEN.md).
import { variantsOf } from './dsp.js';
import { FX_INFO } from './fxbank.js';
import { MISSIE_FX } from './missiebank.js';
import { categoryLevel, speechDuckFactor } from './mixplan.js';

// de naam voor de missie-agents -> de basisnaam in de bank
export const STING_NAAM = {
  start: 'missie_start',
  stap: 'missie_stap',
  bijna: 'missie_bijna',
  mislukt: 'missie_mislukt',
  geslaagd: 'missie_geslaagd',
  geslaagd_groot: 'missie_geslaagd_groot',
  brons: 'medaille_brons',
  zilver: 'medaille_zilver',
  goud: 'medaille_goud',
  scene_in: 'scene_in',
  scene_uit: 'scene_uit',
};
export const STING_NAMEN = Object.keys(STING_NAAM);

// rang: een sting overstemt een lagere niet-stil (de lagere wordt dan niet gespeeld, de hogere speelt altijd door);
// cool: minimale tijd (s) tussen twee keer dezelfde sting; niveau: factor op het niveau van de categorie;
// duck: hoeveel de omgeving even zachter gaat (0 = niet, K.duckAmb); de grote stings mogen de wereld even stilleggen
export const STING_REGEL = {
  stap: { rang: 1, cool: 0.8, niveau: 0.85, duck: 0 },
  scene_in: { rang: 2, cool: 2, niveau: 0.9, duck: 0 },
  scene_uit: { rang: 2, cool: 2, niveau: 0.9, duck: 0 },
  bijna: { rang: 3, cool: 6, niveau: 0.95, duck: 0 },
  start: { rang: 4, cool: 3, niveau: 1, duck: 0.15 },
  brons: { rang: 4, cool: 1.5, niveau: 0.9, duck: 0.1 },
  zilver: { rang: 5, cool: 1.5, niveau: 0.95, duck: 0.15 },
  mislukt: { rang: 5, cool: 3, niveau: 1, duck: 0.2 },
  geslaagd: { rang: 5, cool: 3, niveau: 1, duck: 0.2 },
  goud: { rang: 6, cool: 1.5, niveau: 1, duck: 0.25 },
  geslaagd_groot: { rang: 6, cool: 3, niveau: 1, duck: 0.3 },
};

// hoeveel stings er tegelijk mogen klinken (de staart van een lage sting mag onder een nieuwe doorlopen)
export const MAX_STINGS = 2;
// de toonspreiding per aanroep: +-1 procent (de UI-taal gebruikt 3), zodat een sting in toon blijft met de muziek
export const STING_SPREIDING = 0.01;
export const spreiding = (r) => 1 + (r * 2 - 1) * STING_SPREIDING;

// de duur van een sting in seconden: de langste variant van zijn basisnaam in de bank
export function stingDuur(naam) {
  const basis = STING_NAAM[naam];
  if (!basis) return 0;
  const ds = Object.entries(MISSIE_FX).filter(([k]) => k === basis || k.replace(/_\d$/, '') === basis).map(([, d]) => d.dur);
  return ds.length ? Math.max(...ds) : 0;
}

// De poort: mag deze sting nu? Houdt per naam de laatste tijd en wat er nog klinkt bij. request legt de sting vast als hij mag.
export function maakPoort() {
  const laatste = new Map();
  let klinkt = [];   // { tot, rang }
  return {
    request(naam, now) {
      const regel = STING_REGEL[naam];
      if (!regel || !Number.isFinite(now)) return false;
      const t = laatste.get(naam);
      if (t !== undefined && now - t < regel.cool) return false;
      klinkt = klinkt.filter((k) => k.tot > now);
      if (klinkt.some((k) => k.rang >= regel.rang)) return false;
      if (klinkt.length >= MAX_STINGS) return false;
      laatste.set(naam, now);
      klinkt.push({ tot: now + stingDuur(naam), rang: regel.rang });
      return true;
    },
    actief(now) { return klinkt.filter((k) => k.tot > now).length; },
    reset() { laatste.clear(); klinkt = []; },
  };
}

// De naam uit een audiogebeurtenis { kind: 'missiesting', name }, of null als hij niet bestaat (een typefout speelt niets)
export const stingVanEvent = (e) => (e && e.kind === 'missiesting' && Object.prototype.hasOwnProperty.call(STING_NAAM, e.name) ? e.name : null);

// De gebeurtenis voor de missie-agents: legt een sting in de lokale wereldrij (world.audioEvents). Geeft true als hij erin staat.
export function pushSting(world, naam) {
  if (!world || !Object.prototype.hasOwnProperty.call(STING_NAAM, naam)) return false;
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length >= 64) return false;
  q.push({ kind: 'missiesting', name: naam });
  return true;
}

// Welke sting hoort bij een medaille van een minigame of uitdaging (achievements.js: 1 brons, 2 zilver, 3 goud), of null
export const medailleSting = (medal) => (medal === 1 ? 'brons' : medal === 2 ? 'zilver' : medal === 3 ? 'goud' : null);

// --- de kit (audio.js) ---------------------------------------------------------------------------------------------

let K = null;
const poort = maakPoort();
const vorige = new Map();

export function initStingen(kit) {
  K = kit;
  poort.reset();
  vorige.clear();
  K.bank.warm(Object.keys(MISSIE_FX));
}

// Een sting spelen. false = de bank heeft hem nog niet (de worker rendert nog) of de naam bestaat niet: de aanroeper kan
// terugvallen op het oude geluid; true = gespeeld, of stil gehouden (dempknop, afkoeltijd, een zwaardere sting klinkt nog).
export function speel(naam, { gain = 1, delay = 0 } = {}) {
  const regel = STING_REGEL[naam];
  const basis = STING_NAAM[naam];
  if (!K || !regel || !basis) return false;
  if (K.muted()) return true;
  const now = K.ctx.currentTime;
  const namen = variantsOf(basis);
  const lijst = namen.length ? namen : [basis];
  let i = Math.min(lijst.length - 1, Math.floor(Math.random() * lijst.length));
  if (lijst.length > 1 && lijst[i] === vorige.get(naam)) i = (i + 1) % lijst.length;
  const kies = lijst[i];
  const info = FX_INFO[kies];
  if (!info) return false;
  if (!poort.request(naam, now + delay)) return true;
  vorige.set(naam, kies);
  const praat = K.speech ? K.speech() : 0;
  const level = info.gain * categoryLevel('sting') * regel.niveau * speechDuckFactor('sting', praat) * gain;
  const src = K.buf(kies, { bus: K.buses.sting, gain: level, rate: spreiding(Math.random()), delay, prio: 2, cat: 'sting' });
  if (!src) return false;
  if (regel.duck > 0 && K.duckAmb) K.duckAmb(regel.duck, stingDuur(naam));
  return true;
}

// het object voor de missie-agents: stingen.speel('stap'), stingen.push(world, 'stap')
export const stingen = { speel, push: pushSting, namen: STING_NAMEN, duur: stingDuur };
