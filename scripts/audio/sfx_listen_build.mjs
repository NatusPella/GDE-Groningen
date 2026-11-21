// Builds docs/SFX-LUISTER.html: the optional listening panel for the new clips of SFX round 5 (the owner may veto; listening is not required).
// One section per area of game/js/sfx/sfxmap.js, one row per clip with an <audio> tag, the event key, level, source handle
// and licence. The committed docs/SFX-LUISTER.html has relative paths (no machine or user name in the repo); --abs writes docs/SFX-LUISTER-abs.html with absolute file:/// paths for local use (git-ignored).
//   node scripts/audio/sfx_listen_build.mjs [--write] [--abs]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { SFX_MAP, AREAS, sfxClips } from '../../game/js/sfx/sfxmap.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SFX = path.join(ROOT, 'game', 'audio', 'sfx');
const man = JSON.parse(fs.readFileSync(path.join(SFX, 'manifest.json'), 'utf8')).geluiden;
const AREA_NAAM = { ui: 'Menu en meldingen', shop: 'Winkels, bar en snackwagen', interior: 'Interieurs', clothing: 'Kleding en kapper', tuning: 'Tuning en voertuig', farm: 'Bezit: boerderij', animal: 'Dieren', football: 'Voetbal', crowd: 'Publiek', nature: 'Natuur en weer', npc: 'Reacties van voorbijgangers', transit: 'Openbaar vervoer', cutscene: 'Tussenscenes', phone: 'Telefoon' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function build(abs = false) {
  let n = 0;
  const out = ['<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>SFX-ronde 5: luisterpaneel</title>',
    '<style>body{font:14px system-ui,sans-serif;margin:24px;max-width:1100px}h2{margin-top:28px;border-bottom:1px solid #ccc}table{border-collapse:collapse;width:100%}td,th{padding:3px 8px;border-bottom:1px solid #eee;text-align:left;vertical-align:middle}code{font-size:12px}audio{height:28px}.kort{color:#666;font-size:12px}</style></head><body>',
    '<h1>SFX-ronde 5: luisterpaneel</h1><p>Optioneel, voor een veto: niets hiervan is beluisterd door een mens. Zeg de naam van een clip die weg moet. Bronnen en licenties: <code>docs/AUDIO-LICENTIES.md</code>.</p>'];
  for (const a of AREAS) {
    const keys = Object.keys(SFX_MAP).filter((k) => SFX_MAP[k].area === a);
    if (!keys.length) continue;
    out.push(`<h2>${esc(AREA_NAAM[a] || a)}</h2><table><tr><th>Clip</th><th>Luister</th><th>Gebeurtenis</th><th>Duur</th><th>Bron</th></tr>`);
    for (const k of keys) for (const c of sfxClips(k)) {
      const m = man[c]; if (!m) continue; n++;
      const url = abs ? pathToFileURL(path.join(SFX, m.bestand)).href : '../game/audio/sfx/' + m.bestand;
      out.push(`<tr><td><code>${esc(c)}</code></td><td><audio controls preload="none" src="${url}"></audio></td><td>${esc(SFX_MAP[k].label)}<div class="kort">${esc(k)} · ${esc(SFX_MAP[k].bus)} · ${esc(SFX_MAP[k].cat)}</div></td><td>${m.duur_s} s</td><td class="kort">${esc(m.herkomst.auteur)} · ${/zero|0 \(/.test(m.herkomst.licentie) ? 'CC0' : 'CC BY'} · <a href="${esc(m.herkomst.url)}">${m.herkomst.freesound_id}</a></td></tr>`);
    }
    out.push('</table>');
  }
  out.push(`<p class="kort">${n} clips.</p></body></html>`);
  return out.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(ROOT, 'docs', 'SFX-LUISTER.html'), build());
  if (process.argv.includes('--abs')) fs.writeFileSync(path.join(ROOT, 'docs', 'SFX-LUISTER-abs.html'), build(true));
  if (!process.argv.includes('--write') && !process.argv.includes('--abs')) console.log('gebruik --write en/of --abs');
}
