// SFX ronde 4 (#988, ADR 0039): kleine opnames voor de missie-polish (regelkaart, publiek, startsein, kratten, weegbrug, perron, pannenkoeken,
// bezorgen, vissen, geld, deurbel, telefoon, kopje, sleutels, breken, druppels, UI). Zelfde bewerking als ronde 3 (master_sfx_ronde3.mjs):
// eenmalige klanken zonder stilte aan de randen, fade-in en cosinus-fade-uit, niveau op RMS, mono ogg.
//   node scripts/audio/master_sfx_ronde4.mjs --bron=<inbox>[,<inbox>] [--alleen=<sleutel>]
// Voegt alleen zijn eigen sleutels toe aan game/audio/sfx/manifest.json (daarna: node scripts/audio/licenties_bouw.mjs --write).
// De keuze is op titel en meting, niet op gehoor: zie docs/SFX-LUISTERLIJST.md (ronde 4).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeer, trimStilte, normaliseer } from './master_sfx_ronde3.mjs';
import { vindBron, schrijfOgg, SR } from './stap_knip.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d;
const BRON = arg('bron', '').split(',').filter(Boolean);
const ALLEEN = arg('alleen', '').split(',').filter(Boolean);
const UIT = path.join(ROOT, 'game', 'audio', 'sfx');

// id: Freesound-id; knip: [start, duur] s; rms: doelniveau dB; hp/lp: Hz; fade: [in, uit] s; gebruik: Nederlandse omschrijving (credits: geen merknamen).
export const GELUIDEN = {
  gejuich_0: { id: 764056, rms: -22, hp: 150, lp: 10000, fade: [0.02, 0.4], gebruik: 'publiek juicht kort (start of finish)' },
  gejuich_1: { id: 333405, knip: [0, 3.2], rms: -22, hp: 150, lp: 10000, fade: [0.02, 0.6], gebruik: 'publiek juicht (finish, uitslag)' },
  applaus_klein: { id: 619035, rms: -23, hp: 200, lp: 12000, fade: [0.01, 0.5], gebruik: 'klein applaus van een publiek' },
  klok_tik: { id: 810938, rms: -24, hp: 300, lp: 12000, fade: [0.002, 0.05], gebruik: 'tik van een klok (de laatste minuut)' },
  ei_breuk_0: { id: 150479, rms: -22, hp: 150, lp: 12000, fade: [0.002, 0.1], gebruik: 'een ei dat breekt' },
  ei_breuk_1: { id: 336613, knip: [0, 1.1], rms: -22, hp: 150, lp: 12000, fade: [0.002, 0.15], gebruik: 'een ei dat kraakt en breekt (tweede)' },
  kratten_klets: { id: 66779, rms: -21, hp: 80, lp: 12000, fade: [0.002, 0.15], gebruik: 'houten krat dat kletterend breekt (eierkratten)' },
  bel_uitslag: { id: 879808, rms: -22, hp: 300, lp: 14000, fade: [0.002, 0.3], gebruik: 'belletje van de balie: de bestelling is klaar' },
  haspel_draai: { id: 831928, knip: [0, 2.2], rms: -24, hp: 150, lp: 12000, fade: [0.02, 0.2], gebruik: 'hengelhaspel die draait (vis binnenhalen)' },
  dobber_plons: { id: 404829, knip: [0, 0.8], rms: -22, hp: 150, lp: 12000, fade: [0.004, 0.15], gebruik: 'kleine plons van een dobber of een worp in het water' },
  munten_0: { id: 19778, rms: -23, hp: 400, lp: 14000, fade: [0.002, 0.1], gebruik: 'muntjes die vallen' },
  munten_1: { id: 699521, rms: -23, hp: 400, lp: 14000, fade: [0.002, 0.08], gebruik: 'een munt die valt' },
  kopje_klink_0: { id: 568757, rms: -23, hp: 300, lp: 14000, fade: [0.002, 0.08], gebruik: 'kopje op een schotel' },
  kopje_klink_1: { id: 568758, rms: -23, hp: 300, lp: 14000, fade: [0.002, 0.1], gebruik: 'kopje op een schotel (tweede)' },
  ui_fout: { id: 701703, rms: -26, hp: 200, lp: 12000, fade: [0.002, 0.08], gebruik: 'zachte fout-klank in het menu' },
  stoomfluit: { id: 71778, rms: -21, hp: 200, lp: 10000, fade: [0.02, 0.5], gebruik: 'stoomfluit van een trein' },
  omroep_ding: { id: 724059, rms: -22, hp: 200, lp: 12000, fade: [0.004, 0.3], gebruik: 'omroepbel op het perron (ding-dong)' },
  toeter_start: { id: 414208, rms: -20, hp: 200, lp: 9000, fade: [0.01, 0.2], gebruik: 'toeter als startsein of eindsignaal' },
  fluitje: { id: 146887, knip: [0, 1.2], rms: -22, hp: 500, lp: 12000, fade: [0.01, 0.2], gebruik: 'fluitje als startsein of waarschuwing' },
  hydrauliek_sis: { id: 416080, knip: [0, 2.4], rms: -23, hp: 100, lp: 10000, fade: [0.02, 0.5], gebruik: 'hydraulische sis van een kantelende oplegger' },
  weegbrug_klik: { id: 740252, rms: -23, hp: 200, lp: 12000, fade: [0.002, 0.08], gebruik: 'mechanische klik van een weegbrug' },
  brievenbus_klep: { id: 398403, rms: -23, hp: 150, lp: 12000, fade: [0.002, 0.1], gebruik: 'brievenbusklep' },
  kaartje_schuif: { id: 536784, rms: -26, hp: 300, lp: 14000, fade: [0.002, 0.05], gebruik: 'kaartje of papier dat verschijnt (regelkaart)' },
  worp_lucht: { id: 422495, rms: -24, hp: 150, lp: 12000, fade: [0.004, 0.1], gebruik: 'worp door de lucht (krant, pakketje)' },
};

