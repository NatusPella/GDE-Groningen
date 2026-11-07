// Ommeland-paspoort (#681): one overview per village with its uitje, eierbal, vondst and
// summer event, the same progress language as Veroverd and a "nearly complete" hint at 80%.
// Pure data and rules: no DOM, no THREE, no world state. The caller passes the player's own
// sets (uitjes, eierballen, vondsten, gezien), the calendar day/hour and the rail routes, so a
// guest's own paspoort and the host's are two calls with two different sets (#429).
// Tests: scripts/ommelandpaspoort_test.mjs.
import { VILLAGES } from './ommelandlines.js';
import { AGENDA } from './evenementen.js';
import { FINDS, REGIO_EVENTS, STREKEN } from './regioleven.js';
import { day } from './calendar.js';
import { dienstVoor } from './dienstregeling.js';

export const DREMPEL = 0.8; // "bijna compleet" from 80% (issue #681)
export const SET_PASPOORT = ['uitje', 'eierbal', 'vondst', 'evenement'];

// The streek of every village, from the map's regions (regioleven.js). The villages sit on
// the edge of their region, so the table says which region's finds and summer event belong
// to the village; the test checks every village and every streek.
export const DORP_STREEK = {
  Haren: 'hunsingo',
  Zuidhorn: 'westerkwartier',
  Sauwerd: 'hunsingo',
  Winsum: 'hunsingo',
  Bedum: 'hunsingo',
  Stedum: 'hunsingo',
  Loppersum: 'hunsingo',
  Kropswolde: 'veenkolonien',
};

const STREEK = new Map(STREKEN.map((s) => [s.id, s]));
const AGENDA_BY_PLAATS = new Map(AGENDA.map((ev) => [ev.plaats, ev]));
const REGIO_BY_STREEK = new Map(REGIO_EVENTS.map((ev) => [ev.streek, ev]));
const FINDS_BY_STREEK = new Map(STREKEN.map((s) => [s.id, FINDS.filter((f) => f.streek === s.id)]));

const setOf = (v) => (v instanceof Set ? v : new Set(Array.isArray(v) ? v : v ? [...v] : []));
const klok = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 3600) % 24).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
};

// The villages of the Ommeland come from the source table, never from a handwritten list.
export const dorpen = () => Object.keys(VILLAGES);

export function streekVan(dorp) {
  const id = DORP_STREEK[dorp];
  return STREEK.get(id) || null;
}

// The village's summer event: an agenda event in the village itself, otherwise the summer
// event of its streek (regioleven.js). Both hang on the shared calendar, so a guest sees the
// same date as the host; `gezien` is per player.
export function evenementVoor(dorp) {
  const ev = AGENDA_BY_PLAATS.get(dorp);
  if (ev) return { id: ev.id, naam: ev.naam, plaats: ev.plaats, soort: 'agenda', dag: ev.from, van: ev.hours ? ev.hours[0] : null, tot: ev.hours ? ev.hours[1] : null };
  const st = DORP_STREEK[dorp];
  const rv = REGIO_BY_STREEK.get(st);
  if (!rv) return null;
  return { id: rv.id, naam: rv.name, plaats: STREEK.get(st) ? STREEK.get(st).name : dorp, soort: 'streek', dag: day(rv.month, rv.date), van: null, tot: null };
}

export function vondstenVoor(dorp) {
  const st = DORP_STREEK[dorp];
  return FINDS_BY_STREEK.get(st) || [];
}

function deel(id, klaar, tekst) {
  return { id, label: { uitje: 'Uitje', eierbal: 'Eierbal', vondst: 'Vondst', evenement: 'Evenement' }[id], klaar: !!klaar, tekst: String(tekst || '') };
}

// One village: the four things, their own progress and the progress of the village as a whole.
// The vondst weighs the whole find set of its streek (three verzamel and one geheim), so a
// village without finds is not "done" while its region still has something to find.
export function dorpStand(dorp, data = {}) {
  const uitjes = setOf(data.uitjes);
  const eieren = setOf(data.eieren);
  const vondsten = setOf(data.vondsten);
  const gezien = setOf(data.gezien);
  const V = VILLAGES[dorp] || {};
  const streek = streekVan(dorp);
  const finds = vondstenVoor(dorp);
  const gevonden = finds.filter((f) => vondsten.has(f.id)).length;
  const ev = evenementVoor(dorp);

  const uitje = deel('uitje', uitjes.has(dorp), V.special ? V.special.name : 'Dorpsuitje');
  const eierbal = deel('eierbal', eieren.has(dorp), 'Verstopt in het dorp');
  const vondst = deel('vondst', finds.length > 0 && gevonden === finds.length, `${gevonden} van ${finds.length} in ${streek ? streek.name : 'de streek'}`);
  const evenement = ev ? deel('evenement', gezien.has(ev.id), `${ev.naam}${ev.plaats && ev.soort === 'agenda' ? ` · ${ev.plaats}` : ''}`) : null;
  const onderdelen = [uitje, eierbal, vondst, evenement].filter(Boolean);
  const klaar = onderdelen.filter((o) => o.klaar).length;
  const totaal = onderdelen.length;
  const pct = totaal ? Math.round((klaar / totaal) * 100) : 0;
  return { dorp, streek: streek ? streek.id : null, streekNaam: streek ? streek.name : '', onderdelen, uitje, eierbal, vondst, evenement, klaar, totaal, pct };
}

