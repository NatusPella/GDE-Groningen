// Bouwt uit game/audio/sfx/manifest.json (de enige bron) twee afgeleiden:
//   docs/AUDIO-LICENTIES.md        de bronnenlijst (bestand, bron-URL, id, titel, auteur, licentie, bewerking, sha256, datum)
//   game/js/sfx/audiocredits.js    de gegevens voor de sectie "Geluiden" in de credits van het spel
// Beleid: ADR 0039 (CC0 en CC-BY 3.0/4.0 van Freesound; auteurshandles in de credits).
//   node scripts/audio/licenties_bouw.mjs [--write] [--aanvullen=<inbox-map>,<inbox-map>]
// Zonder --write wordt alleen gecontroleerd (exit 1 bij verschil). --aanvullen vult in het manifest ontbrekende
// licentie_url, bron_sha256 en datum aan uit de .json-bestanden naast de downloads (<id>.json of <map>/<id>.json).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAN = path.join(ROOT, 'game', 'audio', 'sfx', 'manifest.json');
const DOC = path.join(ROOT, 'docs', 'AUDIO-LICENTIES.md');
const MOD = path.join(ROOT, 'game', 'js', 'sfx', 'audiocredits.js');

export const LICENTIES = {
  'Creative Commons 0 (CC0 1.0)': { kort: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', by: false },
  'Creative Commons Attribution 3.0': { kort: 'CC BY 3.0', url: 'https://creativecommons.org/licenses/by/3.0/', by: true },
  'Creative Commons Attribution 4.0': { kort: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', by: true },
};
export function licentieVanUrl(u) {
  if (/publicdomain\/zero\/1\.0/.test(u)) return 'Creative Commons 0 (CC0 1.0)';
  if (/licenses\/by\/3\.0/.test(u)) return 'Creative Commons Attribution 3.0';
  if (/licenses\/by\/4\.0/.test(u)) return 'Creative Commons Attribution 4.0';
  return null;
}

export function leesManifest() { return JSON.parse(fs.readFileSync(MAN, 'utf8')); }

// één bron kan meerdere sleutels voeden (een lang bestand, meerdere knipsels): groepeer op freesound_id
export function bronnen(man) {
  const per = new Map();
  for (const [k, g] of Object.entries(man.geluiden)) {
    const h = g.herkomst;
    if (!per.has(h.freesound_id)) per.set(h.freesound_id, { id: h.freesound_id, titel: h.titel, auteur: h.auteur, licentie: h.licentie, url: h.url, sha256: h.bron_sha256 || null, datum: h.datum || null, sleutels: [], gebruik: g.gebruik });
    per.get(h.freesound_id).sleutels.push(k);
  }
  return [...per.values()].sort((a, b) => a.auteur.toLowerCase().localeCompare(b.auteur.toLowerCase()) || a.id - b.id);
}

const esc = (s) => String(s).replace(/\|/g, '/');

export function bouwDoc(man) {
  const rijen = [];
  for (const [k, g] of Object.entries(man.geluiden)) {
    const h = g.herkomst, L = LICENTIES[h.licentie];
    rijen.push(`| \`${g.bestand}\` | [${h.freesound_id}](${h.url}) | ${esc(h.titel)} | ${h.auteur} | [${L.kort}](${L.url}) | ${esc(g.bewerking || '')} | ${h.bron_sha256 ? '`' + h.bron_sha256.slice(0, 16) + '…`' : 'niet bewaard'} | ${h.datum || ''} |`);
  }
  const by = bronnen(man).filter((b) => LICENTIES[b.licentie].by).length;
  return `# Licenties van de geluidsopnames

> Gegenereerd door \`node scripts/audio/licenties_bouw.mjs --write\` uit \`game/audio/sfx/manifest.json\`; pas het manifest aan, niet dit bestand.
> Beleid: [ADR 0039](../.specs-fire/standards/adr/0039-licentievrije-audio-met-credits.md). Alleen CC0 en CC BY 3.0/4.0 (Freesound), geen NC, ND of Sampling+.
> Bron: [freesound.org](https://freesound.org). De credits van het spel (Pauzemenu, Over, Geluiden) komen uit dezelfde gegevens (\`game/js/sfx/audiocredits.js\`).

${Object.keys(man.geluiden).length} bestanden uit ${bronnen(man).length} bronopnames, waarvan ${by} onder CC BY (naamsvermelding verplicht, in het spel en hier).
De sha256 is die van het bronbestand (de preview van Freesound) zoals opgehaald, afgekapt tot 16 tekens; "niet bewaard" betekent dat de bron van een eerdere ronde niet meer lokaal staat.
Bewerking: knippen, filters, niveau en lussen met de masteringscripts in \`scripts/audio/\`; het bestand in de repo is altijd mono ogg.

| Bestand (game/audio/sfx/) | Bron-id | Titel | Auteur | Licentie | Bewerking | sha256 bron | Datum |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rijen.join('\n')}
`;
}

const MERK_IN_TITEL = /hyundai|kona|nissan|volvo|chrysler|maxima|rover|aston|martin/i;
export function omschrijving(gebruik) {
  const t = String(gebruik || 'geluid').split(/[:(]/)[0].trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function bouwModule(man) {
  // De bronnaam van Freesound kan een merk of model bevatten (constitutie 2): het spel toont onze eigen Nederlandse omschrijving (het gebruik),
  // met auteurshandle, licentie en het Freesound-id; de originele titel blijft in het manifest en in docs/AUDIO-LICENTIES.md.
  // Voor CC BY (naamsvermelding verplicht) komen titel, bronlink en licentielink erbij (review 22-11); een titel met een merknaam (constitutie 2) blijft weg.
  const lijst = bronnen(man).map((b) => {
    const L = LICENTIES[b.licentie];
    const c = { id: b.id, beschrijving: omschrijving(b.gebruik), auteur: b.auteur, licentie: L.kort, by: L.by };
    if (L.by) { if (!MERK_IN_TITEL.test(b.titel)) c.titel = b.titel; c.bron = b.url; c.licentieUrl = L.url; }
    return c;
  });
  return `// Gegenereerd door scripts/audio/licenties_bouw.mjs uit game/audio/sfx/manifest.json: niet met de hand aanpassen.
// De bronnen van de geluidsopnames (Freesound) voor de sectie "Geluiden" in de credits (credits.js). ADR 0039.
export const AUDIO_CREDITS = ${JSON.stringify(lijst, null, 2)};
`;
}

function aanvullen(man, mappen) {
  const meta = new Map();
  for (const m of mappen) {
    const dirs = [m, ...fs.readdirSync(m, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(m, d.name))];
    for (const d of dirs) for (const f of fs.readdirSync(d)) if (/^\d+\.json$/.test(f)) {
      try { const j = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); if (!j.id) continue; if (!j.sha256) { const a = ['.ogg', '.mp3', '.wav', '.flac'].map((e) => path.join(d, f.replace(/.json$/, e))).find((x) => fs.existsSync(x)); if (!a) continue; j.sha256 = crypto.createHash('sha256').update(fs.readFileSync(a)).digest('hex'); j.opgehaald = fs.statSync(a).mtime.toISOString().slice(0, 10); } meta.set(j.id, j); } catch { /* sla over */ }
    }
  }
  let n = 0;
  for (const g of Object.values(man.geluiden)) {
    const h = g.herkomst, j = meta.get(h.freesound_id);
    if (!h.licentie_url) { h.licentie_url = (LICENTIES[h.licentie] || {}).url; n++; }
    if (j && !h.bron_sha256) { h.bron_sha256 = j.sha256; h.datum = j.opgehaald; n++; }
  }
  return n;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes('--write');
  const aanv = (process.argv.find((a) => a.startsWith('--aanvullen=')) || '').slice(12);
  const man = leesManifest();
  if (aanv) { const n = aanvullen(man, aanv.split(',').filter(Boolean)); fs.writeFileSync(MAN, JSON.stringify(man, null, 2) + '\n'); console.log(`manifest aangevuld (${n} velden)`); }
  const doc = bouwDoc(man), mod = bouwModule(man);
  if (write) { fs.writeFileSync(DOC, doc); fs.writeFileSync(MOD, mod); console.log('geschreven: docs/AUDIO-LICENTIES.md en game/js/sfx/audiocredits.js'); }
  else {
    const slecht = [];
    if (!fs.existsSync(DOC) || fs.readFileSync(DOC, 'utf8') !== doc) slecht.push('docs/AUDIO-LICENTIES.md');
    if (!fs.existsSync(MOD) || fs.readFileSync(MOD, 'utf8') !== mod) slecht.push('game/js/sfx/audiocredits.js');
    if (slecht.length) { console.log('niet gelijk aan het manifest: ' + slecht.join(', ') + ' (draai met --write)'); process.exit(1); }
    console.log('licentiebestanden kloppen met het manifest');
  }
}
