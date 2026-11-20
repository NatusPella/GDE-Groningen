// Stappen met echte opnames (#988, ADR 0039): per ondergrond de beste korte stappen uit langere Freesound-opnames knippen
// (stilte weg, korte fade-uit, geen klik, gelijk niveau), mono ogg, en in game/audio/sfx/manifest.json zetten als stap_<ondergrond>_<n>.
//   node scripts/audio/master_sfx_stappen.mjs --bron=<inbox>[,<inbox>] [--scan] [--alleen=<ondergrond>]
// --scan toont alleen de gevonden aanzetten per bron (geen uitvoer). Zonder --scan worden de stappen van de ondergrond vervangen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vindBron, decodeer, aanzetten, knipStap, niveauer, staartRatio, schrijfOgg, SR } from './stap_knip.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d;
const BRON = arg('bron', '').split(',').filter(Boolean);
const ALLEEN = arg('alleen', '');
const SCAN = process.argv.includes('--scan');
const UIT = path.join(ROOT, 'game', 'audio', 'sfx');

// len: lengte van een stap (s); n: aantal varianten; bronnen: { id, van, tot (s, optioneel), drempel, rust, hp }
// De keuze is op meting (aanzetten, staart, niveau), niet op gehoor: zie docs/SFX-LUISTERLIJST.md.
export const STAPPEN = {
  klinkers: { len: 0.30, n: 6, gebruik: 'stenen of tegels: stoep, plein, klinkers', bronnen: [{ id: 521590 }, { id: 813622 }, { id: 816019 }] },
  asfalt: { len: 0.30, n: 6, gebruik: 'asfalt en beton: weg, fietspad', bronnen: [{ id: 368833 }, { id: 682771, van: 0, tot: 5 }] },
  gras: { len: 0.34, n: 6, gebruik: 'gras en aarde', bronnen: [{ id: 505833 }, { id: 535220 }] },
  grind: { len: 0.34, n: 6, gebruik: 'grind, split en zandpad', bronnen: [{ id: 530589 }, { id: 353799 }, { id: 384871 }] },
  zand: { len: 0.34, n: 6, gebruik: 'zand en strand', bronnen: [{ id: 459449 }, { id: 28238 }] },
  wood: { len: 0.32, n: 6, gebruik: 'houten brug, steiger en dek', bronnen: [{ id: 445790 }] },
  metaal: { len: 0.30, n: 6, gebruik: 'metaal: rooster, trap, autodak', bronnen: [{ id: 698697 }, { id: 786977 }] },
  wet: { len: 0.42, n: 6, gebruik: 'water en plassen', bronnen: [{ id: 531566 }, { id: 861369 }] },
  binnen: { len: 0.30, n: 6, gebruik: 'binnen: vloer van een huis of kantoor', bronnen: [{ id: 415301 }, { id: 172492 }] },
  ren: { len: 0.26, n: 6, gebruik: 'rennen op harde grond (stoep, weg)', bronnen: [{ id: 168013 }, { id: 682771, van: 5 }] },
};

const lees = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export function verzamel(ond, cfg) {
  const kand = [];
  for (const b of cfg.bronnen) {
    const { bestand, meta } = vindBron(BRON, b.id);
    const x = decodeer(bestand, { hp: b.hp || 70, van: b.van || 0, tot: b.tot || 0 });
    const ev = aanzetten(x, { drempel: b.drempel || 0.3, rust: b.rust || 0.2 });
    if (SCAN) { console.log(`${ond} ${b.id}: ${(x.length / SR).toFixed(1)} s, ${ev.length} aanzetten, gemiddeld interval ${ev.length > 1 ? ((ev[ev.length - 1].start - ev[0].start) / (ev.length - 1) / SR).toFixed(2) : '-'} s`); continue; }
    for (let i = 0; i < ev.length; i++) {
      const volgende = ev[i + 1] || null;
      // een stap moet rustig uitsterven voor de volgende: zo min mogelijk afkappen
      const vrij = volgende ? (volgende.start - ev[i].start) / SR : cfg.len;
      if (vrij < cfg.len * 0.8) continue;
      const y = knipStap(x, ev[i], volgende, cfg.len);
      if (!y) continue;
      kand.push({ y, id: b.id, meta, at: ev[i].start / SR + (b.van || 0), ratio: staartRatio(y), hoogte: ev[i].hoogte });
    }
  }
  return kand;
}

