// Allocatievrije paden van Bezit en de scrollscan (perf-bezit-23-11): wat elk beeld loopt maakt geen objecten of arrays meer,
// en de gerichte scrollscan vindt nog steeds elk gebied.   node scripts/perf_bezit_test.mjs
// Gemeten wordt alleen de rekenkant in node (aantal aanroepen en identiteit van antwoorden); frametijd in het spel is niet gemeten.
import assert from 'node:assert/strict';
import * as GT from '../game/js/bezitgate.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as PC from '../game/js/percelen.js';
import * as MA from '../game/js/machines.js';
import * as MK from '../game/js/bezitmarker.js';
import { nearestPointDist, urgencyModeFor, installActivityProbe, resetRestore } from '../game/js/placementurgency.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };

// ---- announceUnlocks: alles verteld = de poort wordt niet meer gevraagd ----
{
  const st = mem();
  L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st });
  let calls = 0;
  GT.setUnlockGate(() => { calls++; return true; });
  const w = { money: 0, calendar: { day: 20 }, msgs: [], addMessage(t) { this.msgs.push(t); } };
  const eerste = L.announceUnlocks(w);
  ok(eerste.length === 2 && w.msgs.length === 2, 'eerste keer: beide takken gemeld');
  calls = 0;
  for (let i = 0; i < 100; i++) L.dayTick(w);
  ok(calls === 0, `100 dagtikken na de meldingen vragen de poort niet (${calls})`);
  ok(L.announceUnlocks(w) === L.announceUnlocks(w) && L.announceUnlocks(w).length === 0, 'niets te melden: hetzelfde lege antwoord, geen nieuwe array');
  GT.resetUnlockGate();
}

// ---- de huur: niets verschuldigd = gedeeld antwoord ----
{
  const st = mem(); BL.initBoerderij({ opslag: st });
  const bd = BL.getBoerderij().bedrijf;
  const a = PC.verwerkHuur(bd, 5, 100), b = PC.verwerkHuur(bd, 6, 100);
  ok(a === b && a.uitgave === 0 && a.events.length === 0, 'verwerkHuur zonder huur: één gedeeld antwoord');
  const c = MA.verwerkMachineHuur(bd, 5, 100), d = MA.verwerkMachineHuur(bd, 6, 100);
  ok(c === d && c.uitgave === 0 && c.events.length === 0, 'verwerkMachineHuur zonder huur: één gedeeld antwoord');
  const w = { money: 1000, addMessage() {} };
  ok(BL.huurTik(w) === BL.huurTik(w) && w.money === 1000, 'huurTik zonder huur: gedeeld antwoord, geld ongewijzigd');
}

// ---- de versie van de markeringen blijft gelijk aan de oude formule ----
{
  const oud = (bezit, claims = []) => { let h = Object.keys(bezit.parcels).length * 31 + bezit.buildings.size * 17 + claims.length * 7; for (const id of Object.keys(bezit.parcels)) h = (h + id.charCodeAt(id.length - 1) * 3 + id.charCodeAt(1)) | 0; return h; };
  const bezit = { parcels: {}, buildings: new Set([1, 2, 3]) };
  for (let i = 0; i < 500; i++) bezit.parcels['p' + (i * 7919).toString(16).padStart(12, '0')] = {};
  ok(MK.bezitVersion(bezit, [1, 2]) === oud(bezit, [1, 2]) && MK.bezitVersion({ parcels: {}, buildings: new Set() }) === 0, 'bezitVersion = oude uitkomst');
}

// ---- plaatsingsurgentie: afstand zonder hypot, activiteitsvraag alleen als nodig ----
{
  const pts = [[100, 0], [Number.NaN, 1], null, [30, 40], [Infinity, 0], [-300, 400]];
  ok(nearestPointDist(pts, { x: 0, y: 0 }) === 50, 'dichtstbijzijnde punt, NaN en Infinity overgeslagen');
  ok(nearestPointDist([[Number.NaN, 0]], { x: 0, y: 0 }) === Infinity && nearestPointDist([], { x: 0, y: 0 }) === Infinity, 'geen geldig punt: Infinity');
  let vragen = 0;
  installActivityProbe(() => { vragen++; return false; });
  resetRestore();
  urgencyModeFor([[10, 10]], { x: 0, y: 0 }, { urgent: true });
  ok(vragen === 0, 'een teleport (sync) vraagt de activiteit niet');
  const m = urgencyModeFor([[5000, 0]], { x: 0, y: 0 });
  ok(vragen === 1 && m.mode === 'background', 'zonder herstel wel, en ver weg is achtergrond');
  installActivityProbe(() => true);
  ok(urgencyModeFor([[5000, 0]], { x: 0, y: 0 }).mode === 'urgent', 'een lopende activiteit blijft urgent');
  installActivityProbe(null);
}

