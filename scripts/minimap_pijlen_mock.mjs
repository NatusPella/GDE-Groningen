// Maakt docs/beeld-21-11/minimap-pijlen/mock.html: drie visueel verschillende ontwerpen voor de doelmarkering aan de rand van de minimap,
// getekend op de echte minimap (uitsneden uit de spelbeelden in docs/beeld-21-11), met de echte tokens (ds-tokens.css) en Phosphor-iconen
// (game/js/icons.js) (#1078, tweede ontwerpronde, 21-11). Daarna maakt `node scripts/minimap_pijlen_shots.mjs` de PNG's met een headless Chrome.
//   node scripts/minimap_pijlen_mock.mjs
//
//  A  Schoon-minimaal   een grote, schone wijzer (driehoek met dikke inktrand) met het icoon erin; secundair een klein rond icoon-punt
//  B  Icoon-in-schild   een bordje (afgerond vierkant met een punt naar het doel) met een groot icoon in een papieren schijf; secundair een rond bordje
//  C  Kompasboog        een rustige stippellijn langs de rand met één dikke boog op de plek van het doel en het icoon erop; secundair een stip op de lijn
//
// Regels die alle drie delen (en die de logica uit game/js/navtarget.js al afdwingt): één actief doel met de afstand erbij (13 px en meer),
// hooguit twee secundaire doelen zonder pijl, niets dat op elkaar stapelt (de markers worden langs de rand uit elkaar geschoven) en een vaste
// afstand tot de rand van de kaart. Wat actief is komt uit navtarget.js; de mock beslist dat niet zelf.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DS_TERUGVAL } from '../game/js/kaartkleuren.js';
import { PALETTES } from '../game/js/a11y.js';
import { resolveNavTargets, NAV_ROL } from '../game/js/navtarget.js';
import { iconInner } from '../game/js/icons.js';

const UIT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'beeld-21-11', 'minimap-pijlen', 'mock.html');
const pal = PALETTES.uit;
const N = (x) => Math.round(x * 100) / 100;

// ------------------------------------------------------------------ de echte minimap: uitsneden uit de spelbeelden (1904 x 993)
const S = 262; // de kaart is 262 px breed in het spel op 1920 breed
const ACHTER = [
  { bron: '../kaart/kaartlagen-na-minikaart-1920x1080.png', x: 57, y: 675 }, // Binnenstad
  { bron: '../feedback-menus/26-minikaart-hud-1920.png', x: 57, y: 675 }, // centrum
  { bron: '../beeldronde/hud3/52-hud-rijden-politie-wanted-minikaartlabel-1920.png', x: 57, y: 675 }, // drukke binnenstad
];

// ------------------------------------------------------------------ type -> Phosphor-icoon en kleur (NAV_ROL: dezelfde bron als het spel)
const ICOON = { missie: 'ster', verhaal: 'ster', groep: 'ster', eigen: 'vlag', klus: 'tas', zorg: 'ehbo', heli: 'helikopter', uitdaging: 'ster' };
const ICOON_EIGEN = { place: 'vlag', mission: 'ster', job: 'tas', play: 'doel', challenge: 'ster' };
const KLEUR = { mission: 'var(--nav-actief)', user: 'var(--nav-eigen)', job: 'var(--nav-klus)', care: 'var(--nav-zorg)' };
const kleurVan = (type) => KLEUR[NAV_ROL[type]] || KLEUR.mission;
const INK = 'var(--ds-c-ink-inkt)', PAPIER = 'var(--ds-c-ink-papier)', CREME = 'var(--ds-c-creme)';

