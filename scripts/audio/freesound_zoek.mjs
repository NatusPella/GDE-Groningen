// Zoekt op Freesound (alleen CC0 en CC-BY) en toont kandidaten; haalt met --haal=<id>,<id> de previews op in --uit=<map>.
// De sleutel komt uit ~/.gde/freesound.json en wordt nooit geprint. Gebruik: node scripts/audio/freesound_zoek.mjs "<zoekterm>" [--min=2] [--max=40]
//   node scripts/audio/freesound_zoek.mjs --haal=123,456 --uit=<lege map>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const sleutel = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.gde', 'freesound.json'), 'utf8')).client_secret;
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d;
const FILTER = 'license:("Creative Commons 0" OR "Attribution")';
const api = async (pad, q) => {
  const u = new URL('https://freesound.org/apiv2/' + pad);
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  u.searchParams.set('token', sleutel);
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${pad}: ${r.status}`);
  return r.json();
};
const haal = arg('haal', '');
if (haal) {
  const uit = arg('uit', '');
  if (!uit) throw new Error('--uit=<map> nodig');
  fs.mkdirSync(uit, { recursive: true });
  for (const id of haal.split(',')) {
    const s = await api(`sounds/${id}/`, { fields: 'id,name,username,license,duration,previews' });
    if (!/creativecommons\.org\/(publicdomain\/zero|licenses\/by\/)/.test(s.license)) { console.log(id, 'LICENTIE NIET TOEGESTAAN', s.license); continue; }
    const url = s.previews['preview-hq-ogg'] || s.previews['preview-hq-mp3'];
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const ext = url.includes('.ogg') ? 'ogg' : 'mp3';
    fs.writeFileSync(path.join(uit, `${id}.${ext}`), buf);
    fs.writeFileSync(path.join(uit, `${id}.json`), JSON.stringify({ id: s.id, naam: s.name, auteur: s.username, licentie: s.license, duur: s.duration }));
    console.log(id, s.license.includes('zero') ? 'CC0' : 'CC-BY', s.duration.toFixed(1) + 's', s.username, '|', s.name, buf.length + 'B');
  }
} else {
  const d = await api('search/text/', { query: process.argv[2], filter: FILTER + ` duration:[${arg('min', 2)} TO ${arg('maxd', 60)}]`, fields: 'id,name,username,license,duration,avg_rating,num_downloads', page_size: arg('max', 25), sort: 'downloads_desc' });
  for (const s of d.results) console.log(s.id, s.license.includes('zero') ? 'CC0 ' : 'BY  ', s.duration.toFixed(1).padStart(5) + 's', s.username, '|', s.name);
}