// ---- dsscroll: gerichte scan met een nepdocument ----
{
  const mk = (naam, { scroll = false, h = 100, parent = null } = {}) => {
    const el = { naam, nodeType: 1, scroll, clientHeight: h, scrollHeight: h + 50, scrollTop: 0, isConnected: true, dataset: {}, kids: [], parent,
      classes: new Set(), classList: { add: (c) => el.classes.add(c) },
      contains: (o) => { for (let p = o; p; p = p.parent) if (p === el) return true; return false; },
      closest: (sel) => { for (let p = el; p; p = p.parent) if (sel === '.ds-scroll' && p.classes.has('ds-scroll')) return p; return null; },
      matches: () => el.scroll || el.classes.has('ds-scroll'),
      querySelectorAll: () => { const out = []; const walk = (e) => { for (const k of e.kids) { if (k.scroll || k.classes.has('ds-scroll')) out.push(k); walk(k); } }; walk(el); return out; } };
    if (parent) parent.kids.push(el);
    return el;
  };
  const root = mk('root');
  let sheets = 1;
  globalThis.document = { get styleSheets() { return Array.from({ length: sheets }, () => ({ cssRules: [] })); }, documentElement: root, createDocumentFragment: () => ({ querySelector() {} }) };
  const { _scrollScan: S } = await import('../game/js/dsscroll.js');
  S.init(null);
  const a = mk('a', { scroll: true, parent: root }), b = mk('b', { scroll: true, parent: root });
  S.dirty.add(root); S.scan();
  ok(S.tracked.size === 2 && a.dataset.onder === '1' && b.dataset.onder === '1', 'eerste scan: beide gebieden gevonden en gemeten');
  let gepland = 0;
  S.noteMutations([{ type: 'childList', target: root, addedNodes: [{ nodeType: 3 }], removedNodes: [] }], () => gepland++);
  ok(gepland === 0 && S.dirty.size === 0, 'tekstwijziging buiten een scrollgebied: geen scan');
  S.noteMutations([{ type: 'childList', target: a, addedNodes: [{ nodeType: 3 }], removedNodes: [] }], () => gepland++);
  ok(gepland === 1 && S.dirty.has(a), 'tekstwijziging in een scrollgebied: wel');
  S.scan();
  // een nieuw gebied in een nieuwe tak wordt gevonden; b (niet in de buurt van de wijziging) wordt niet opnieuw gemeten
  const panel = mk('panel', { parent: root }); const c = mk('c', { scroll: true, parent: panel });
  b.scrollTop = 10;
  S.noteMutations([{ type: 'childList', target: root, addedNodes: [panel], removedNodes: [] }], () => gepland++);
  S.scan();
  ok(S.tracked.has(c) && c.classes.has('ds-scroll'), 'nieuw gebied in een nieuwe tak gevonden');
  ok(b.dataset.boven === undefined || b.dataset.boven === '0', 'b is niet opnieuw gemeten (geen wijziging in zijn buurt)');
  S.noteMutations([{ type: 'attributes', target: b }], () => gepland++);
  S.scan();
  ok(b.dataset.boven === '1', 'wijziging in b: b opnieuw gemeten');
  c.isConnected = false; S.dirty.add(root); S.scan();
  ok(!S.tracked.has(c), 'losgekoppeld gebied opgeruimd');
  const d = mk('d', { scroll: true, parent: root }); sheets = 2; S.scan();
  ok(S.tracked.has(d), 'nieuwe stylesheet: het hele document opnieuw doorzocht');
  delete globalThis.document;
}

console.log(`perf_bezit_test: ${n} controles groen`);
