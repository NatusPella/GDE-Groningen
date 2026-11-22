// Maakt uit docs/witte-ruis-scan.json (ruisachtig_scan.mjs --paneel) het rapport van de verdachte spraakclips, met per clip de bron:
// de sleutel (Stem|tekst) uit de manifesten en tts-bestanden onder game/audio, de tekst en de stem. Schrijft
//   - docs/witte-ruis-scan.json  (veld `bronnen`)
//   - docs/WITTE-RUIS-LUISTER-VERDACHT.html  (audio-tags met file:///-paden naar de map van de eigenaar, gerangschikt: ruis-einde eerst)
//   - de sectie tussen <!-- RAPPORT-BEGIN --> en <!-- RAPPORT-EINDE --> in docs/WITTE-RUIS-21-11.md
//   node scripts/audio/witte_ruis_rapport.mjs [--wortel=<pad naar de repo>]
// Vervangen doet de TTS-agent (niet dit script).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORTEL = ((process.argv.find((a) => a.startsWith('--wortel=')) || '').slice(9) || ROOT).replace(/\\/g, '/');
const AUDIO = path.join(ROOT, 'game', 'audio');

function* jsons(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* jsons(p);
    else if (e.name === 'manifest.json' || e.name === 'tts.json') yield p;
  }
}

// absoluut pad (met /) -> { sleutel, stem, tekst, bron: [manifesten], model, tts }
export function bouwBronnen() {
  const kaart = new Map();
  for (const j of jsons(AUDIO)) {
    let d;
    try { d = JSON.parse(fs.readFileSync(j, 'utf8')); } catch (e) { continue; }
    const dir = path.dirname(j);
    const rel = path.relative(ROOT, j).replace(/\\/g, '/');
    for (const [sleutel, v] of Object.entries(d)) {
      if (!v || typeof v !== 'object' || typeof v.src !== 'string') continue;
      const f = path.relative(ROOT, path.join(dir, v.src)).replace(/\\/g, '/');
      const m = kaart.get(f) || { sleutel, bron: [] };
      m.sleutel = sleutel;
      m.bron.push(rel);
      if (v.voice) m.tts = { voice: v.voice, model: v.model || null, via: v.via || null, datum: v.date || null, stijl: v.style || null };
      if (v.input) m.tekst = v.input;
      kaart.set(f, m);
    }
  }
  for (const m of kaart.values()) {
    const [stem, ...rest] = m.sleutel.split('|');
    m.stem = stem; if (!m.tekst) m.tekst = rest.join('|');
  }
  return kaart;
}

