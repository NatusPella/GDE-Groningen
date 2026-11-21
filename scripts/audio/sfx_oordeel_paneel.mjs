// Builds docs/SFX-LUISTER-OORDEEL.html: the listening page for the three sounds that are still open after the owner verdict (21-11, #1166).
// Three candidates per sound with an audio player and a label; k1 is the one that is installed in the game now.
// Relative paths in the committed page; --abs writes docs/SFX-LUISTER-OORDEEL-abs.html with file:/// paths (git-ignored, for opening locally).
//   node scripts/audio/sfx_oordeel_paneel.mjs [--write] [--abs]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const KAND = path.join(ROOT, 'docs', 'sfx-oordeel-kandidaten');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const WIE = { shop_sell_bills: 'shop_sell_bills_0: echt briefgeld (papier)', shop_drawer: 'shop_drawer_1: echt laadgeluid (kassalade of lade)' };

export function build(abs = false) {
  const lijst = JSON.parse(fs.readFileSync(path.join(KAND, 'kandidaten.json'), 'utf8'));
  const out = ['<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>SFX-oordeel: kies per geluid</title>',
    '<style>body{font:15px system-ui,sans-serif;margin:24px;max-width:900px}h2{margin-top:28px;border-bottom:1px solid #ccc}table{border-collapse:collapse;width:100%}td,th{padding:5px 8px;border-bottom:1px solid #eee;text-align:left;vertical-align:middle}audio{height:32px}.kort{color:#666;font-size:12px}.nu{background:#eef7ee}</style></head><body>',
    '<h1>SFX-oordeel: nog twee keuzes (tweede ronde)</h1><p>Per geluid drie nieuwe kandidaten, andere dan de vorige ronde. Kandidaat 1 staat nu in het spel (groen). Zeg welke het moet worden. Gekozen op titel en meting, niet op gehoor. Bronnen: <code>docs/AUDIO-LICENTIES.md</code>.</p>'];
  for (const [key, l] of Object.entries(lijst)) {
    out.push(`<h2>${esc(WIE[key] || key)}</h2><table><tr><th>Label</th><th>Luister</th><th>Duur</th><th>Bron</th></tr>`);
    l.forEach((c, i) => {
      const h = c.entry.herkomst, src = abs ? pathToFileURL(path.join(KAND, c.kand)).href : './sfx-oordeel-kandidaten/' + c.kand;
      out.push(`<tr class="${i === 0 ? 'nu' : ''}"><td><b>Kandidaat ${i + 1}</b>${i === 0 ? ' (nu in het spel)' : ''}<br>${esc(h.titel)}</td><td><audio controls preload="none" src="${src}"></audio></td><td>${c.entry.duur_s} s</td><td class="kort">${esc(h.auteur)} · ${/zero|0 \(/.test(h.licentie) ? 'CC0' : 'CC BY'} · <a href="${esc(h.url)}">${h.freesound_id}</a></td></tr>`);
    });
    out.push('</table>');
  }
  out.push('</body></html>');
  return out.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(ROOT, 'docs', 'SFX-LUISTER-OORDEEL.html'), build());
  if (process.argv.includes('--abs')) fs.writeFileSync(path.join(ROOT, 'docs', 'SFX-LUISTER-OORDEEL-abs.html'), build(true));
}
