// Keurt het veldeigenaarschap van het wereldobject (#498).
//
// `game/js/world.js` is één gedeelde doos waar honderden modules in schrijven.
// Deze audit telt per veld (`world.<veld>`) wie er schrijft en hoe vaak er
// gelezen wordt, en legt die stand vast in twee bestanden:
//
//   scripts/world_eigenaar.json           het register: wie hoort dit veld te
//                                        bezitten, en welke uitzonderingen zijn
//                                        bewust toegestaan (met reden en issue)
//   scripts/world_eigenaar_baseline.json de gemeten stand: per veld het aantal
//                                        schrijvende bestanden. Alleen omlaag.
//
// Wat als schrijfactie telt: `=`, `+=`, `-=`, `*=`, `/=`, `%=`, `**=`, `<<=`,
// `>>=`, `>>>=`, `&=`, `|=`, `^=`, `&&=`, `||=`, `??=`, `++`, `--` (voor of na
// het veld), `delete world.veld`, een array-mutatie (`push`, `pop`, `shift`,
// `unshift`, `splice`, `sort`, `fill`, `reverse`, `copyWithin`) en
// `world.veld.length = ...`.
// Al het andere is een leesactie. `===`, `!==`, `==`, `>=` en `=>` zijn geen
// schrijfacties, en een aanroep `world.veld(...)` is een methode van de klasse,
// geen gegevenveld; die telt niet mee.
//
// Bewuste beperking: alleen de letterlijke spelling `world.<veld>` telt. Een
// alias (`const w = world; w.money`) of `this.<veld>` binnen de klasse valt
// buiten de meting. Dat is dezelfde maat als de verkenning van 27-10, zodat de
// cijfers vergelijkbaar blijven; de alias `w` is projectbreed de wereldparameter
// en zou de telling vertroebelen met lokale objecten.
//
// Gebruik:
//   node scripts/world_eigenaar.mjs            keurt tegen register en basislijn
//   node scripts/world_eigenaar.mjs --verbose  met de top van schrijvende velden
//   node scripts/world_eigenaar.mjs --json     machineleesbare uitvoer
//   node scripts/world_eigenaar.mjs --update   verlaagt de basislijn
//
// Exit 1 bij een fout, 0 bij groen. Het script schrijft nooit naar `game/`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_DIR = path.join(ROOT, 'game', 'js');
export const DEFAULT_BASELINE = path.join(ROOT, 'scripts', 'world_eigenaar_baseline.json');
export const DEFAULT_REGISTER = path.join(ROOT, 'scripts', 'world_eigenaar.json');

// Een schrijfactie direct achter de veldnaam.
const WRITE_TAIL = /^\s*(?:(?:<<|>>>|>>|\*\*|[+\-*/%&|^]|\?\?|&&|\|\|)?=(?![=>])|\+\+|--)/;
// Een array-mutatie op het veld zelf.
const ARRAY_TAIL = /^\s*(?:\?\.|\.)(?:push|pop|shift|unshift|splice|sort|fill|reverse|copyWithin)\s*\(/;
// `world.veld.length = 0` en vrienden.
const LENGTH_TAIL = /^\s*(?:\?\.|\.)length\s*(?:(?:[+\-*/%&|^])?=(?![=>])|\+\+|--)/;
const FIELD = /(?<![\w$.])world\s*\.\s*([A-Za-z_$][\w$]*)/g;
// Een methodeaanroep op de wereld is geen gegevenveld.
const METHOD_TAIL = /^\s*\(/;

// Vervangt commentaar, strings, template-tekst en regexen door spaties, zodat
// alleen echte code overblijft. Zelfde aanpak als scripts/player_singleton_audit.mjs:
// de inhoud van een `${...}` in een template is code en blijft staan.
export function maskSource(src) {
  const out = src.split('');
  const n = src.length;
  const modes = ['code']; // 'code' of 'tpl'
  const braces = []; // diepte van een ${...} in een template
  let i = 0;
  const blank = (a, b) => { for (let k = a; k < b && k < n; k++) if (out[k] !== '\n') out[k] = ' '; };
  const prevSig = (at) => {
    for (let k = at - 1; k >= 0; k--) { const c = src[k]; if (!/\s/.test(c)) return c; }
    return '';
  };
  const regexStart = (at) => {
    const p = prevSig(at);
    return p === '' || '(,=:[!&|?{};+-*%<>~^'.includes(p);
  };
  while (i < n) {
    const c = src[i];
    if (modes[modes.length - 1] === 'tpl') {
      if (c === '\\') { blank(i, i + 2); i += 2; continue; }
      if (c === '`') { modes.pop(); i++; continue; }
      if (c === '$' && src[i + 1] === '{') { modes.push('code'); braces.push(0); i += 2; continue; }
      blank(i, i + 1); i++; continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      let j = src.indexOf('\n', i); if (j < 0) j = n;
      blank(i, j); i = j; continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2;
      blank(i, j); i = j; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') j += 2;
        else if (src[j] === c) { j++; break; }
        else j++;
      }
      blank(i + 1, j - 1); i = j; continue;
    }
    if (c === '/' && regexStart(i)) {
      let j = i + 1, inClass = false;
      while (j < n) {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) { j++; break; }
        else if (d === '\n') break;
        j++;
      }
      blank(i + 1, j - 1); i = j; continue;
    }
    if (c === '`') { modes.push('tpl'); i++; continue; }
    if (braces.length) {
      if (c === '{') braces[braces.length - 1]++;
      else if (c === '}') {
        if (braces[braces.length - 1] === 0) { braces.pop(); modes.pop(); i++; continue; }
        braces[braces.length - 1]--;
      }
    }
    i++;
  }
  return out.join('');
}

