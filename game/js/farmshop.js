// De hofwinkel van Hoeve Zeldenrust (#1373, audit B9): wat op het erf van de hoeve ligt verkoop je in de eigen winkel, met een eigen merk, aan klanten van het dorp, tegen een
// betere prijs dan de markt maar met een grens per speldag (een winkel is geen groothandel). Puur: geen DOM, geen wereld, geen klok (scripts/farmshop_test.mjs); het geld
// verrekent boerderijlive.verkoopHofwinkel via loopbaanVerdien, nooit met world.money +=.
//
// Open vanaf rang Trekkerrijder (Landbouw niveau 3) en alleen voor wie de hoeve kreeg. Het merk is verzonnen (Hoeve Zeldenrust, constitution 2). Samen spelen: de winkel is van de speler
// zelf (zijn eigen boerderij, #429); een gast verkoopt in zijn eigen spel en niets gaat over het net. De opslag blijft overeind: een oude opslag zonder `hofwinkel` laadt leeg.
import { PRIJS_KG } from './gewasmarkt.js';
import { SCHENK_ERF, haalUit } from './percelen.js';

export const MERK = 'Hoeve Zeldenrust';
export const HOFWINKEL = { erf: SCHENK_ERF, factor: 1.3, dagKg: 150, minNiveau: 3, goederen: ['aardappelen', 'uien', 'fruit'] };
const NAAM = { aardappelen: 'Aardappelen', uien: 'Uien', fruit: 'Fruit' };

export const nieuweHofwinkel = () => ({ dag: -1, kg: 0 });
export function leesHofwinkel(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  return { dag: Number.isFinite(d.dag) ? Math.max(-1, Math.min(1e7, Math.round(d.dag))) : -1, kg: Number.isFinite(d.kg) ? Math.max(0, Math.min(HOFWINKEL.dagKg, Math.round(d.kg))) : 0 };
}

export const prijsPerKg = (gewas) => Math.round((PRIJS_KG[gewas] || 0) * HOFWINKEL.factor * 100) / 100;
const verkochtVandaag = (st, dag) => (st && st.dag === dag ? st.kg : 0);

// Is de winkel open? { open, reden }: de hoeve moet van jou zijn en je moet Trekkerrijder zijn.
export function winkelOpen(bd, niveau) {
  if (!bd || !bd.erven || !bd.erven[HOFWINKEL.erf]) return { open: false, reden: 'De winkel hoort bij hoeve Zeldenrust.' };
  if (niveau < HOFWINKEL.minNiveau) return { open: false, reden: 'De hofwinkel gaat open vanaf Trekkerrijder (Landbouw niveau 3). Oogst en lever af om hoger te komen.' };
  return { open: true, reden: '' };
}

// Wat de winkel nu aanbiedt: per goed hoeveel er op het erf ligt, de prijs per kilo en hoeveel de klanten vandaag nog nemen.
export function winkelAanbod(bd, st, dag, niveau) {
  const o = winkelOpen(bd, niveau);
  const over = Math.max(0, HOFWINKEL.dagKg - verkochtVandaag(st, dag));
  const opslag = (bd && bd.opslag && bd.opslag[HOFWINKEL.erf]) || {};
  return { ...o, merk: MERK, dagKg: HOFWINKEL.dagKg, over, rijen: HOFWINKEL.goederen.map((g) => ({ gewas: g, naam: NAAM[g], kg: Math.round(opslag[g] || 0), prijsKg: prijsPerKg(g), max: Math.min(over, Math.round(opslag[g] || 0)) })) };
}

// Verkoop kg van een goed in de winkel. Haalt het van het erf af en telt het bij wat vandaag verkocht is. Geeft { ok, kg, bedrag } of { ok: false, reden }.
export function verkoopInWinkel(bd, st, dag, niveau, gewas, kg) {
  const o = winkelOpen(bd, niveau);
  if (!o.open) return { ok: false, reden: o.reden };
  if (!HOFWINKEL.goederen.includes(gewas)) return { ok: false, reden: 'Dat verkoopt de winkel niet.' };
  const over = Math.max(0, HOFWINKEL.dagKg - verkochtVandaag(st, dag));
  if (over <= 0) return { ok: false, reden: `De klanten hebben vandaag genoeg (${HOFWINKEL.dagKg} kg). Morgen weer.` };
  const wil = Math.min(Math.round(Number.isFinite(kg) ? kg : 0), over);
  if (!(wil > 0)) return { ok: false, reden: 'Kies hoeveel je verkoopt.' };
  const r = haalUit(bd, HOFWINKEL.erf, gewas, wil);
  if (!r.ok) return { ok: false, reden: `Er ligt geen ${NAAM[gewas].toLowerCase()} op het erf van de hoeve.` };
  if (st.dag !== dag) { st.dag = dag; st.kg = 0; }
  st.kg += r.kg;
  return { ok: true, kg: r.kg, bedrag: Math.round(r.kg * prijsPerKg(gewas)), gewas };
}