// hoog: ruis-einde én pop-begin (het patroon van de gemelde clips); midden: één van beide; controle: alleen ruisaandeel
export const ernst = (r) => ((r.eind && r.eind.burst) && (r.pop && r.pop.pop) ? 'hoog' : (r.eind && r.eind.burst) || (r.pop && r.pop.pop) ? 'midden' : 'controle');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const jp = path.join(ROOT, 'docs', 'witte-ruis-scan.json');
  const scan = JSON.parse(fs.readFileSync(jp, 'utf8'));
  const lijst = scan.spraak_lijst || [];
  const kaart = bouwBronnen();
  const rijen = lijst.map((r) => {
    const m = kaart.get(r.f) || null;
    return { f: r.f, ernst: ernst(r), ruisEinde: !!(r.eind && r.eind.burst), popBegin: !!(r.pop && r.pop.pop), aandeel: r.aandeel, sec: r.sec, eind: r.eind, pop: r.pop, sleutel: m ? m.sleutel : null, stem: m ? m.stem : null, tekst: m ? m.tekst : null, bron: m ? m.bron : [], tts: m && m.tts ? m.tts : null };
  });
  scan.bronnen = rijen;
  fs.writeFileSync(jp, JSON.stringify(scan, null, 1));
  const burst = rijen.filter((r) => r.ernst !== 'controle');   // ruis-einde en/of pop-begin
  const perStem = {};
  for (const r of burst) perStem[r.stem || '(onbekend)'] = (perStem[r.stem || '(onbekend)'] || 0) + 1;
  const perMap = {};
  for (const r of burst) { const k = r.f.split('/').slice(0, 4).join('/'); perMap[k] = (perMap[k] || 0) + 1; }
  const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const url = (f) => `file:///${WORTEL}/${f}`;
  let h = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Witte ruis: verdachte spraakclips</title><style>body{font:14px system-ui;max-width:940px;margin:2em auto;padding:0 1em}li{margin:.7em 0;list-style:none;border-bottom:1px solid #ddd;padding-bottom:.5em}audio{display:block;width:100%;margin-top:3px}small{color:#555}.hoog{color:#b00}.midden{color:#a60}.controle{color:#555}</style></head><body>\n<h1>Witte ruis: verdachte spraakclips</h1>\n<p>Gemaakt met <code>node scripts/audio/witte_ruis_rapport.mjs</code> uit <code>docs/witte-ruis-scan.json</code>. Eerst de clips met een <b>ruis-einde</b> (een harde burst van ca. 0,2 s na bijna-stilte, vlak voor het einde), daarna de clips op aandeel ruisframes (vanaf 8 procent). Luister vooral naar het <b>laatste halve seconde</b>. ${burst.length} met ruis-einde, ${rijen.length - burst.length} ter controle.</p>\n<ol>\n`;
  for (const r of rijen) {
    h += `<li><b class="${r.ernst}">${r.ernst}</b> <code>${esc(r.f.replace('game/audio/', ''))}</code><br><small>${esc(r.stem || 'bron onbekend')}: ${esc(r.tekst || '')} &middot; ${r.sec} s, ruisframes ${(r.aandeel * 100).toFixed(0)}% &middot; ruis-einde: <b>${r.ruisEinde ? 'ja' : 'nee'}</b>${r.ruisEinde ? ` (${r.eind.ms} ms vanaf ${r.eind.vanafS} s, ${r.eind.piekDb} dB)` : ''}, pop-begin: <b>${r.popBegin ? 'ja' : 'nee'}</b>${r.popBegin ? ` (${r.pop.piekDb} dB op ${r.pop.vanMs} ms)` : ''}</small><audio controls preload="none" src="${esc(url(r.f))}"></audio></li>\n`;
  }
  h += '</ol></body></html>\n';
  fs.writeFileSync(path.join(ROOT, 'docs', 'WITTE-RUIS-LUISTER-VERDACHT.html'), h);

  const md = ['<!-- RAPPORT-BEGIN (gegenereerd door scripts/audio/witte_ruis_rapport.mjs; niet met de hand bewerken) -->', '',
    `**Ruis-einde en pop-begin:** ${burst.length} van ${scan.spraak_gemeten || '?'} spraakclips hebben een van beide of beide (hoog = beide: ${burst.filter((r) => r.ernst === 'hoog').length}; midden = een van beide: ${burst.filter((r) => r.ernst === 'midden').length}); ${rijen.length - burst.length} clips staan er ter controle bij (ruisaandeel 8 procent of meer, zonder een van beide).`, '',
    `Per stem (alleen ruis-einde): ${Object.entries(perStem).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') || '-'}.`, '',
    `Per map: ${Object.entries(perMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k.replace('game/audio/voicelines/', '')} ${v}`).join(', ') || '-'}.`, '',
    'Gerangschikt: ernst, bestand, sleutel (Stem|tekst), stem, duur, het ruis-einde. Het volledige rijtje met bronbestanden (manifest en tts.json) en TTS-stem staat in `witte-ruis-scan.json` onder `bronnen`; het luisterpaneel is [WITTE-RUIS-LUISTER-VERDACHT.html](WITTE-RUIS-LUISTER-VERDACHT.html).', '',
    '| Ernst | Bestand | Sleutel | Stem | Duur | Ruis-einde | Pop-begin |', '|---|---|---|---|---|---|---|'];
  for (const r of burst) md.push(`| ${r.ernst} | ${r.f.replace('game/audio/voicelines/', '')} | ${(r.sleutel || '(onbekend)').replace(/\|/g, '\\|')} | ${r.tts ? r.tts.voice : '-'} | ${r.sec} s | ${r.ruisEinde ? `ja (${r.eind.ms} ms vanaf ${r.eind.vanafS} s)` : 'nee'} | ${r.popBegin ? `ja (${r.pop.piekDb} dB)` : 'nee'} |`);
  md.push('', '<!-- RAPPORT-EINDE -->');
  const mp = path.join(ROOT, 'docs', 'WITTE-RUIS-21-11.md');
  let doc = fs.readFileSync(mp, 'utf8');
  const blok = md.join('\n');
  if (doc.includes('<!-- RAPPORT-BEGIN')) doc = doc.replace(/<!-- RAPPORT-BEGIN[\s\S]*?<!-- RAPPORT-EINDE -->/, () => blok);
  else doc += `\n## Ruis-einde in spraakclips (gemeld door de eigenaar)\n\n${blok}\n`;
  fs.writeFileSync(mp, doc);
  console.log(`rapport: ${burst.length} met ruis-einde en/of pop-begin, ${rijen.length - burst.length} ter controle, ${rijen.filter((r) => !r.sleutel).length} zonder gevonden bron`);
}