// Aantal schrijf- en leesacties per veld in één bronbestand.
export function analyseSource(src) {
  const masked = maskSource(src);
  const velden = {};
  const tel = (veld) => (velden[veld] ||= { schrijf: 0, lees: 0 });
  FIELD.lastIndex = 0;
  let m;
  while ((m = FIELD.exec(masked))) {
    const veld = m[1];
    const rest = masked.slice(m.index + m[0].length);
    if (METHOD_TAIL.test(rest)) continue; // world.methode(...), geen veld
    const voor = masked.slice(Math.max(0, m.index - 16), m.index);
    const isSchrijf = /(?:^|[^\w$])(?:delete|(?:\+\+|--))\s*$/.test(voor)
      || WRITE_TAIL.test(rest)
      || ARRAY_TAIL.test(rest)
      || LENGTH_TAIL.test(rest);
    const t = tel(veld);
    if (isSchrijf) t.schrijf++;
    else t.lees++;
  }
  return velden;
}

function keyFor(file, dir) {
  const rel = path.relative(ROOT, file);
  const bruikbaar = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  return (bruikbaar ? rel : path.relative(dir, file)).split(path.sep).join('/');
}

// Alle JS-bestanden onder een map, met per veld de schrijvende bestanden en de
// aantallen schrijf- en leesacties. Bestanden zonder `world.` tellen niet mee.
export function scanDir(dir) {
  const velden = {};
  const bestanden = [];
  const walk = (d) => {
    for (const name of fs.readdirSync(d).sort()) {
      if (name === 'node_modules' || name === '.git') continue;
      const p = path.join(d, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) { walk(p); continue; }
      if (!name.endsWith('.js')) continue;
      const key = keyFor(p, dir);
      bestanden.push(key);
      const perVeld = analyseSource(fs.readFileSync(p, 'utf8'));
      for (const [veld, t] of Object.entries(perVeld)) {
        const v = (velden[veld] ||= { schrijf: 0, lees: 0, schrijvers: {} });
        v.schrijf += t.schrijf;
        v.lees += t.lees;
        if (t.schrijf > 0) v.schrijvers[key] = t.schrijf;
      }
    }
  };
  walk(dir);
  return { bestanden, velden };
}

// Veldnaam -> aantal schrijvende bestanden (alleen velden met schrijvers).
export function schrijverAantal(meting) {
  const out = {};
  for (const [veld, v] of Object.entries(meting.velden)) {
    const n = Object.keys(v.schrijvers).length;
    if (n > 0) out[veld] = n;
  }
  return out;
}

