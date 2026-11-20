// SFX ronde 3 (#988, ADR 0039): Freesound-previews (CC0 en CC-BY 3.0/4.0) uit een of meer inbox-mappen van scripts/audio/freesound_fetch.mjs
// naar game/audio/sfx/*.ogg. Eenmalige klanken: stilte aan begin en eind weg (drempel 45 dB onder de piek), korte fade-in en cosinus-fade-uit,
// niveau op RMS. Lussen: het beste venster zoeken (kleinste niveaustap en sprong over de naad), nuldoorgang en gelijk-vermogen-kruisfade.
//   node scripts/audio/master_sfx_ronde3.mjs --bron=<inbox>[,<inbox>] [--alleen=<sleutel>]
// Voegt alleen zijn eigen sleutels toe aan game/audio/sfx/manifest.json (daarna: node scripts/audio/licenties_bouw.mjs --write).
// De keuze van bron en venster is op titel en meting (niveau, spectrum, stabiliteit), niet op gehoor: zie docs/SFX-LUISTERLIJST.md.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakLus, meetNaad } from './master_sfx_voertuigen.mjs';
import { vindBron, schrijfOgg, SR } from './stap_knip.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d;
const BRON = arg('bron', '').split(',').filter(Boolean);
const ALLEEN = arg('alleen', '').split(',').filter(Boolean);
const UIT = path.join(ROOT, 'game', 'audio', 'sfx');

// id: Freesound-id; knip: [start, duur] in s (weglaten = geheel); loop: naadloos met kruisfade kruis (s); rms: doelniveau dB; hp/lp: Hz; fade: [in, uit] s;
// gebruik: Nederlandse omschrijving (komt in de credits van het spel: geen merknamen).
export const GELUIDEN = {
  kassa_koop: { id: 878619, rms: -20, hp: 120, lp: 14000, gebruik: 'kassa bij een aankoop (ka-ching)' },
  winkelbel_deur: { id: 192761, rms: -22, hp: 300, lp: 14000, gebruik: 'winkelbel boven de deur' },
  deur_hout_open_op: { id: 216878, knip: [0, 2.2], rms: -22, hp: 80, lp: 12000, gebruik: 'houten deur die piepend opengaat' },
  deur_hout_dicht_op: { id: 537737, rms: -21, hp: 60, lp: 12000, gebruik: 'houten deur die dichtvalt' },
  deur_huis_dicht_op: { id: 369620, rms: -21, hp: 60, lp: 12000, gebruik: 'huisdeur die dichtvalt' },
  plons_groot: { id: 442773, rms: -19, hp: 80, lp: 14000, fade: [0.004, 0.25], gebruik: 'grote plons in water' },
  scheepshoorn_op: { id: 636075, knip: [0, 4.6], rms: -20, hp: 50, lp: 8000, fade: [0.03, 0.6], gebruik: 'scheepshoorn van een groot schip' },
  camera_sluiter: { id: 270435, rms: -22, hp: 200, lp: 14000, gebruik: 'sluiter van een fototoestel' },
  alarm_loeit: { id: 563284, knip: [0, 4.0], rms: -22, hp: 200, lp: 10000, fade: [0.01, 0.4], gebruik: 'alarmbel die loeit' },
  vuurwerk_knal_0: { id: 445237, knip: [0, 3.4], rms: -22, hp: 60, lp: 14000, fade: [0.004, 0.8], gebruik: 'vuurwerk: knal met geknetter' },
  vuurwerk_knal_1: { id: 140727, rms: -22, hp: 60, lp: 14000, fade: [0.004, 0.8], gebruik: 'vuurwerk: mortier en knal' },
  trein_remmen_piep: { id: 23641, knip: [0, 5.2], rms: -22, hp: 150, lp: 12000, fade: [0.05, 0.8], gebruik: 'trein die remt (piepende wielen)' },
  dier_koe: { id: 700378, rms: -21, hp: 80, lp: 9000, fade: [0.01, 0.15], gebruik: 'koe die loeit' },
  dier_schaap: { id: 172712, rms: -21, hp: 150, lp: 10000, fade: [0.01, 0.15], gebruik: 'schaap dat blaat' },
  dier_paard: { id: 269571, rms: -21, hp: 150, lp: 10000, fade: [0.01, 0.2], gebruik: 'paard dat hinnikt' },
  dier_eend: { id: 418509, rms: -21, hp: 200, lp: 10000, fade: [0.005, 0.1], gebruik: 'eend die kwaakt' },
  dier_meeuw_0: { id: 463034, knip: [0, 1.6], rms: -21, hp: 500, lp: 12000, fade: [0.01, 0.2], gebruik: 'meeuw die roept' },
  dier_meeuw_1: { id: 463034, knip: [4.4, 2.0], rms: -21, hp: 500, lp: 12000, fade: [0.01, 0.25], gebruik: 'meeuw die roept (tweede)' },
  trein_hoorn_kort: { id: 647666, rms: -20, hp: 100, lp: 9000, fade: [0.01, 0.25], gebruik: 'trein: hoorn, twee korte stoten' },
  trein_hoorn_lang: { id: 647668, rms: -20, hp: 100, lp: 9000, fade: [0.01, 0.4], gebruik: 'trein: hoorn, een lange stoot' },
  tram_bel_op_0: { id: 497557, rms: -22, hp: 300, lp: 14000, fade: [0.004, 0.2], gebruik: 'tram die belt (kort)' },
  tram_bel_op_1: { id: 497561, rms: -22, hp: 300, lp: 14000, fade: [0.004, 0.3], gebruik: 'tram die belt (lang)' },
  bus_halte_ding: { id: 419491, rms: -23, hp: 200, lp: 14000, fade: [0.004, 0.3], gebruik: 'ding van een halte (de bus stopt)' },
  bus_deur_sis: { id: 250633, rms: -24, hp: 80, lp: 12000, fade: [0.01, 0.2], gebruik: 'deuren van een bus die opengaan' },
  ui_klik: { id: 528561, rms: -26, hp: 300, lp: 14000, fade: [0.002, 0.03], gebruik: 'zachte klik van een knop in het menu' },
  motor_diesel_stationair: { id: 149193, knip: [0, 12], loop: true, kruis: 0.3, rms: -24, hp: 40, lp: 8000, gebruik: 'trekker of bus: dieselmotor op stationair onder de motorsynth (lus, toonhoogte volgt het toerental)' },
  kermis_lawaai: { id: 353221, knip: [0, 10], loop: true, kruis: 0.6, rms: -26, hp: 100, lp: 10000, gebruik: 'kermis: drukte, attracties en muziek op afstand (lus)' },
  stad_nacht_nl: { id: 815527, knip: [0, 30], loop: true, kruis: 1.0, rms: -24, hp: 40, lp: 6000, gebruik: 'Nederlandse stad in de nacht: verkeer op afstand (lus)' },
  ruimte_binnen: { id: 473723, knip: [0, 20], loop: true, kruis: 1.0, rms: -26, hp: 40, lp: 8000, gebruik: 'kamertoon binnen: keuken overdag (lus)' },
  golfjes_oever: { id: 376796, knip: [0, 16], loop: true, kruis: 0.6, rms: -26, hp: 100, lp: 9000, gebruik: 'kleine golfjes tegen de oever en de kade (lus)' },
  menigte_gemurmel: { id: 457043, knip: [0, 12], loop: true, kruis: 0.5, rms: -26, hp: 120, lp: 8000, gebruik: 'gemurmel van een menigte (lus)' },
  kikkers_nacht: { id: 586934, knip: [0, 18], loop: true, kruis: 0.6, rms: -28, hp: 300, lp: 10000, gebruik: 'kikkers aan het water in de zomernacht (lus)' },
};

