import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, HERE, WERK, OUT, GAME, esc } from './helpers.mjs';
import a from './scenes_a.mjs';
import b from './scenes_b.mjs';
import c from './scenes_c.mjs';

const SCHERMEN = {};
a(SCHERMEN); b(SCHERMEN); c(SCHERMEN);

// ---------------------------------------------------------------- schrijven
const PAGINA = (naam, body, titel) => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${esc(titel || naam)} – Samen spelen, ontwerp 24-11</title><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${GAME}/fonts/fonts.css"><link rel="stylesheet" href="${GAME}/js/ds-tokens.css"><link rel="stylesheet" href="${GAME}/js/ds-components.css"><link rel="stylesheet" href="${GAME}/js/ds-scroll.css"><link rel="stylesheet" href="../mock.css"></head><body>${body}
<script>
function fit(){var s=Math.min(innerWidth/1920,innerHeight/1080);var H=innerHeight/s;var st=document.querySelector('.stage');if(H>1080){st.style.height=H+'px';}
st.style.transform='scale('+s+')';st.style.left=Math.max(0,(innerWidth-1920*s)/2)+'px';st.style.top='0px';st.style.setProperty('--mz',s);st.style.setProperty('--menu-min','calc(13px / '+s+')');
var ex=Math.max(0,H-1080);document.querySelectorAll('.pane,.rail').forEach(function(e){e.style.height=(806+ex)+'px'});var hn=document.querySelector('.hints');if(hn){hn.style.top=(902+ex)+'px'}}
fit();addEventListener('resize',fit);
</script></body></html>`;

// de menutekst wordt in het spel met --mz verkleind; --menu-min (13px / --mz) is de vloer op het scherm (menu.css). Hier hetzelfde: elke maat onder 20 px krijgt die vloer.
function gedeeldeCss() {
  const eigen = fs.readFileSync(path.join(ROOT, 'game', 'js', 'ds-components.css'), 'utf8');
  if (eigen.includes('.ds-z-segment')) return '';
  const kandidaten = [process.env.GDE_BEZIT_WORKTREE, path.join(ROOT, '..', 'bezit-ui-24-11'), path.join(ROOT, '.claude', 'worktrees', 'bezit-ui-24-11')].filter(Boolean);
  for (const wt of kandidaten) {
    if (!fs.existsSync(path.join(wt, 'game', 'js', 'ds-components.css'))) continue;
    const d = execFileSync('git', ['-C', wt, 'diff', 'integratie-0.66', '--', 'game/js/ds-components.css'], { encoding: 'utf8', maxBuffer: 1 << 26 });
    return d.split('\n').filter((r) => r.startsWith('+') && !r.startsWith('+++')).map((r) => r.slice(1)).join('\n');
  }
  throw new Error('de gedeelde set (ds-z-segment e.a.) staat niet in game/js/ds-components.css en bezit-ui-24-11 is niet gevonden; zet GDE_BEZIT_WORKTREE');
}
const src = fs.readFileSync(path.join(HERE, 'mock.src.css'), 'utf8');
fs.writeFileSync(path.join(WERK, 'mock.css'), gedeeldeCss() + '\n' + src.replace(/font-size: (\d+)px/g, (m, n) => (Number(n) < 20 ? `font-size: max(${n}px, var(--menu-min))` : m)));

for (const [naam, f] of Object.entries(SCHERMEN)) {
  fs.writeFileSync(path.join(OUT, naam + '.html'), PAGINA(naam, f()));
}
console.log('gebouwd:', Object.keys(SCHERMEN).length, 'schermen:', Object.keys(SCHERMEN).join(', '));
