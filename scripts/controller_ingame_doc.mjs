// Maakt docs/CONTROLLER-INDELING-22-11.md (de volledige indeling als tabellen) en docs/CONTROLLER-CHEATSHEET-22-11.html (printbaar, DS3-stijl)
// uit de bron (controls.js PAD_MAPS, PAD_COOP, het acties-wiel en de inventaris van controller_ingame_audit.mjs), zodat ze niet uit de pas lopen.
//   node scripts/controller_ingame_doc.mjs --schrijf    schrijft beide bestanden
//   node scripts/controller_ingame_doc.mjs              controleert of ze nog kloppen (exitcode 1 als niet)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PAD_MAPS, PAD_COOP, PAD_BUTTONS, WHEEL_HOLD_MS, WHEEL_CTX, wheelItemsFor, describe, keyName } from '../game/js/controls.js';
import { ACTIES, SITUATIES, ACTIVITEITEN, plek, labelVan, ZONDER_PAD } from './controller_ingame_audit.mjs';

export const MD_PAD = new URL('../docs/CONTROLLER-INDELING-22-11.md', import.meta.url);
export const HTML_PAD = new URL('../docs/CONTROLLER-CHEATSHEET-22-11.html', import.meta.url);

const SLOT = { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', ls: 'L3', rs: 'R3', up: 'D-pad ↑', down: 'D-pad ↓', left: 'D-pad ←', right: 'D-pad →', view: 'Overzicht', start: 'Menu', lstick: 'Linkerstick', rstick: 'Rechterstick', wiel: 'Wiel' };
const slotNaam = (s) => SLOT[s] || s;
const STICK = { move: 'Lopen of vliegen', steer: 'Sturen', arrows: 'Kiezen', nav: 'Kiezen', none: '' };
const stickTekst = (ctx, st) => (st === 'move' ? ({ heli: 'Vliegen', plane: 'Vliegen', pigeon: 'Vliegen', train: 'Lopen door de cabine' }[ctx] || 'Lopen') : STICK[st]);
const MUIS_TOKEN = { '@fire': 'LMB', '@aim': 'RMB', '@wheel+': 'WHEEL', '@wheel-': 'WHEEL', '@gas': 'W', '@brake': 'S' };

// dezelfde toets betekent per situatie iets anders: de korte woorden voor de tabel
const SPECIFIEK = {
  ' ': { foot: 'Springen', hengelen: 'Springen', vehicle: 'Handrem', vehicleManual: 'Handrem', bus: 'Handrem', skutsje: 'Handrem', trekker: 'Handrem', heli: 'Omhoog', plane: 'Neus omhoog', pigeon: 'Klapwieken', train: 'Noodrem' },
  control: { foot: 'Bukken', hengelen: 'Bukken', heli: 'Omlaag', plane: 'Neus omlaag', pigeon: 'Pikken en landen' },
  shift: { foot: 'Rennen', hengelen: 'Rennen', vehicle: 'Versnellen', bus: 'Versnellen', skutsje: 'Versnellen', trekker: 'Versnellen', heli: 'Sneller', plane: 'Remmen op de baan', pigeon: 'Sneller vliegen' },
  t: { vehicle: 'Wiel met snelle zinnen (alleen in Samen spelen)', vehicleManual: 'Wiel met snelle zinnen (alleen in Samen spelen)' },
  i: { vehicle: 'Hengelen (boot die stilligt)', vehicleManual: 'Hengelen (boot die stilligt)', skutsje: 'Hengelen (boot die stilligt)' },
};

/** Wat een knop doet in een situatie, in woorden, en de toets op het toetsenbord. */
export function knopRegel(ctx, slot, waarde, samen = false) {
  if (waarde == null) return null;
  const a = ACTIES.find((x) => x.key === waarde && !x.shift && !x.alt && !!x.samen === samen && x.ctx.includes(ctx)) || (samen ? null : ACTIES.find((x) => x.key === waarde && !x.shift && !x.alt && !x.samen && x.ctx.includes(ctx)));
  let tekst = a ? a.label : describe(waarde) || String(waarde);
  if (!samen && SPECIFIEK[waarde] && SPECIFIEK[waarde][ctx]) tekst = SPECIFIEK[waarde][ctx];
  if (waarde === 'escape' && !(ctx in ACTIVITEITEN)) tekst = 'Pauzemenu en telefoon';
  if (waarde === 'escape' && ctx === 'menu') tekst = 'Terug';
  const toets = MUIS_TOKEN[waarde] || keyName(waarde);
  return { tekst, toets };
}

function situatieRijen(ctx) {
  const map = PAD_MAPS[ctx];
  const rijen = [];
  for (const s of PAD_BUTTONS) {
    const r = knopRegel(ctx, s, map[s]);
    const co = PAD_COOP[ctx] && Object.hasOwn(PAD_COOP[ctx], s) ? knopRegel(ctx, s, PAD_COOP[ctx][s], true) : null;
    if (r || co) rijen.push({ slot: s, r, co });
  }
  return rijen;
}

const md = (t) => String(t).replace(/\|/g, '/');

export function mdIndeling() {
  const o = [];
  o.push('# Controllerindeling in het spel (22-11)');
  o.push('');
  o.push('Gegenereerd met `node scripts/controller_ingame_doc.mjs --schrijf` uit `game/js/controls.js` (PAD_MAPS, PAD_COOP, het acties-wiel) en de inventaris van `scripts/controller_ingame_audit.mjs`; niet met de hand bijwerken. Een printbare versie staat in [CONTROLLER-CHEATSHEET-22-11.html](CONTROLLER-CHEATSHEET-22-11.html). Bevindingen en open punten: [CONTROLLER-REVIEW-22-11-ingame.md](CONTROLLER-REVIEW-22-11-ingame.md).');
  o.push('');
  o.push('## Regels die overal gelden');
  o.push('');
  o.push('- Knopnamen zijn die van de Xbox-indeling (A onderaan). PlayStation: Kruis, Rondje, Vierkant, Driehoek, L1, R1, L2, R2, L3, R3, Delen, Opties. Nintendo: A en B, X en Y wisselen van plek, LB en RB zijn L en R, LT en RT zijn ZL en ZR. Steam Deck: als Xbox, schouders L1 en R1.');
  o.push('- **Overzicht** (View) kort indrukken is de kaart. **Houd Overzicht ' + (WHEEL_HOLD_MS / 1000).toLocaleString('nl-NL') + ' seconde** voor het acties-wiel met alles wat in die situatie geen eigen knop heeft: kies met de linkerstick of de D-pad, A bevestigt, B (of Menu, of Overzicht nog eens) sluit, LB en RB bladeren naar de volgende pagina.');
  o.push('- Wie niet kan houden zet bij Instellingen de tikstand (rennen, richten of beide) aan: dan opent één tik op Overzicht het wiel en staat de kaart er als eerste onderdeel in.');
  o.push('- **Menu** (Start) opent en sluit het pauzemenu met de telefoon. In het menu is B terug, LB en RB wisselen van onderdeel, de triggers zoomen op de kaart.');
  o.push('- Elke knop is te verplaatsen bij Instellingen > Besturing; het wiel volgt dat vanzelf, want het stuurt dezelfde toetsen als het toetsenbord. Een oude herbinding blijft gewoon werken: er is niets aan opslag of knopnamen veranderd.');
  o.push('- Het wiel blijft in menu\'s en minigames weg: daar is Overzicht gewoon de kaart of de eigen knop van het spel.');
  o.push('');
  o.push('## Per situatie');
  for (const [ctx, naam] of Object.entries({ ...SITUATIES, ...ACTIVITEITEN })) {
    const map = PAD_MAPS[ctx];
    o.push('');
    o.push(`### ${naam} (\`${ctx}\`)`);
    o.push('');
    o.push('| Knop | Doet | Toets op het toetsenbord | Samen spelen |');
    o.push('| --- | --- | --- | --- |');
    if (map.stick && STICK[map.stick]) o.push(`| Linkerstick | ${stickTekst(ctx, map.stick)} | ${map.stick === 'move' ? 'W A S D' : map.stick === 'steer' ? 'A D' : 'pijltjes'} | |`);
    for (const { slot, r, co } of situatieRijen(ctx)) {
      o.push(`| ${slotNaam(slot)} | ${r ? md(r.tekst) : '(niets)'} | ${r ? md(r.toets) : ''} | ${co ? md(co.tekst) + ' (' + md(co.toets) + ')' : ''} |`);
    }
    if (WHEEL_CTX.includes(ctx)) {
      const pag = wheelItemsFor(ctx, { samen: true, tap: true });
      o.push('');
      for (const p of pag) o.push(`Wiel, ${p.title}: ${p.items.map((it) => `${it.label} (${it.shift ? 'Shift + ' : ''}${it.alt ? 'Alt + ' : ''}${it.action ? 'N vasthouden' : keyName(it.key)}${it.samen ? ', alleen Samen spelen' : ''})`).join(', ')}.`);
    }
  }
  return o.join('\n') + '\n';
}

const KORT = { foot: 'Voet', hengelen: 'Water', vehicle: 'Auto', vehicleManual: 'Hand', bus: 'Bus', skutsje: 'Boot', trekker: 'Trekker', heli: 'Heli', plane: 'Vliegtuig', pigeon: 'Duif', train: 'Trein' };

/** Per actie waar ze op de controller zit, per situatie (zonder Samen spelen; met een sessie wijken enkele knoppen, zie de situatietabellen). */
export function mdPerActie() {
  const o = [];
  o.push('## Per actie, over alle situaties');
  o.push('');
  o.push('Een streepje: de actie bestaat in die situatie niet. Wiel: houd Overzicht. Knoppen in een Samen-spelen-sessie staan bij de situatie hierboven.');
  o.push('');
  o.push(`| Groep | Actie | Toets | ${Object.keys(SITUATIES).map((c) => KORT[c]).join(' | ')} |`);
  o.push(`| --- | --- | --- | ${Object.keys(SITUATIES).map(() => '---').join(' | ')} |`);
  for (const a of ACTIES) {
    const cel = Object.keys(SITUATIES).map((c) => (a.ctx.includes(c) ? (plek(a, c, { samen: !!a.samen }) ? slotNaam(plek(a, c, { samen: !!a.samen })) : 'geen') : '-'));
    const toets = (a.shift ? 'Shift + ' : '') + (a.alt ? 'Alt + ' : '') + ({ lmb: 'LMB', rmb: 'RMB', wheel: 'WHEEL', mouse: 'MOUSE' }[a.key] || keyName(a.key));
    o.push(`| ${a.groep} | ${md(a.label)}${a.samen ? ' (Samen spelen)' : ''} | ${md(toets)} | ${cel.join(' | ')} |`);
  }
  const uitz = Object.entries(ZONDER_PAD);
  o.push('');
  o.push('Acties zonder knop, bewust:');
  o.push('');
  for (const [id, u] of uitz) o.push(`- ${ACTIES.find((a) => a.id === id).label}: ${u.reden}`);
  return o.join('\n') + '\n';
}

// ---- de cheatsheet: een pagina per situatiegroep, DS3-stijl (papier, inktrand, harde schaduw), zonder scripts en zonder externe bestanden ----
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `
@page { size: A4 landscape; margin: 10mm; }
:root { --inkt: #1d1b17; --papier: #f3ead3; --bord: #0e6b3c; --sel: #dcebdd; }
* { box-sizing: border-box; }
body { margin: 0; padding: 16px; background: var(--papier); color: var(--inkt); font: 14px/1.35 'Atkinson Hyperlegible', Arial, sans-serif; }
h1 { margin: 0 0 4px; font: 800 30px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; color: var(--bord); letter-spacing: .02em; text-transform: uppercase; }
h2 { margin: 0 0 6px; font: 800 20px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; color: var(--bord); text-transform: uppercase; }
p.intro { margin: 0 0 12px; max-width: 70em; }
.raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; }
.kaart { background: var(--papier); border: 2.5px solid var(--inkt); border-radius: 10px; box-shadow: 4px 4px 0 var(--inkt); padding: 10px 12px; break-inside: avoid; }
table { width: 100%; border-collapse: collapse; }
td { padding: 2px 0; vertical-align: top; border-bottom: 1px dashed var(--inkt); }
tr:last-child td { border-bottom: 0; }
td.k { width: 7.6em; white-space: nowrap; }
.knop { display: inline-block; min-width: 2.4em; padding: 0 .4em; border: 2px solid var(--inkt); border-radius: 8px; background: #fff; font-weight: 700; text-align: center; box-shadow: 2px 2px 0 var(--inkt); }
.knop.wiel { background: var(--sel); border-color: var(--bord); }
.klein { font-size: 12px; color: var(--inkt); }
.regel { margin-top: 12px; padding: 8px 12px; border: 2.5px solid var(--bord); border-radius: 10px; background: var(--sel); max-width: 70em; }
@media print { body { padding: 0; } .kaart { box-shadow: none; } }
`;

const KAARTEN = ['foot', 'vehicle', 'vehicleManual', 'bus', 'skutsje', 'trekker', 'heli', 'plane', 'pigeon', 'train', 'hengelen'];

export function htmlCheatsheet() {
  const o = [];
  o.push('<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Controller-cheatsheet, Zomer vol misdaad</title>');
  o.push(`<style>${CSS}</style></head><body>`);
  o.push('<h1>Controller-cheatsheet</h1>');
  o.push('<p class="intro">Zomer vol misdaad. Gegenereerd uit de bron (scripts/controller_ingame_doc.mjs): niet met de hand bijwerken. Knopnamen van de Xbox-indeling; PlayStation: Kruis, Rondje, Vierkant, Driehoek, L1, R1, L2, R2; Nintendo: A en B en ook X en Y wisselen van plek.</p>');
  o.push(`<div class="regel"><b>Houd Overzicht ${esc((WHEEL_HOLD_MS / 1000).toLocaleString('nl-NL'))} seconde</b>: het acties-wiel met alles zonder eigen knop (radio, kleren, filmcamera, waypoint, roepjes). Stick of D-pad kiest, <b>A</b> bevestigt, <b>B</b> sluit, <b>LB</b>/<b>RB</b> bladeren. Een korte tik is de kaart. Met de tikstand (Instellingen) opent een tik het wiel. <b>Menu</b> is het pauzemenu met de telefoon.</div>`);
  o.push('<div class="raster" style="margin-top:14px">');
  for (const ctx of KAARTEN) {
    const map = PAD_MAPS[ctx];
    o.push(`<section class="kaart"><h2>${esc(labelVan(ctx))}</h2><table>`);
    if (STICK[map.stick]) o.push(`<tr><td class="k"><span class="knop">Linkerstick</span></td><td>${esc(stickTekst(ctx, map.stick))}</td></tr>`);
    for (const { slot, r, co } of situatieRijen(ctx)) {
      if (!r) continue;
      o.push(`<tr><td class="k"><span class="knop">${esc(slotNaam(slot))}</span></td><td>${esc(r.tekst)}${co ? `<div class="klein">Samen spelen: ${esc(co.tekst)}</div>` : ''}</td></tr>`);
    }
    const pag = wheelItemsFor(ctx, { samen: true });
    if (pag.length) o.push(`<tr><td class="k"><span class="knop wiel">Wiel</span></td><td>${esc(pag.flatMap((p) => p.items.map((it) => it.label)).join(', '))}</td></tr>`);
    o.push('</table></section>');
  }
  o.push('</div></body></html>');
  return o.join('\n') + '\n';
}

export function alles() {
  return { md: mdIndeling() + '\n' + mdPerActie(), html: htmlCheatsheet() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const x = alles();
  if (process.argv.includes('--schrijf')) {
    writeFileSync(MD_PAD, x.md); writeFileSync(HTML_PAD, x.html);
    console.log('geschreven: docs/CONTROLLER-INDELING-22-11.md en docs/CONTROLLER-CHEATSHEET-22-11.html');
  } else {
    const oud = (u) => (existsSync(u) ? readFileSync(u, 'utf8') : '');
    const goed = oud(MD_PAD) === x.md && oud(HTML_PAD) === x.html;
    console.log(goed ? 'controller_ingame_doc: de documenten kloppen met de bron' : 'controller_ingame_doc: de documenten lopen achter; draai met --schrijf');
    process.exit(goed ? 0 : 1);
  }
}
