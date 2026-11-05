import { hoofdspeler } from '../players.js';
// ?sfxtest (loaded by main.js only then): a panel of every sound effect with a
// play button and a distance slider. It pushes the same audio events the game
// does (pedestrians.js pushAudioEvent), so what you hear is the real path,
// panning, air damping and speed-of-sound delay included. F8 shows or hides it.
import { groupedFx } from './sfxlist.js';
import { pushAudioEvent } from '../pedestrians.js';
import { CATEGORIES } from './mixplan.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initSfxTest(world) {
  const st = document.createElement('style');
  st.textContent = `
#sfxtest{position:fixed;top:8px;right:8px;z-index:70;width:min(360px,92vw);max-height:92vh;overflow:auto;background:rgba(18,20,26,.95);border:1px solid #4a4f5c;border-radius:10px;padding:10px 12px;font:13px/1.4 system-ui,sans-serif;color:#eee}
#sfxtest.hidden{display:none}
#sfxtest h2{margin:0 0 4px;font-size:16px}
#sfxtest h3{margin:10px 0 4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#9aa3b5}
#sfxtest button{margin:2px 4px 2px 0;padding:3px 8px;border-radius:6px;border:1px solid #5b6275;background:#2a2f3b;color:#eee;cursor:pointer}
#sfxtest button:hover{background:#3a4152}
#sfxtest .row{display:flex;align-items:center;gap:8px;margin:4px 0}`;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.id = 'sfxtest';
  let dist = 12, angle = 0;
  const groups = [...groupedFx().entries()];
  root.innerHTML = `<h2>Geluidstest</h2><div class="row"><label>Afstand <span id="sfxd">${dist}</span> m</label><input id="sfxdist" type="range" min="0" max="800" value="${dist}"></div>
<div class="row"><label>Richting</label><input id="sfxang" type="range" min="0" max="360" value="0"></div>
<div>Groepen van de mixer: ${Object.keys(CATEGORIES).map(esc).join(', ')}. F8 verbergt dit paneel; de schuif "Effecten" staat in het pauzemenu.</div>
${groups.map(([g, list]) => `<h3>${esc(g)}</h3>${list.map((e) => `<button data-id="${esc(e.id)}">${esc(e.label)}</button>`).join('')}`).join('')}`;
  document.body.appendChild(root);
  const byId = new Map(groups.flatMap(([, list]) => list.map((e) => [e.id, e])));
  root.querySelector('#sfxdist').addEventListener('input', (e) => { dist = +e.target.value; root.querySelector('#sfxd').textContent = dist; });
  root.querySelector('#sfxang').addEventListener('input', (e) => { angle = (+e.target.value) * Math.PI / 180; });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    const entry = b && byId.get(b.dataset.id);
    if (!entry) return;
    const p = hoofdspeler(world);
    pushAudioEvent(world, { ...entry.ev, x: p.x + Math.cos(angle) * dist, y: p.y + Math.sin(angle) * dist });
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'F8') { e.preventDefault(); root.classList.toggle('hidden'); } });
}