const lees = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function decodeer(bestand, g, extra = 0) {
  const f = [];
  if (g.knip) f.push(`atrim=start=${g.knip[0]}:duration=${g.knip[1] + extra}`, 'asetpts=PTS-STARTPTS');
  f.push(`highpass=f=${g.hp || 40}`, `lowpass=f=${g.lp || 14000}`);
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', bestand, '-af', f.join(','), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
}

// stilte aan begin en eind weg: venster van 5 ms, drempel 45 dB onder de piek; een staart van 60 ms blijft staan
export function trimStilte(x, db = 45) {
  const w = Math.round(0.005 * SR);
  let pk = 0;
  for (const s of x) pk = Math.max(pk, Math.abs(s));
  const thr = pk * Math.pow(10, -db / 20);
  const sterk = (i) => { let m = 0; for (let j = i; j < Math.min(x.length, i + w); j++) m = Math.max(m, Math.abs(x[j])); return m > thr; };
  let a = 0, b = x.length - 1;
  while (a < x.length - w && !sterk(a)) a += w;
  while (b > a && !sterk(Math.max(0, b - w))) b -= w;
  return x.slice(Math.max(0, a - Math.round(0.002 * SR)), Math.min(x.length, b + Math.round(0.06 * SR)));
}

function beste(bestand, g) {
  const vol = decodeer(bestand, { hp: g.hp, lp: g.lp });
  const kr = Math.round(g.kruis * SR), n = Math.round((g.knip[1] + g.kruis) * SR), stap = Math.round(0.25 * SR);
  const lo = Math.round(g.knip[0] * SR), hi = vol.length - n;
  let best = null;
  for (let st = lo; st <= hi; st += stap) {
    const lus = maakLus(Float32Array.from(vol.subarray(st, st + n)), kr), m = meetNaad(lus);
    const score = Math.abs(m.niveaustapDb) + 2 * Math.min(5, m.sprongRatio);
    if (!best || score < best.score) best = { st, score };
  }
  return best ? best.st / SR : g.knip[0];
}