const lees = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!BRON.length) throw new Error('--bron=<inbox> nodig');
  const mp = path.join(UIT, 'manifest.json');
  const man = lees(mp);
  const rapport = [];
  for (const [k, g] of Object.entries(GELUIDEN)) {
    if (ALLEEN.length && !ALLEEN.includes(k)) continue;
    const { bestand, meta: metaPad } = vindBron(BRON, g.id);
    const meta = lees(metaPad);
    let x = trimStilte(decodeer(bestand, g));
    const [fi, fu] = g.fade || [0.004, 0.06];
    const ni = Math.round(fi * SR), nu = Math.min(Math.round(fu * SR), x.length);
    for (let i = 0; i < ni && i < x.length; i++) x[i] *= i / ni;
    for (let i = 0; i < nu; i++) x[x.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / nu);
    const niv = normaliseer(x, g.rms);
    const dst = path.join(UIT, `${k}.ogg`);
    schrijfOgg(x, dst, 2);
    const kb = Math.round(fs.statSync(dst).size / 102.4) / 10;
    const lic = /zero/.test(meta.licentie) ? 'Creative Commons 0 (CC0 1.0)' : /by\/3\.0/.test(meta.licentie) ? 'Creative Commons Attribution 3.0' : 'Creative Commons Attribution 4.0';
    const licUrl = lic.includes('CC0') ? 'https://creativecommons.org/publicdomain/zero/1.0/' : `https://creativecommons.org/licenses/by/${lic.endsWith('3.0') ? '3.0' : '4.0'}/`;
    man.geluiden[k] = { bestand: `${k}.ogg`, gebruik: g.gebruik, loop: false, duur_s: Math.round((x.length / SR) * 100) / 100, grootte_kb: kb,
      herkomst: { titel: meta.titel || meta.naam, auteur: meta.auteur, freesound_id: meta.id, url: `https://freesound.org/people/${meta.auteur}/sounds/${meta.id}/`, licentie: lic, licentie_url: licUrl, datum: meta.opgehaald, bron_sha256: meta.sha256 },
      knip_s: g.knip ? { start: g.knip[0], duur: g.knip[1] } : null,
      niveau: { rms_db: Math.round(niv.rmsDb * 10) / 10, piek_db: Math.round(niv.pkDb * 10) / 10 },
      bewerking: `ffmpeg en eigen script: ${g.knip ? 'knippen, ' : ''}hoogdoorlaat ${g.hp || 40} Hz, laagdoorlaat ${(g.lp || 14000) / 1000} kHz, mono 44,1 kHz, stilte aan begin en eind weg, fade-in en cosinus-fade-uit, niveau RMS ${g.rms} dB${niv.begrensd ? ' (piekbegrenzing -1,5 dB)' : ''}, ogg (Vorbis q2)` };
    rapport.push(`${k.padEnd(18)} ${String(man.geluiden[k].duur_s).padStart(5)} s ${String(kb).padStart(6)} kB  rms ${niv.rmsDb.toFixed(1)}  pk ${niv.pkDb.toFixed(1)}${niv.begrensd ? ' (begrensd)' : ''}  [${/zero/.test(meta.licentie) ? 'CC0' : 'CC-BY'} ${meta.auteur}]`);
  }
  man.geluiden = Object.fromEntries(Object.entries(man.geluiden).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(mp, JSON.stringify(man, null, 2) + '\n');
  console.log(rapport.join('\n'));
}