// Every village plus the collection progress and the nearly-complete hint (#681).
export function paspoort(data = {}) {
  const eieren = setOf(data.eieren);
  const vondsten = setOf(data.vondsten);
  const dorpenStand = dorpen().map((d) => dorpStand(d, data));
  const klaar = dorpenStand.filter((d) => d.klaar === d.totaal).length; // complete villages
  const totaal = dorpenStand.length;
  const onderdelenKlaar = dorpenStand.reduce((s, d) => s + d.klaar, 0);
  const onderdelenTotaal = dorpenStand.reduce((s, d) => s + d.totaal, 0);
  const eggTotal = dorpen().length;
  const eggDone = dorpen().filter((d) => eieren.has(d)).length;
  const findTotal = FINDS.length;
  const findDone = FINDS.filter((f) => vondsten.has(f.id)).length;

  const bijna = [];
  if (totaal && klaar / totaal >= DREMPEL && klaar < totaal) bijna.push({ soort: 'dorpen', naam: 'Dorpen', klaar, totaal, pct: Math.round((klaar / totaal) * 100) });
  if (eggTotal && eggDone / eggTotal >= DREMPEL && eggDone < eggTotal) bijna.push({ soort: 'eierballen', naam: 'Eierballen', klaar: eggDone, totaal: eggTotal, pct: Math.round((eggDone / eggTotal) * 100) });
  if (findTotal && findDone / findTotal >= DREMPEL && findDone < findTotal) bijna.push({ soort: 'vondsten', naam: 'Vondsten', klaar: findDone, totaal: findTotal, pct: Math.round((findDone / findTotal) * 100) });
  for (const st of STREKEN) {
    const finds = FINDS_BY_STREEK.get(st.id) || [];
    const done = finds.filter((f) => vondsten.has(f.id)).length;
    if (!finds.length || done === finds.length) continue;
    const p = Math.round((done / finds.length) * 100);
    if (p >= DREMPEL * 100) bijna.push({ soort: 'vondsten', naam: st.name, klaar: done, totaal: finds.length, pct: p });
  }
  return { dorpen: dorpenStand, klaar, totaal, onderdelenKlaar, onderdelenTotaal, pct: totaal ? Math.round((klaar / totaal) * 100) : 0, eierballen: { klaar: eggDone, totaal: eggTotal, pct: eggTotal ? Math.round((eggDone / eggTotal) * 100) : 0 }, vondsten: { klaar: findDone, totaal: findTotal, pct: findTotal ? Math.round((findDone / findTotal) * 100) : 0 }, bijna };
}

// Short, dry lines for the overview; at most three, and only real near-misses.
export function hint80(p) {
  const lines = (p && p.bijna ? p.bijna : []).slice(0, 3).map((b) => {
    if (b.soort === 'dorpen') return `Bijna compleet: ${b.klaar} van ${b.totaal} dorpen`;
    if (b.soort === 'eierballen') return `Bijna compleet: ${b.klaar} van ${b.totaal} eierballen`;
    return `Bijna compleet: ${b.klaar} van ${b.totaal} vondsten${b.naam && b.naam !== 'Vondsten' ? ` in ${b.naam}` : ''}`;
  });
  return lines;
}

// The next trains to this village from the built rail routes. Pure: the routes come from
// railway.js (getRoutes()) and the schedule from dienstregeling.js; a guest may plan the
// same timetable as the host because the calendar is shared. Times are seconds after midnight.
export function treinPlan(dorp, routes = [], { dag = 1, uur = 12 } = {}) {
  const now = Math.max(0, Math.min(23.999, Number(uur) || 0)) * 3600;
  const uit = [];
  for (const route of routes || []) {
    if (!route || !Array.isArray(route.stops) || !route.stops.some((s) => s.name === dorp)) continue;
    for (const dir of [1, -1]) {
      const d = dienstVoor(route, dir, dag, now, { vanaf: dorp });
      if (!d || !Number.isFinite(d.vertrek)) continue;
      uit.push({ lijn: route.name, richting: dir > 0 ? 'heen' : 'terug', vertrek: Math.round(d.vertrek), vertrekTekst: klok(d.vertrek), van: d.van, naar: d.naar, vertraging: d.vertraging || 0 });
    }
  }
  uit.sort((a, b) => a.vertrek - b.vertrek);
  const lijnen = uit.slice(0, 2);
  return { lijnen, volgende: lijnen[0] || null, tekst: lijnen.length ? `Trein ${lijnen[0].vertrekTekst} · ${lijnen[0].lijn}` : 'Geen trein gevonden' };
}
