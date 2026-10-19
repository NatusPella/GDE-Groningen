// The cutscene preview page (game/cutpreview.html, #209): a list of every staged
// scene with its validation status, and a top-down view you can play and scrub.
// No game, no THREE: the scenes are sampled by cutpreview.js. The screenshot
// export draws each shot's still (top-down plus camera) to a PNG.
import { buildCatalog, frameAt, stillTimes, stillName, sceneBounds, summary, STATUS_LABEL } from './cutpreview.js';

const $ = (id) => document.getElementById(id);
const cv = $('cv');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let cat = [], cur = null, bounds = null, playing = false, last = 0;

async function load() {
  const [script, npcSource] = await Promise.all([
    fetch('storydata/script.json').then((r) => r.json()),
    fetch('js/missionstory.js').then((r) => r.text()),
  ]);
  cat = buildCatalog({ script, npcSource });
  renderList();
  if (cat.length) select(cat.find((e) => e.scene) || cat[0]);
}

function renderList() {
  const groups = [...new Set(cat.map((e) => e.group))];
  const n = summary(cat);
  $('list').innerHTML = `<div class="mut">${cat.length} scènes: ${n.ok} in orde, ${n.waarschuwing} let op, ${n.fout} fout. Botsing met gebouwen is hier niet te controleren.</div>` +
    groups.map((g) => `<h2>${g}</h2>` + cat.filter((e) => e.group === g).map((e) => `<button data-id="${e.id}" title="${STATUS_LABEL[e.status]}"><span class="dot ${e.status}"></span>${esc(e.title)}</button>`).join('')).join('');
  for (const b of $('list').querySelectorAll('button')) b.onclick = () => select(cat.find((e) => e.id === b.dataset.id));
}

function select(e) {
  cur = e;
  playing = false;
  bounds = sceneBounds(e);
  for (const b of $('list').querySelectorAll('button')) b.classList.toggle('sel', b.dataset.id === e.id);
  const t = $('t');
  t.max = String(e.duration || 0);
  t.value = '0';
  $('issues').innerHTML = [...e.issues.map((m) => `<li>${esc(m)}</li>`), ...e.warnings.map((m) => `<li class="w">${esc(m)}</li>`),
    ...(e.rhythm ? [`<li class="w">Ritme: ${e.rhythm.shots} shots, langste stilstaande camera ${e.rhythm.longestStill.toFixed(1)} s</li>`] : [])].join('');
  show(0);
}

function draw(t, target = cv) {
  const g = target.getContext('2d');
  g.fillStyle = '#1a2a1c';
  g.fillRect(0, 0, target.width, target.height);
  const f = cur && frameAt(cur, t);
  if (!f || !bounds) {
    g.fillStyle = '#ccc';
    g.font = '14px system-ui';
    g.fillText(cur ? 'Deze scène is niet te tonen: zie de meldingen.' : '', 20, 30);
    return f;
  }
  const w = bounds.x1 - bounds.x0, h = bounds.y1 - bounds.y0;
  const k = Math.min(target.width / w, target.height / h);
  const px = (x) => (x - bounds.x0) * k + (target.width - w * k) / 2;
  const py = (y) => (y - bounds.y0) * k + (target.height - h * k) / 2;
  const dot = (x, y, r, col, label) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(px(x), py(y), r, 0, Math.PI * 2);
    g.fill();
    if (label) { g.fillStyle = '#fff'; g.font = '12px system-ui'; g.fillText(label, px(x) + r + 3, py(y) + 4); }
  };
  for (const [id, p] of Object.entries(f.props)) if (p.visible !== false) dot(p.x, p.y, 5, '#4a8fe0', id);
  for (const [id, a] of Object.entries(f.actors)) {
    if (a.visible === false) continue;
    const speaking = f.speaker && cur.def.actors[id] && [].concat(cur.def.actors[id].speaker || []).includes(f.speaker);
    dot(a.x, a.y, 7, speaking ? '#ff7a5a' : '#d93f3f', `${id} (${a.anim})`);
    g.strokeStyle = '#fff';
    g.beginPath();
    g.moveTo(px(a.x), py(a.y));
    g.lineTo(px(a.x + Math.cos(a.a) * 0.8), py(a.y + Math.sin(a.a) * 0.8));
    g.stroke();
  }
  const c = f.camera;
  g.strokeStyle = '#e8c93a';
  g.beginPath();
  g.moveTo(px(c.position.x), py(c.position.y));
  g.lineTo(px(c.lookAt.x), py(c.lookAt.y));
  g.stroke();
  dot(c.position.x, c.position.y, 6, '#e8c93a', `camera, shot ${f.shot}, fov ${c.fov}`);
  return f;
}

function show(t) {
  const f = draw(t);
  $('clock').textContent = `${t.toFixed(1)} / ${(cur ? cur.duration : 0).toFixed(1)} s`;
  $('info').innerHTML = f ? `<b>Shot ${f.shot}</b>${f.speaker ? ` · ${esc(f.speaker)}: ${esc(f.text)}` : ''}` : '';
}

$('t').oninput = () => { playing = false; show(Number($('t').value)); };
$('play').onclick = () => {
  playing = !playing;
  last = performance.now();
  if (playing) requestAnimationFrame(tick);
};
function tick(now) {
  if (!playing || !cur) return;
  const t = Math.min(cur.duration, Number($('t').value) + (now - last) / 1000);
  last = now;
  $('t').value = String(t);
  show(t);
  if (t >= cur.duration) playing = false; else requestAnimationFrame(tick);
}

// One PNG per shot: the top-down still at the shot's start, named for the spelbot and the QA.
$('exp').onclick = () => {
  if (!cur || !cur.scene) return;
  const off = document.createElement('canvas');
  off.width = 960;
  off.height = 600;
  for (const t of stillTimes(cur)) {
    const f = draw(t, off);
    const a = document.createElement('a');
    a.href = off.toDataURL('image/png');
    a.download = stillName(cur.id, f.shot, t);
    a.click();
  }
  show(Number($('t').value));
};

load().catch((e) => { $('list').textContent = 'Laden mislukt: ' + e.message; });