// Velden die wel geschreven maar nooit gelezen worden: kandidaten voor verwijdering.
export function dodeVelden(meting) {
  return Object.entries(meting.velden)
    .filter(([, v]) => v.schrijf > 0 && v.lees === 0)
    .map(([veld]) => veld)
    .sort();
}

export const GEDEELD = 'gedeeld, alleen lezen';
export const NOG_GEEN = 'nog geen eigenaar';
export const DOOD = 'geen, dood veld';
const EIGENAAR_KEUZES = new Set([GEDEELD, NOG_GEEN, DOOD]);

// Structuur van het register: elke uitzondering heeft veld, bestand, max, reden
// en issue; veld en bestand moeten bestaan. Dubbele regels zijn fout.
export function validateRegister(register, meting, bestanden = null) {
  const fouten = [];
  const bekend = new Set(Object.keys(meting.velden));
  const files = bestanden || new Set(meting.bestanden || Object.keys(bestandenUitMeting(meting)));
  const velden = register.velden || {};
  for (const [veld, regel] of Object.entries(velden)) {
    if (!bekend.has(veld)) fouten.push(`register: veld '${veld}' komt in de code niet voor`);
    const eigenaar = regel && regel.eigenaar;
    if (!eigenaar) fouten.push(`register: veld '${veld}' heeft geen eigenaar`);
    else if (!EIGENAAR_KEUZES.has(eigenaar) && !files.has(eigenaar)) {
      fouten.push(`register: veld '${veld}' heeft een onbekende eigenaar '${eigenaar}'`);
    }
  }
  const gezien = new Set();
  (register.uitzonderingen || []).forEach((u, i) => {
    const naam = `uitzondering ${i + 1}${u && u.veld ? ` (${u.veld})` : ''}`;
    if (!u || typeof u !== 'object') { fouten.push(`register: ${naam} is geen object`); return; }
    if (!u.veld) fouten.push(`register: ${naam} mist een veld`);
    else if (!bekend.has(u.veld)) fouten.push(`register: ${naam} noemt een onbekend veld '${u.veld}'`);
    if (!u.bestand) fouten.push(`register: ${naam} mist een bestand`);
    else if (!files.has(u.bestand)) fouten.push(`register: ${naam} noemt een onbekend bestand '${u.bestand}'`);
    if (!Number.isInteger(u.max) || u.max < 1) fouten.push(`register: ${naam} heeft geen geldige max`);
    if (!u.reden || !String(u.reden).trim()) fouten.push(`register: ${naam} mist een reden`);
    if (!u.issue || !String(u.issue).trim()) fouten.push(`register: ${naam} mist een issue`);
    if (u.veld && u.bestand) {
      const sleutel = `${u.veld}\u0000${u.bestand}`;
      if (gezien.has(sleutel)) fouten.push(`register: ${naam} staat er dubbel in`);
      gezien.add(sleutel);
    }
  });
  return fouten;
}

// Aantal schrijfacties per bestand over alle velden, en de volledige bestandslijst
// uit de meting (ook modules die alleen lezen).
export function bestandenUitMeting(meting) {
  const out = {};
  for (const v of Object.values(meting.velden)) {
    for (const [bestand, n] of Object.entries(v.schrijvers)) out[bestand] = (out[bestand] || 0) + n;
  }
  return out;
}

