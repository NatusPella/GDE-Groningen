// Builds docs/SFX-LUISTER-VERVANGING.html: old and new clip side by side for the ten sounds the owner asked to replace (21-11).
// The old clips and their source data live in docs/sfx-vervanging-oud/ (copied before the replacement).
// Relative paths in the committed page; --abs writes docs/SFX-LUISTER-VERVANGING-abs.html with file:/// paths (git-ignored).
//   node scripts/audio/sfx_vervanging_paneel.mjs [--write] [--abs]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SFX = path.join(ROOT, 'game', 'audio', 'sfx');
const OUD = path.join(ROOT, 'docs', 'sfx-vervanging-oud');
export const KEYS = ['ui_confirm', 'ui_page_turn', 'shop_buy_coins', 'shop_sell_bills', 'shop_drawer', 'shop_bag_rustle', 'curtain_pull', 'scissors_snip', 'chicken_cluck', 'sheep_bleat'];
const nieuw = JSON.parse(fs.readFileSync(path.join(SFX, 'manifest.json'), 'utf8')).geluiden;
const oud = JSON.parse(fs.readFileSync(path.join(OUD, 'manifest-oud.json'), 'utf8'));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cc = (m) => (/zero|0 \(/.test(m.herkomst.licentie) ? 'CC0' : 'CC BY');
const variants = (man, key) => Object.keys(man).filter((x) => x.startsWith(key + '_') && /^\d+$/.test(x.slice(key.length + 1))).sort();

export function build(abs = false) {
  const url = (dir, f, rel) => (abs ? pathToFileURL(path.join(dir, f)).href : rel + f);
  const rij = (soort, k, m, src) => `<tr class="${soort}"><td>${soort === 'oud' ? 'Oud' : 'Nieuw'}</td><td><code>${esc(k)}</code></td><td><audio controls preload="none" src="${src}"></audio></td><td>${m.duur_s} s</td><td class="kort">${esc(m.herkomst.auteur)} · ${cc(m)} · <a href="${esc(m.herkomst.url)}">${m.herkomst.freesound_id}</a></td></tr>`;
  const out = ['<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>SFX-vervanging: oud en nieuw</title>',
    '<style>body{font:14px system-ui,sans-serif;margin:24px;max-width:1000px}h2{margin-top:26px;border-bottom:1px solid #ccc}table{border-collapse:collapse;width:100%}td,th{padding:3px 8px;border-bottom:1px solid #eee;text-align:left;vertical-align:middle}code{font-size:12px}audio{height:28px}.kort{color:#666;font-size:12px}tr.oud{background:#f6f6f6}</style></head><body>',
    '<h1>SFX-vervanging: oud en nieuw</h1><p>Per geluid staat het oude (grijs) boven het nieuwe. De nieuwe clips zijn korter en droger gekozen op meting; niets is door een mens beluisterd. Zeg welke weg moet. Bronnen: <code>docs/AUDIO-LICENTIES.md</code>.</p>'];
  let n = 0;
  for (const key of KEYS) {
    out.push(`<h2>${esc(key)}</h2><table><tr><th></th><th>Clip</th><th>Luister</th><th>Duur</th><th>Bron</th></tr>`);
    for (const k of variants(oud, key)) out.push(rij('oud', k, oud[k], url(OUD, oud[k].bestand, './sfx-vervanging-oud/')));
    for (const k of variants(nieuw, key)) { n++; out.push(rij('nieuw', k, nieuw[k], url(SFX, nieuw[k].bestand, '../game/audio/sfx/'))); }
    out.push('</table>');
  }
  out.push(`<p class="kort">${n} nieuwe clips.</p></body></html>`);
  return out.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(ROOT, 'docs', 'SFX-LUISTER-VERVANGING.html'), build());
  if (process.argv.includes('--abs')) fs.writeFileSync(path.join(ROOT, 'docs', 'SFX-LUISTER-VERVANGING-abs.html'), build(true));
}