// kies n stappen: beste staartratio (nette stap, geen aanhoudende ruis), eerlijk verdeeld over de bronnen, geen twee binnen 1 s uit dezelfde bron
export function kies(kand, n) {
  const perBron = new Map();
  for (const k of kand) { if (!perBron.has(k.id)) perBron.set(k.id, []); perBron.get(k.id).push(k); }
  for (const l of perBron.values()) l.sort((a, b) => b.ratio - a.ratio);
  const keuze = [];
  const gekozenAt = new Map();
  for (let ronde = 0; ronde < 30 && keuze.length < n; ronde++) {
    let toegevoegd = false;
    for (const [id, l] of perBron) {
      if (keuze.length >= n) break;
      const eerder = gekozenAt.get(id) || [];
      const nxt = l.find((k) => !keuze.includes(k) && !eerder.some((t) => Math.abs(t - k.at) < 1));
      if (nxt) { keuze.push(nxt); eerder.push(nxt.at); gekozenAt.set(id, eerder); toegevoegd = true; }
    }
    if (!toegevoegd) break;
  }
  return keuze;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!BRON.length) throw new Error('--bron=<inbox> nodig');
  const mp = path.join(UIT, 'manifest.json');
  const man = lees(mp);
  let totaal = 0;
  for (const [ond, cfg] of Object.entries(STAPPEN)) {
    if (ALLEEN && ALLEEN !== ond) continue;
    const kand = verzamel(ond, cfg);
    if (SCAN) continue;
    const gekozen = kies(kand, cfg.n);
    console.log(`${ond}: ${kand.length} kandidaten, ${gekozen.length} gekozen`);
    for (const k of Object.keys(man.geluiden)) if (k.startsWith(`stap_${ond}_`)) { try { fs.unlinkSync(path.join(UIT, man.geluiden[k].bestand)); } catch { /* weg */ } delete man.geluiden[k]; }
    gekozen.forEach((g, i) => {
      const niv = niveauer(g.y);
      const key = `stap_${ond}_${i}`, dst = path.join(UIT, `${key}.ogg`);
      schrijfOgg(g.y, dst);
      const kb = Math.round(fs.statSync(dst).size / 102.4) / 10;
      totaal += kb;
      const meta = lees(g.meta);
      const lic = /zero/.test(meta.licentie) ? 'Creative Commons 0 (CC0 1.0)' : /by\/3\.0/.test(meta.licentie) ? 'Creative Commons Attribution 3.0' : 'Creative Commons Attribution 4.0';
      const licUrl = lic.includes('CC0') ? 'https://creativecommons.org/publicdomain/zero/1.0/' : `https://creativecommons.org/licenses/by/${lic.endsWith('3.0') ? '3.0' : '4.0'}/`;
      man.geluiden[key] = { bestand: `${key}.ogg`, gebruik: `voetstap op ${cfg.gebruik}`, loop: false, duur_s: Math.round((g.y.length / SR) * 1000) / 1000, grootte_kb: kb,
        herkomst: { titel: meta.titel || meta.naam, auteur: meta.auteur, freesound_id: meta.id, url: `https://freesound.org/people/${meta.auteur}/sounds/${meta.id}/`, licentie: lic, licentie_url: licUrl, datum: meta.opgehaald, bron_sha256: meta.sha256 },
        knip_s: { start: Math.round(g.at * 1000) / 1000, duur: Math.round((g.y.length / SR) * 1000) / 1000 },
        niveau: { rms_db: Math.round(niv.rmsDb * 10) / 10, piek_db: Math.round(niv.piekDb * 10) / 10 },
        bewerking: 'ffmpeg: hoogdoorlaat 70 Hz, losse stap geknipt op de aanzet, fade-in 2 ms en fade-uit 50 ms (cosinus), niveau RMS -23 dB over de eerste 150 ms (piek max -1,5 dB), mono 44,1 kHz, ogg (Vorbis q3)' };
      console.log(`  ${key}  ${(g.y.length / SR).toFixed(2)} s  ${kb} kB  rms ${niv.rmsDb.toFixed(1)}  pk ${niv.piekDb.toFixed(1)}  staart ${g.ratio.toFixed(1)} dB  [${meta.auteur} ${meta.id} @${g.at.toFixed(2)}s]`);
    });
  }
  if (!SCAN) {
    man.geluiden = Object.fromEntries(Object.entries(man.geluiden).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(mp, JSON.stringify(man, null, 2) + '\n');
    console.log(`totaal ${Math.round(totaal)} kB`);
  }
}
