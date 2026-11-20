// Ontwikkelhulp: haalt CC0- en CC-BY-previews van Freesound op voor de SFX-ronde (#988).
// Alleen tijdens ontwikkeling; het spel zelf stuurt hier niets heen.
//   node scripts/audio/freesound_fetch.mjs <zoeklijst.json> <uitvoermap> [--per=3]
// De sleutel staat buiten de repo in <thuismap>/.gde/freesound.json (client_id, client_secret)
// en wordt nergens geprint of weggeschreven. De zoeklijst is een lijst
// { naam, query, min, max } (duur in seconden). Per zoekopdracht komen de beste kandidaten
// (waardering x downloads) in <uitvoermap>/<naam>/ als ogg met een .json met de herkomst.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const [listFile, outDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const per = Number((process.argv.find((a) => a.startsWith('--per=')) || '--per=3').slice(6));
if (!listFile || !outDir) { console.error('gebruik: freesound_fetch.mjs <zoeklijst.json> <uitvoermap> [--per=3]'); process.exit(2); }

const keyFile = path.join(os.homedir(), '.gde', 'freesound.json');
if (!fs.existsSync(keyFile)) { console.error('geen sleutelbestand in de thuismap (.gde/freesound.json)'); process.exit(2); }
const token = JSON.parse(fs.readFileSync(keyFile, 'utf8')).client_secret;
if (!token) { console.error('sleutelbestand mist client_secret'); process.exit(2); }

const OK_LICENSE = (url) => /publicdomain\/zero\/1\.0/.test(url) || /licenses\/by\/(3\.0|4\.0)\/?$/.test(url);
const FIELDS = 'id,name,username,license,previews,duration,avg_rating,num_ratings,num_downloads,url';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = JSON.parse(fs.readFileSync(listFile, 'utf8'));
let overzicht = [];

for (const item of list) {
  const filter = `license:("Creative Commons 0" OR "Attribution") duration:[${item.min ?? 0.3} TO ${item.max ?? 30}]`;
  const params = new URLSearchParams({ query: item.query, filter, fields: FIELDS, page_size: '30', sort: 'rating_desc', token });
  let data;
  try {
    const r = await fetch(`https://freesound.org/apiv2/search/text/?${params}`);
    if (!r.ok) { console.log(`${item.naam}: zoeken mislukt (${r.status})`); continue; }
    data = await r.json();
  } catch (e) { console.log(`${item.naam}: netwerkfout`); continue; }
  const kand = (data.results || [])
    .filter((s) => OK_LICENSE(s.license) && s.previews && (s.previews['preview-hq-ogg'] || s.previews['preview-hq-mp3']))
    .map((s) => ({ ...s, score: (s.avg_rating || 0) * Math.log(2 + (s.num_ratings || 0)) + Math.log(2 + (s.num_downloads || 0)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, per);
  const dir = path.join(outDir, item.naam);
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const s of kand) {
    const url = s.previews['preview-hq-ogg'] || s.previews['preview-hq-mp3'];
    const ext = url.endsWith('.ogg') ? 'ogg' : 'mp3';
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const file = path.join(dir, `${s.id}.${ext}`);
      fs.writeFileSync(file, buf);
      const meta = { naam: item.naam, id: s.id, titel: s.name, auteur: s.username, licentie: s.license, url: s.url, duur: s.duration, sha256: crypto.createHash('sha256').update(buf).digest('hex'), bestand: path.basename(file), opgehaald: new Date().toISOString().slice(0, 10) };
      fs.writeFileSync(path.join(dir, `${s.id}.json`), JSON.stringify(meta, null, 2));
      overzicht.push(meta);
      n++;
    } catch (e) { /* volgende kandidaat */ }
    await sleep(400);
  }
  console.log(`${item.naam}: ${n} van ${kand.length} kandidaten opgehaald`);
  await sleep(600);
}
fs.writeFileSync(path.join(outDir, 'overzicht.json'), JSON.stringify(overzicht, null, 2));
console.log(`klaar: ${overzicht.length} bestanden in ${outDir}`);