// ------------------------------------------------------------------ meetkunde: een afgeronde vierkante baan langs de rand
// De markers lopen niet op een cirkel maar op een afgerond vierkant (de kaart is vierkant): zo is de afstand tot de rand overal gelijk.
function baan(inset, radius = 24) {
  const a = inset, b = S - inset, r = radius, w = b - a - 2 * r;
  const stuk = [w, Math.PI * r / 2, w, Math.PI * r / 2, w, Math.PI * r / 2, w, Math.PI * r / 2];
  const lengte = stuk.reduce((p, q) => p + q, 0);
  function punt(s) { // met de klok mee vanaf het begin van de bovenrand
    s = ((s % lengte) + lengte) % lengte;
    let i = 0; while (i < 7 && s > stuk[i]) { s -= stuk[i]; i++; }
    const t = s / stuk[i];
    switch (i) {
      case 0: return [a + r + w * t, a];
      case 1: { const h = -Math.PI / 2 + t * Math.PI / 2; return [b - r + Math.cos(h) * r, a + r + Math.sin(h) * r]; }
      case 2: return [b, a + r + w * t];
      case 3: { const h = t * Math.PI / 2; return [b - r + Math.cos(h) * r, b - r + Math.sin(h) * r]; }
      case 4: return [b - r - w * t, b];
      case 5: { const h = Math.PI / 2 + t * Math.PI / 2; return [a + r + Math.cos(h) * r, b - r + Math.sin(h) * r]; }
      case 6: return [a, b - r - w * t];
      default: { const h = Math.PI + t * Math.PI / 2; return [a + r + Math.cos(h) * r, a + r + Math.sin(h) * r]; }
    }
  }
  // de plek op de baan voor een peiling (graden, 0 = rechts, met de klok mee): de s waarvan de hoek vanuit het midden het dichtst bij de peiling ligt
  function sVoor(graden) {
    const doel = ((graden % 360) + 360) % 360;
    let best = 0, bd = 1e9;
    for (let s = 0; s < lengte; s += 0.5) {
      const [x, y] = punt(s);
      let h = Math.atan2(y - S / 2, x - S / 2) * 180 / Math.PI; h = ((h % 360) + 360) % 360;
      let d = Math.abs(h - doel); d = Math.min(d, 360 - d);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  return { punt, sVoor, lengte };
}

// markers uit elkaar schuiven langs de baan: de actieve blijft staan, de rest gaat weg van wie te dichtbij zit
function spreid(items, lengte, min) {
  const afstand = (a, b) => { const d = Math.abs(a - b) % lengte; return Math.min(d, lengte - d); };
  for (let ronde = 0; ronde < 40; ronde++) {
    let veranderd = false;
    for (const r of items) {
      if (r.actief) continue;
      for (const o of items) {
        if (o === r) continue;
        const nodig = o.actief || r.actief ? min.actief : min.rest;
        const d = afstand(r.s, o.s);
        if (d < nodig) {
          let delta = ((r.s - o.s) % lengte + lengte) % lengte; if (delta > lengte / 2) delta -= lengte;
          r.s += (delta >= 0 ? 1 : -1) * (nodig - d + 0.5); veranderd = true;
        }
      }
    }
    if (!veranderd) break;
  }
}

// ------------------------------------------------------------------ bouwstenen
const glyph = (naam, cx, cy, maat) => `<svg x="${N(cx - maat / 2)}" y="${N(cy - maat / 2)}" width="${maat}" height="${maat}" viewBox="0 0 256 256" style="fill:${INK};stroke:none">${iconInner(naam, true)}</svg>`;
const afstandTekst = (m) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// een punt een stuk naar binnen (naar het midden van de kaart)
function naarBinnen(x, y, afst) { const dx = S / 2 - x, dy = S / 2 - y, l = Math.hypot(dx, dy) || 1; return [x + dx / l * afst, y + dy / l * afst]; }

// het afstandsplaatje: papier met een inktrand en een harde schaduw, 14 px cijfers van de HUD (Barlow Condensed)
function plaatje(cx, cy, tekst) {
  const w = Math.max(44, tekst.length * 7.6 + 16), h = 22;
  const x = cx - w / 2, y = cy - h / 2;
  return `<g><rect x="${N(x + 2)}" y="${N(y + 2)}" width="${N(w)}" height="${h}" rx="5" style="fill:${INK}"/><rect x="${N(x)}" y="${N(y)}" width="${N(w)}" height="${h}" rx="5" style="fill:${PAPIER};stroke:${INK};stroke-width:2.2"/><text x="${N(cx)}" y="${N(cy + 5)}" text-anchor="middle" class="getal">${tekst}</text></g>`;
}

// ------------------------------------------------------------------ ontwerp A: schoon-minimaal
// Een wijzer: driehoek met dikke inktrand, een dun crème randje erbuiten (zoals de badges op de kaart), een harde schaduw en het icoon rechtop erin.
const WIJZER = 'M23 0 L-16 -20 L-16 20 Z';
function wijzerA(x, y, hoek, kleur, icoon) {
  const draai = (dx, dy) => `translate(${N(x + dx)} ${N(y + dy)}) rotate(${N(hoek)})`;
  const r = hoek * Math.PI / 180;
  return `<g><path d="${WIJZER}" transform="${draai(2, 2)}" style="fill:${INK};stroke:${INK};stroke-width:3.6;stroke-linejoin:round"/>`
    + `<path d="${WIJZER}" transform="${draai(0, 0)}" style="fill:none;stroke:${CREME};stroke-width:7.8;stroke-linejoin:round"/>`
    + `<path d="${WIJZER}" transform="${draai(0, 0)}" style="fill:${kleur};stroke:${INK};stroke-width:3.6;stroke-linejoin:round"/>`
    + glyph(icoon, x - Math.cos(r) * 3.4, y - Math.sin(r) * 3.4, 18) + '</g>';
}
function puntA(x, y, kleur, icoon) {
  return `<g><circle cx="${N(x + 1.5)}" cy="${N(y + 1.5)}" r="12" style="fill:${INK}"/><circle cx="${N(x)}" cy="${N(y)}" r="13.2" style="fill:${CREME}"/><circle cx="${N(x)}" cy="${N(y)}" r="11.6" style="fill:${kleur};stroke:${INK};stroke-width:2.8"/>${glyph(icoon, x, y, 14)}</g>`;
}

// ------------------------------------------------------------------ ontwerp B: icoon-in-schild
// Een bordje: afgerond vierkant in de kleur van het doel met een papieren schijf en een groot icoon, plus een punt naar het doel toe.
const PUNT_B = 'M35 0 L17 -13 L17 13 Z';
function schildB(x, y, hoek, kleur, icoon) {
  const kader = (dx, dy, vul, rand) => `<rect x="${N(x - 20 + dx)}" y="${N(y - 20 + dy)}" width="40" height="40" rx="12" style="fill:${vul};stroke:${rand};stroke-width:3.6;stroke-linejoin:round"/>`;
  const draai = (dx, dy) => `translate(${N(x + dx)} ${N(y + dy)}) rotate(${N(hoek)})`;
  return `<g><path d="${PUNT_B}" transform="${draai(2, 2)}" style="fill:${INK};stroke:${INK};stroke-width:3.6;stroke-linejoin:round"/>` + kader(2, 2, INK, INK)
    + `<path d="${PUNT_B}" transform="${draai(0, 0)}" style="fill:${kleur};stroke:${INK};stroke-width:3.6;stroke-linejoin:round"/>` + kader(0, 0, kleur, INK)
    + `<circle cx="${N(x)}" cy="${N(y)}" r="13" style="fill:${PAPIER};stroke:${INK};stroke-width:2.4"/>` + glyph(icoon, x, y, 18) + '</g>';
}
function puntB(x, y, kleur, icoon) {
  return `<g><circle cx="${N(x + 1.5)}" cy="${N(y + 1.5)}" r="12.5" style="fill:${INK}"/><circle cx="${N(x)}" cy="${N(y)}" r="12.5" style="fill:${PAPIER};stroke:${INK};stroke-width:2.8"/><circle cx="${N(x)}" cy="${N(y)}" r="8.6" style="fill:none;stroke:${kleur};stroke-width:3.2"/>${glyph(icoon, x, y, 11)}</g>`;
}

// ------------------------------------------------------------------ ontwerp C: kompasboog
// Een rustige stippellijn langs de rand; het doel is één dikke boog op die lijn met een rond icoon in het midden. De positie is de richting.
function randlijn(b) {
  const stappen = 240; let d = '';
  for (let i = 0; i <= stappen; i++) { const [x, y] = b.punt(b.lengte * i / stappen); d += (i ? 'L' : 'M') + N(x) + ' ' + N(y) + ' '; }
  return `<path d="${d}Z" style="fill:none;stroke:${CREME};stroke-opacity:.7;stroke-width:2.4;stroke-linejoin:round;stroke-dasharray:0.1 6.2;stroke-linecap:round"/>`;
}
function boogC(b, s, kleur, icoon) {
  const half = 34, stappen = 28; let d = '';
  for (let i = 0; i <= stappen; i++) { const [x, y] = b.punt(s - half + 2 * half * i / stappen); d += (i ? 'L' : 'M') + N(x) + ' ' + N(y) + ' '; }
  const [x, y] = b.punt(s);
  const lijn = (breed, stijl) => `<path d="${d}" style="fill:none;stroke:${stijl};stroke-width:${breed};stroke-linecap:round;stroke-linejoin:round"/>`;
  return `<g transform="translate(2 2)">${lijn(12, INK)}</g>` + lijn(12, CREME) + lijn(9.4, INK) + lijn(5.8, kleur)
    + `<circle cx="${N(x + 2)}" cy="${N(y + 2)}" r="17" style="fill:${INK}"/><circle cx="${N(x)}" cy="${N(y)}" r="17" style="fill:${kleur};stroke:${INK};stroke-width:3.6"/>`
    + `<circle cx="${N(x)}" cy="${N(y)}" r="12" style="fill:${PAPIER};stroke:${INK};stroke-width:2.2"/>` + glyph(icoon, x, y, 16);
}
function puntC(x, y, kleur, icoon) {
  return `<g><circle cx="${N(x + 1.5)}" cy="${N(y + 1.5)}" r="10.5" style="fill:${INK}"/><circle cx="${N(x)}" cy="${N(y)}" r="10.5" style="fill:${kleur};stroke:${INK};stroke-width:2.8"/>${glyph(icoon, x, y, 13)}</g>`;
}

// ------------------------------------------------------------------ de scenario's
// hoek: peiling in graden (0 = rechts, 90 = onder); m: afstand in meter.
const SCEN = [
  { id: 1, titel: 'Geen doel', uitleg: 'Niets te volgen: een rustige kaart, geen markering.', s: {}, pos: {} },
  { id: 2, titel: 'Volgende missie', uitleg: 'Het verhaal wijst de volgende missie aan: de gele wijzer met afstand is wat je volgt.', s: { verhaal: {} }, pos: { verhaal: [-48, 420] } },
  { id: 3, titel: 'Eigen route', uitleg: 'Je zette zelf een plek op de kaart: paars gaat voor, het verhaal wacht als punt.', s: { eigen: { soort: 'place' }, verhaal: {} }, pos: { eigen: [28, 640], verhaal: [-150, 900] } },
  { id: 4, titel: 'Missie loopt', uitleg: 'Een missie in uitvoering gaat voor je eigen doel; dat wacht als punt.', s: { missie: { fase: 'active', opKaart: true }, eigen: { soort: 'place' } }, pos: { missie: [-86, 300], eigen: [60, 900] } },
  { id: 5, titel: 'Klus met twee wachtenden', uitleg: 'Een klus gaat voor alles; verhaal en eigen doel wachten als twee punten (het maximum).', s: { klus: {}, verhaal: {}, eigen: { soort: 'place' } }, pos: { klus: [12, 260], verhaal: [-70, 700], eigen: [150, 900] } },
  { id: 6, titel: 'Samen spelen', uitleg: 'Jouw eigen doel, en twee medespelers als punten in hun eigen kleur: mensen zijn geen doel.', s: { eigen: { soort: 'mission' } }, pos: { eigen: [-24, 520] }, spelers: [{ a: 150, kleur: '#4363d8' }, { a: 214, kleur: '#f58231' }] },
  { id: 7, titel: 'Opknappen', uitleg: 'Lage gezondheid: de zorgroute is geen doel dat je boven de rest volgt, alleen een punt met een kruis.', s: { verhaal: {}, zorg: {} }, pos: { verhaal: [-130, 520], zorg: [140, 240] } },
  { id: 8, titel: 'Dichtbij elkaar', uitleg: 'Drie doelen in bijna dezelfde richting: ze schuiven uit elkaar en liggen nooit op elkaar.', s: { missie: { fase: 'active', opKaart: true }, eigen: { soort: 'place' }, zorg: {} }, pos: { missie: [-50, 350], eigen: [-44, 800], zorg: [-58, 260] } },
];
const wereld = (h, afstand) => { const a = h * Math.PI / 180; return { x: Math.cos(a) * afstand, y: Math.sin(a) * afstand }; };

function bouw(sc) {
  const snap = { speler: { x: 0, y: 0 }, modus: 'auto' };
  for (const [t, extra] of Object.entries(sc.s)) { const [h, m] = sc.pos[t]; const w = wereld(h, m); snap[t] = { x: w.x, y: w.y, name: t, ...extra }; }
  const nav = resolveNavTargets(snap);
  const lijst = nav.alle.map((d) => {
    const bron = Object.keys(sc.s).find((t) => { const w = wereld(sc.pos[t][0], sc.pos[t][1]); return Math.hypot(w.x - d.x, w.y - d.y) < 1; });
    const icoon = d.type === 'eigen' ? ICOON_EIGEN[(sc.s.eigen || {}).soort] || 'vlag' : ICOON[d.type] || 'ster';
    return { d, hoek: sc.pos[bron][0], icoon, kleur: kleurVan(d.type), actief: d.rol === 'actief' };
  });
  const mensen = (sc.spelers || []).map((p) => ({ hoek: p.a, icoon: 'speler', kleur: p.kleur, actief: false }));
  return [...lijst, ...mensen];
}

const INSET = { A: 27, B: 29, C: 23 }; // afstand van het hart van de markers tot de rand van de kaart (px)
function tegel(sc, o, achter) {
  const items = bouw(sc);
  const b = baan(INSET[o]);
  const tel = items.map((i) => ({ ...i, s: b.sVoor(i.hoek) }));
  spreid(tel, b.lengte, o === 'C' ? { actief: 48, rest: 28 } : { actief: 44, rest: 30 });
  let g = '';
  if (o === 'C' && items.length) g += randlijn(b);
  for (const i of tel.filter((q) => !q.actief)) {
    const [x, y] = b.punt(i.s);
    g += o === 'A' ? puntA(x, y, i.kleur, i.icoon) : o === 'B' ? puntB(x, y, i.kleur, i.icoon) : puntC(x, y, i.kleur, i.icoon);
  }
  for (const i of tel.filter((q) => q.actief)) {
    const [x, y] = b.punt(i.s);
    g += o === 'A' ? wijzerA(x, y, i.hoek, i.kleur, i.icoon) : o === 'B' ? schildB(x, y, i.hoek, i.kleur, i.icoon) : boogC(b, i.s, i.kleur, i.icoon);
    const [lx, ly] = naarBinnen(x, y, o === 'A' ? 44 : 47);
    g += plaatje(clamp(lx, 30, S - 30), clamp(ly, 18, S - 18), afstandTekst(i.d.afstand));
  }
  const ac = ACHTER[achter % ACHTER.length];
  return `<figure class="tegel"><div class="kaart"><div class="land" style="background-image:url('${ac.bron}');background-position:-${ac.x}px -${ac.y}px"></div><svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="${sc.titel}">${g}</svg></div><figcaption><b>${sc.id}. ${sc.titel}</b><span>${sc.uitleg}</span></figcaption></figure>`;
}

// ------------------------------------------------------------------ de pagina
const tokens = Object.entries(DS_TERUGVAL).map(([k, v]) => `--ds-c-${k}: ${v};`).join(' ');
const ONTWERP = {
  A: { naam: 'A Schoon-minimaal', tekst: 'Eén grote wijzer met dikke inktrand en het icoon erin; wachtende doelen zijn een klein rond icoon-punt. Het rustigste beeld: weinig vormen, veel lucht.' },
  B: { naam: 'B Icoon-in-schild', tekst: 'Eén bordje met een groot icoon op een papieren schijf en een punt naar het doel; wachtende doelen zijn ronde bordjes in de stijl van de badges op de kaart. Het meest herkenbaar als "dit is een ding".' },
  C: { naam: 'C Kompasboog', tekst: 'Een stippellijn langs de kaartrand; het doel is een dikke boog met een rond icoon op de plek van de richting, wachtende doelen zijn stippen op dezelfde lijn. Het meest als een kompas.' },
};
const sets = Object.keys(ONTWERP).map((o) => `<section class="ontwerp" id="o${o}"><h2>${ONTWERP[o].naam}</h2><p>${ONTWERP[o].tekst}</p><div class="raster">${SCEN.map((sc, i) => tegel(sc, o, i % 3)).join('')}</div></section>`).join('');
const vergelijk = `<section class="ontwerp" id="overgelijk"><h2>Vergelijking: dezelfde vier scenario's, drie ontwerpen</h2>${['A', 'B', 'C'].map((o) => `<h3>${ONTWERP[o].naam}</h3><div class="raster">${[2, 4, 5, 8].map((id, k) => tegel(SCEN[id - 1], o, k % 3)).join('')}</div>`).join('')}</section>`;
const detail = `<section class="ontwerp" id="odetail"><h2>Zoom op 2 keer: scenario 5, klus met twee wachtenden</h2><div class="zoom">${['A', 'B', 'C'].map((o) => `<div><h3>${ONTWERP[o].naam}</h3><div class="x2">${tegel(SCEN[4], o, 1)}</div></div>`).join('')}</div></section>`;

const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Minimap: doelmarkering, drie ontwerpen (#1078)</title><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="../../../game/fonts/fonts.css">
<style>
:root { ${tokens} --mk-user: ${pal.user}; --mk-job: ${pal.job}; --mk-care: ${pal.care};
  --nav-actief: var(--ds-c-ink-geel); --nav-eigen: var(--mk-user); --nav-klus: var(--mk-job); --nav-zorg: var(--mk-care); --nav-secundair: var(--ds-c-creme); }
* { box-sizing: border-box; }
body { margin: 0; padding: 28px 32px 40px; background: var(--ds-c-ink-papier); color: var(--ds-c-ink-inkt); font: 16px/1.45 'Atkinson Hyperlegible', Arial, sans-serif; }
h1 { font: 800 38px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; text-transform: uppercase; letter-spacing: .01em; margin: 0 0 4px; color: var(--ds-c-ink-bord); }
h2 { font: 800 28px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; text-transform: uppercase; margin: 22px 0 2px; }
h3 { font: 800 21px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; text-transform: uppercase; margin: 16px 0 8px; }
p { max-width: 80ch; margin: 4px 0 14px; }
.ontwerp { display: none; }
body[data-view="all"] .ontwerp, body[data-view="a"] #oA, body[data-view="b"] #oB, body[data-view="c"] #oC, body[data-view="vergelijk"] #overgelijk, body[data-view="detail"] #odetail { display: block; }
.raster { display: grid; grid-template-columns: repeat(4, ${S + 26}px); gap: 28px 26px; }
.tegel { margin: 0; width: ${S + 26}px; }
.tegel figcaption { font-size: 14px; padding-top: 12px; }
.tegel figcaption b { display: block; font: 800 17px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; text-transform: uppercase; }
.tegel figcaption span { display: block; color: var(--ds-c-inkt-zacht); }
/* de kaart zoals in het spel: papieren lijst met een inktrand en een harde schaduw, de echte kaart binnenin */
.kaart { position: relative; width: ${S + 26}px; height: ${S + 26}px; padding: 10px; background: var(--ds-c-ink-papier); border: 3px solid var(--ds-c-ink-inkt); border-radius: 18px; box-shadow: 4px 4px 0 var(--ds-c-ink-inkt); }
.kaart .land { position: absolute; left: 10px; top: 10px; width: ${S}px; height: ${S}px; border-radius: 10px; background-repeat: no-repeat; box-shadow: inset 0 0 0 2px var(--ds-c-ink-inkt); }
.kaart svg { position: absolute; left: 10px; top: 10px; border-radius: 10px; overflow: hidden; }
.getal { font: 600 15px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; fill: var(--ds-c-ink-inkt); letter-spacing: .02em; }
.zoom { display: grid; grid-template-columns: repeat(3, ${2 * (S + 26) + 8}px); gap: 28px; } .x2 .tegel { zoom: 2; } .x2 figcaption { display: none; }
</style></head><body data-view="all">
<h1>Minimap: doelmarkering, drie ontwerpen</h1>
<p>Tweede ontwerpronde bij docs/MINIMAP-PIJLEN-21-11.md (issue #1078). De kaart is de echte minimap uit de spelbeelden van 21-11, de kleuren staan in de tokens (<code>--nav-actief</code> geel, <code>--nav-eigen</code> paars, <code>--nav-klus</code> oranje, <code>--nav-zorg</code> roze), de iconen zijn Phosphor. Welk doel actief is komt uit game/js/navtarget.js. Er is niets in het spel toegepast.</p>
${sets}${vergelijk}${detail}
<script>document.body.dataset.view = (location.hash || '#all').slice(1);</script>
</body></html>
`;
fs.mkdirSync(path.dirname(UIT), { recursive: true });
fs.writeFileSync(UIT, html);
console.log('geschreven:', path.relative(process.cwd(), UIT), `(${(html.length / 1024).toFixed(0)} kB)`);
