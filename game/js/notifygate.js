// De meldingenpoort (eigenaarseis 22-11): meldingen verschijnen pas NADAT het laadscherm weg is. Een nieuwe streek ontdekken
// (gloed om de minimap, de onthulling op de kaart, een gebiedsnaam) mocht over het laadscherm heen liggen. Hier staat de ene
// wachtrij: ze houdt meldingen vast zolang iets het scherm van de speler overneemt (laadscherm, laadpoort, opstartscherm,
// cutscene of opening, een schermvullend menu of de kaart) en geeft ze daarna één voor één vrij, met de duur van
// noticetiming.js (noticeDuration, gelijke klassen en het aflopende balkje). Puur: geen DOM; de tellers en probes komen van buiten.
//
// Regels:
//   - hooguit één melding tegelijk in een slot (duur 0 neemt geen slot, bijvoorbeeld de onthulling op de kaart);
//   - meldingen van een samenvoegbare soort (ontdekking, gebied) smelten wachtend samen tot één, de laatste of belangrijkste;
//   - wat te lang wacht (MAX_AGE_S) vervalt, behalve prestaties: die gaan nooit verloren;
//   - een savegame laden of de laadpoort die sluit laat oude ontdekkingen vallen (drop): alleen echt nieuwe ontdekkingen na het laden tellen;
//   - Samen spelen: lokaal per speler, geen netwerkverkeer; een gast en de opener houden elk hun eigen poort.
// scripts/notifygate_test.mjs.
import { noticeDuration, makeTimer, precedence } from './noticetiming.js';

export const MAX_AGE_S = 20;

// prio: hoger gaat eerst. samen: wachtende meldingen van deze soort smelten samen. vervalt: valt weg na MAX_AGE_S.
export const KINDS = Object.freeze({
  wanted: { prio: 5, samen: false, vervalt: true },
  missie: { prio: 5, samen: false, vervalt: true },
  prestatie: { prio: 4, samen: false, vervalt: false },
  doel: { prio: 3, samen: false, vervalt: true },
  hint: { prio: 1, samen: true, vervalt: true },
  gebied: { prio: 2, samen: true, vervalt: true },
  ontdekking: { prio: 2, samen: true, vervalt: true },
  kaart: { prio: 2, samen: false, vervalt: true }, // de onthulling op de kaart: elke streek apart
});

// Het register van wat het scherm overneemt: naam -> () => bool. Elke module meldt zijn eigen probe aan.
const holds = new Map();
export function registerNotifyHold(naam, fn) { holds.set(naam, fn); }
export function unregisterNotifyHold(naam) { holds.delete(naam); }

// De namen van wat nu vasthoudt (zonder `negeer`). Een falende probe houdt niets vast.
export function notifyHeldBy(negeer = []) {
  const uit = [];
  for (const [naam, fn] of holds) {
    if (negeer.includes(naam)) continue;
    let h = false;
    try { h = !!fn(); } catch (e) { h = false; }
    if (h) uit.push(naam);
  }
  return uit;
}
export const notifyHeld = (negeer = []) => notifyHeldBy(negeer).length > 0;