// Keurt de eigendom: alleen de eigenaar schrijft, tenzij er een uitzondering met
// een maximum per bestand is. Een uitzondering die niet meer nodig is, is winst.
export function checkEigenaarschap(register, meting) {
  const fouten = [];
  const dalingen = [];
  const velden = register.velden || {};
  const uitzonderingen = new Map();
  for (const u of register.uitzonderingen || []) {
    if (!u || !u.veld || !u.bestand || !Number.isInteger(u.max)) continue;
    uitzonderingen.set(`${u.veld}\u0000${u.bestand}`, u);
  }
  for (const [veld, regel] of Object.entries(velden).sort(([a], [b]) => a.localeCompare(b))) {
    const eigenaar = regel.eigenaar;
    if (eigenaar === NOG_GEEN || eigenaar === DOOD) continue;
    const v = meting.velden[veld];
    if (!v) continue;
    for (const [bestand, n] of Object.entries(v.schrijvers)) {
      if (eigenaar !== GEDEELD && bestand === eigenaar) continue;
      const u = uitzonderingen.get(`${veld}\u0000${bestand}`);
      if (!u) {
        fouten.push(`${veld}: ${bestand} schrijft ${n} keer, maar de eigenaar is ${eigenaar}; voeg een uitzondering met reden en issue toe`);
      } else if (n > u.max) {
        fouten.push(`${veld}: ${bestand} schrijft ${n} keer, uitzondering staat op ${u.max} (+${n - u.max})`);
      } else if (n < u.max) {
        dalingen.push(`${veld}: ${bestand} schrijft ${n} keer, uitzondering staat op ${u.max} (-${u.max - n})`);
      }
    }
  }
  for (const u of register.uitzonderingen || []) {
    if (!u || !u.veld || !u.bestand) continue;
    const v = meting.velden[u.veld];
    if (!v || !(u.bestand in v.schrijvers)) dalingen.push(`${u.veld}: ${u.bestand} schrijft niet meer; de uitzondering mag weg`);
  }
  return { fouten, dalingen };
}

// Een veld dat het register als dood markeert, hoort nog steeds niet gelezen te
// worden; anders is de markering achterhaald.
export function checkDood(register, meting) {
  const fouten = [];
  for (const [veld, regel] of Object.entries(register.velden || {})) {
    if (!regel || regel.eigenaar !== DOOD) continue;
    const v = meting.velden[veld];
    if (!v) continue;
    if (v.lees > 0) fouten.push(`${veld}: staat als dood veld in het register maar heeft ${v.lees} leesacties; haal de markering weg`);
    if (v.schrijf === 0) fouten.push(`${veld}: staat als dood veld in het register maar wordt niet meer geschreven; haal het veld weg`);
  }
  return fouten;
}

// Vergelijkt de meting met de basislijn. Meer schrijvende bestanden per veld is
// een fout, minder is winst en vraagt om --update.
export function compareBaseline(meting, baseline) {
  const nu = schrijverAantal(meting);
  const basis = baseline.velden || {};
  const fouten = [];
  const dalingen = [];
  for (const [veld, n] of Object.entries(nu).sort(([a], [b]) => a.localeCompare(b))) {
    if (!(veld in basis)) fouten.push(`${veld}: ${n} schrijvende bestanden, staat niet in de basislijn`);
    else if (n > basis[veld]) fouten.push(`${veld}: ${n} schrijvende bestanden, basislijn ${basis[veld]} (+${n - basis[veld]})`);
    else if (n < basis[veld]) dalingen.push(`${veld}: ${n} schrijvende bestanden, basislijn ${basis[veld]} (-${basis[veld] - n})`);
  }
  for (const [veld, was] of Object.entries(basis).sort(([a], [b]) => a.localeCompare(b))) {
    if (!(veld in nu)) dalingen.push(`${veld}: geen schrijvers meer, basislijn ${was} (-${was})`);
  }
  return {
    fouten,
    dalingen,
    veldTotaal: Object.keys(meting.velden).length,
    schrijfVeldTotaal: Object.keys(nu).length,
    basisVeldTotaal: baseline.veldTotaal ?? Object.keys(basis).length,
  };
}

function leesJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const a = argv.find((v) => v.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
  const dir = path.resolve(opt('dir', DEFAULT_DIR));
  const baselineFile = path.resolve(opt('baseline', DEFAULT_BASELINE));
  const registerFile = path.resolve(opt('register', DEFAULT_REGISTER));
  const update = argv.includes('--update');
  const json = argv.includes('--json');
  const verbose = argv.includes('--verbose');
  if (!fs.existsSync(dir)) { console.error(`FOUT  map bestaat niet: ${dir}`); return 1; }

  const meting = scanDir(dir);
  const schrijvers = schrijverAantal(meting);
  const dood = dodeVelden(meting);

  if (update) {
    const bestond = fs.existsSync(baselineFile);
    const oud = bestond ? leesJson(baselineFile).velden || {} : {};
    const nieuw = {};
    const verlaagd = [];
    const nieuwVeld = [];
    for (const [veld, n] of Object.entries(schrijvers).sort(([a], [b]) => a.localeCompare(b))) {
      if (!(veld in oud)) { nieuw[veld] = n; nieuwVeld.push(veld); continue; }
      nieuw[veld] = Math.min(oud[veld], n);
      if (n < oud[veld]) verlaagd.push(`${veld}: ${n} (was ${oud[veld]})`);
    }
    const vervallen = Object.keys(oud).filter((v) => !(v in schrijvers));
    const basis = {
      version: 1,
      note: 'Aantal schrijvende bestanden per world-veld (#498), gemeten met scripts/world_eigenaar.mjs. Alleen omlaag; nieuwe velden worden op hun huidige stand opgenomen.',
      veldTotaal: Object.keys(meting.velden).length,
      velden: nieuw,
    };
    fs.writeFileSync(baselineFile, JSON.stringify(basis, null, 1) + '\n');
    console.log(`Basislijn bijgewerkt: ${Object.keys(nieuw).length} geschreven velden van ${Object.keys(meting.velden).length} (${path.relative(ROOT, baselineFile)}).`);
    for (const r of verlaagd) console.log(`OK    verlaagd ${r}`);
    for (const v of vervallen) console.log(`OK    vervallen ${v}`);
    for (const v of nieuwVeld) if (bestond) console.log(`LET OP nieuw veld in de basislijn: ${v} (${schrijvers[v]} schrijvende bestanden)`);
    return 0;
  }

  const fouten = [];
  const dalingen = [];

  if (!fs.existsSync(baselineFile)) fouten.push(`basislijn ontbreekt: ${path.relative(ROOT, baselineFile)}; maak hem met --update`);
  if (!fs.existsSync(registerFile)) fouten.push(`register ontbreekt: ${path.relative(ROOT, registerFile)}`);
  let basisVergelijking = null;
  if (fs.existsSync(baselineFile)) {
    basisVergelijking = compareBaseline(meting, leesJson(baselineFile));
    fouten.push(...basisVergelijking.fouten);
    dalingen.push(...basisVergelijking.dalingen);
  }
  if (fs.existsSync(registerFile)) {
    const register = leesJson(registerFile);
    fouten.push(...validateRegister(register, meting));
    const eigendom = checkEigenaarschap(register, meting);
    fouten.push(...eigendom.fouten);
    dalingen.push(...eigendom.dalingen);
    fouten.push(...checkDood(register, meting));
  }

  const totaal = Object.keys(meting.velden).length;
  const metSchrijvers = Object.keys(schrijvers).length;
  const uitzonderingen = fs.existsSync(registerFile) ? (leesJson(registerFile).uitzonderingen || []).length : 0;
  const bestandsTotaal = meting.bestanden.length;
  const kop = `world-eigenaar: ${totaal} velden in ${bestandsTotaal} bestanden, ${metSchrijvers} met schrijvers, ${dood.length} zonder lezer (wel geschreven), ${uitzonderingen} uitzonderingen`;

  if (json) {
    console.log(JSON.stringify({ veldTotaal: totaal, bestanden: bestandsTotaal, veldenMetSchrijvers: metSchrijvers, dood, uitzonderingen, basis: basisVergelijking, fouten, dalingen }, null, 1));
    return fouten.length ? 1 : 0;
  }

  console.log(kop);
  if (verbose) {
    const top = Object.entries(schrijvers).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20);
    for (const [veld, n] of top) console.log(`      ${String(n).padStart(3)}  ${veld}`);
    for (const veld of dood) {
      const schrijversVan = Object.keys(meting.velden[veld].schrijvers).join(', ');
      console.log(`DOOD  ${veld}: ${meting.velden[veld].schrijf} schrijfacties, 0 lezers in game/js (${schrijversVan})`);
    }
  }
  const uniek = [...new Set(dalingen)];
  for (const regel of uniek) console.log(`OK    ${regel}`);
  for (const regel of fouten) console.log(`FOUT  ${regel}`);
  if (uniek.length) console.log('Werk de basislijn bij met --update en haal vervallen uitzonderingen weg.');
  if (fouten.length) console.log('Geef elk veld één eigenaar, of leg de uitzondering met reden en issue vast in scripts/world_eigenaar.json.');
  return fouten.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) process.exit(main());