function normaliseer(x, doelDb, piekDb = -1.5) {
  let e = 0, pk = 0;
  for (const s of x) { e += s * s; pk = Math.max(pk, Math.abs(s)); }
  const rms = Math.sqrt(e / x.length) + 1e-12;
  let gain = Math.pow(10, doelDb / 20) / rms, begrensd = false;
  if (gain * pk > Math.pow(10, piekDb / 20)) { gain = Math.pow(10, piekDb / 20) / (pk + 1e-12); begrensd = true; }
  for (let i = 0; i < x.length; i++) x[i] *= gain;
  return { rmsDb: 20 * Math.log10(rms * gain), pkDb: 20 * Math.log10(pk * gain + 1e-12), begrensd };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!BRON.length) throw new Error('--bron=<inbox> nodig');
  const mp = path.join(UIT, 'manifest.json');
  const man = lees(mp);
  const rapport = [];
  for (const [k, g] of Object.entries(GELUIDEN)) {
    if (ALLEEN.length && !ALLEEN.includes(k)) continue;
    const { bestand, meta: metaPad } = vindBron(BRON, g.id);
    const meta = lees(metaPad);
    if (g.loop) g.knip = [beste(bestand, g), g.knip[1]];
    let x = decodeer(bestand, g, g.loop ? g.kruis : 0), naad = null;
    if (g.loop) { x = maakLus(x, Math.round(g.kruis * SR)); naad = meetNaad(x); }
    else {
      x = trimStilte(x);
      const [fi, fu] = g.fade || [0.004, 0.06];
      const ni = Math.round(fi * SR), nu = Math.min(Math.round(fu * SR), x.length);
      for (let i = 0; i < ni && i < x.length; i++) x[i] *= i / ni;
      for (let i = 0; i < nu; i++) x[x.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / nu);
    }
    const niv = normaliseer(x, g.rms);
    const dst = path.join(UIT, `${k}.ogg`);
    schrijfOgg(x, dst, 2);
    const kb = Math.round(fs.statSync(dst).size / 102.4) / 10;
    const lic = /zero/.test(meta.licentie) ? 'Creative Commons 0 (CC0 1.0)' : /by\/3\.0/.test(meta.licentie) ? 'Creative Commons Attribution 3.0' : 'Creative Commons Attribution 4.0';
    const licUrl = lic.includes('CC0') ? 'https://creativecommons.org/publicdomain/zero/1.0/' : `https://creativecommons.org/licenses/by/${lic.endsWith('3.0') ? '3.0' : '4.0'}/`;
    man.geluiden[k] = { bestand: `${k}.ogg`, gebruik: g.gebruik, loop: !!g.loop, duur_s: Math.round((x.length / SR) * 100) / 100, grootte_kb: kb,
      herkomst: { titel: meta.titel || meta.naam, auteur: meta.auteur, freesound_id: meta.id, url: `https://freesound.org/people/${meta.auteur}/sounds/${meta.id}/`, licentie: lic, licentie_url: licUrl, datum: meta.opgehaald, bron_sha256: meta.sha256 },
      knip_s: g.knip ? { start: Math.round(g.knip[0] * 100) / 100, duur: g.knip[1] } : null,
      ...(naad ? { naad: { sprong_ratio: Math.round(naad.sprongRatio * 100) / 100, niveaustap_db: Math.round(naad.niveaustapDb * 100) / 100, kruisfade_ms: Math.round(g.kruis * 1000) } } : {}),
      niveau: { rms_db: Math.round(niv.rmsDb * 10) / 10, piek_db: Math.round(niv.pkDb * 10) / 10 },
      bewerking: `ffmpeg en eigen script: ${g.knip ? 'knippen, ' : ''}hoogdoorlaat ${g.hp || 40} Hz, laagdoorlaat ${(g.lp || 14000) / 1000} kHz, mono 44,1 kHz${g.loop ? `, naadloze lus (nuldoorgang, gelijk-vermogen-kruisfade ${Math.round(g.kruis * 1000)} ms)` : ', stilte aan begin en eind weg, fade-in en cosinus-fade-uit'}, niveau RMS ${g.rms} dB${niv.begrensd ? ' (piekbegrenzing -1,5 dB)' : ''}, ogg (Vorbis q2)` };
    rapport.push(`${k.padEnd(22)} ${String(man.geluiden[k].duur_s).padStart(5)} s ${String(kb).padStart(6)} kB  rms ${niv.rmsDb.toFixed(1)}  pk ${niv.pkDb.toFixed(1)}${niv.begrensd ? ' (begrensd)' : ''}${naad ? `  naad: sprong x${naad.sprongRatio.toFixed(2)}, stap ${naad.niveaustapDb.toFixed(2)} dB` : ''}  [${/zero/.test(meta.licentie) ? 'CC0' : 'CC-BY'} ${meta.auteur}]`);
  }
  man.geluiden = Object.fromEntries(Object.entries(man.geluiden).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(mp, JSON.stringify(man, null, 2) + '\n');
  console.log(rapport.join('\n'));
}