// opties: held(negeer) => namen die vasthouden (standaard het register), maxLeeftijd (s).
export function createNotifyGate({ held = notifyHeldBy, maxLeeftijd = MAX_AGE_S } = {}) {
  let wacht = [];
  let actief = null; // { timer, item }
  let teller = 0;
  const stat = { getoond: 0, samengevoegd: 0, vervallen: 0, gedropt: 0 };

  const isHeld = (it) => held(it.negeer || []).length > 0;
  const rangVan = (it) => (KINDS[it.soort] || { prio: 0 }).prio;

  function toon(it) {
    stat.getoond++;
    if (it.duur > 0) actief = { item: it, timer: makeTimer(it.duur) };
    try { if (it.show) it.show(it); } catch (e) { /* een kapotte melding houdt de rij niet op */ }
  }

  // Het volgende dat mag: de hoogste precedence (prio, dan de oudste) van wat niet vastgehouden wordt.
  function nextFree() {
    const vrij = wacht.filter((it) => !isHeld(it)).sort((a, b) => precedence({ prio: rangVan(a), at: a.at }, { prio: rangVan(b), at: b.at }));
    return vrij[0] || null;
  }

  function schuif() {
    while (!actief) {
      const it = nextFree();
      if (!it) return;
      wacht = wacht.filter((w) => w !== it);
      toon(it);
    }
  }

  return {
    // soort: sleutel van KINDS. m: { key, tekst, duur?, show(m), negeer?: [probenamen], prio? }
    // Geeft 'getoond', 'wacht' of 'samengevoegd'.
    push(soort, m = {}) {
      const def = KINDS[soort] || { prio: 0, samen: false, vervalt: true };
      const it = { ...m, soort, key: m.key || m.tekst || soort, negeer: m.negeer || [], at: ++teller, leeftijd: 0, aantal: 1, prio: m.prio };
      it.duur = Number.isFinite(m.duur) ? m.duur : noticeDuration({ tekst: m.tekst || '' });
      // dezelfde sleutel ververst wat wacht (geen stapeling)
      const zelfde = wacht.findIndex((w) => w.soort === soort && w.key === it.key);
      if (zelfde >= 0) { it.aantal = wacht[zelfde].aantal; wacht[zelfde] = it; stat.samengevoegd++; return 'samengevoegd'; }
      if (!actief && !wacht.length && !isHeld(it)) { toon(it); return 'getoond'; }
      if (def.samen) {
        const i = wacht.findIndex((w) => w.soort === soort);
        if (i >= 0) {
          const oud = wacht[i];
          // de belangrijkste wint; bij gelijke prio de laatste. Het aantal telt mee.
          const winner = (Number.isFinite(oud.prio) && Number.isFinite(it.prio) && oud.prio > it.prio) ? oud : it;
          winner.aantal = oud.aantal + it.aantal;
          wacht[i] = winner;
          stat.samengevoegd++;
          return 'samengevoegd';
        }
      }
      wacht.push(it);
      return 'wacht';
    },

    // dtS: seconden sinds de vorige tik. Veroudert, laat vervallen, laat het lopende slot aflopen en geeft het volgende vrij.
    tik(dtS) {
      const dt = Number.isFinite(dtS) && dtS > 0 ? dtS : 0;
      for (const it of wacht) it.leeftijd += dt;
      const voor = wacht.length;
      wacht = wacht.filter((it) => !((KINDS[it.soort] || {}).vervalt !== false && it.leeftijd > maxLeeftijd));
      stat.vervallen += voor - wacht.length;
      if (actief) {
        actief.timer.tik(dt, { pauze: isHeld(actief.item) });
        if (actief.timer.klaar) actief = null;
      }
      schuif();
    },

    // Laat wachtende meldingen vallen (na een savegame of een laadpoort): alleen de genoemde soorten, anders alles behalve prestaties.
    drop(soorten = null) {
      const voor = wacht.length;
      wacht = wacht.filter((it) => (soorten ? !soorten.includes(it.soort) : it.soort === 'prestatie'));
      stat.gedropt += voor - wacht.length;
    },

    reset() { wacht = []; actief = null; teller = 0; },
    state() { return { wacht: wacht.map((w) => ({ soort: w.soort, key: w.key, aantal: w.aantal, leeftijd: w.leeftijd })), actief: actief ? actief.item.key : null, ...stat }; },
  };
}

// De ene poort van dit spel (per apparaat, dus per speler). Zelf aangedreven: elke 250 ms een tik met de echte tijd.
export const notifyGate = createNotifyGate();
export const queueNotice = (soort, m) => notifyGate.push(soort, m);

let timer = null;
export function runNotifyGate() {
  if (timer || typeof setInterval !== 'function') return;
  let last = Date.now();
  timer = setInterval(() => { const nu = Date.now(); notifyGate.tik((nu - last) / 1000); last = nu; }, 250);
  if (timer && timer.unref) timer.unref();
}
