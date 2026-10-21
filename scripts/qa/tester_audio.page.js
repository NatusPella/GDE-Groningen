// Page half van scripts/qa/tester_bugs.mjs --check=audio (#326): welke ondertitelregels van de opening en van de
// introductie en afloop van M01 t/m M03 krijgen hun stem, en start die stem echt? De pagina meet drie dingen:
//  - elke regel die in de cinematic-ondertitel (#cine .cine-line) verschijnt, met tijd en spreker;
//  - elke audio-opname die start (HTMLMediaElement.play: src, uitkomst), eindigt (ended) of voortijdig stopt (pause voor het eind);
//  - de afspraak uit game/storydata/script.json: een regel met textOnly heeft geen opname en hoort stil te zijn.
// Uitvoer: per scène een lijst { tekst, spreker, getoond, stem: 'start'|'stil'|'afgekapt'|'geweigerd', verwacht: 'stem'|'tekst'|'onbekend' }.
// Draait met GDE_MENU_TEST=1; de opening is die van een echt nieuw spel, M01 t/m M03 gaan via playStoryIntro/-Outro.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TB = window.__tb || {};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const t0 = performance.now();
const T = () => Math.round(performance.now() - t0);

// --- sensoren
const plays = [];
const byEl = new WeakMap();
const origPlay = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function (...a) {
  const src = decodeURIComponent((this.currentSrc || this.src || '').replace(/^.*\/audio\//, 'audio/'));
  const rec = { t: T(), src, ok: null, ended: false, cut: null, dur: null };
  byEl.set(this, rec);
  plays.push(rec);
  let p;
  try { p = origPlay.apply(this, a); } catch (e) { rec.ok = 'fout: ' + e.name; return Promise.reject(e); }
  if (p && p.then) p.then(() => { rec.ok = true; }, (e) => { rec.ok = 'geweigerd: ' + e.name; });
  return p;
};
document.addEventListener('ended', (e) => { const r = byEl.get(e.target); if (r) { r.ended = true; r.dur = e.target.duration; } }, true);
document.addEventListener('pause', (e) => {
  const r = byEl.get(e.target); if (!r || r.ended) return;
  const d = e.target.duration;
  if (Number.isFinite(d) && e.target.currentTime < d - 0.2) { r.cut = +(e.target.currentTime / d).toFixed(2); r.dur = d; r.cutAt = T(); }
}, true);
// het gemurmel onder een regel zonder opname (audio.js playTextMumble) zijn korte driehoekstonen van 100 tot 300 Hz
const tones = [];
const origOscStart = OscillatorNode.prototype.start;
OscillatorNode.prototype.start = function (...a) {
  try { if (this.type === 'triangle' && this.frequency.value > 80 && this.frequency.value < 320) tones.push(T()); } catch (e) { /* meting */ }
  return origOscStart.apply(this, a);
};
const subs = [];
const lineEl = () => document.querySelector('#cine .cine-line');
const spkEl = () => document.querySelector('#cine .cine-speaker');
new MutationObserver(() => {
  const l = lineEl(); const text = l ? l.textContent.trim() : '';
  if (!text) return;
  const last = subs[subs.length - 1];
  if (last && last.text === text && T() - last.t < 400) return;
  subs.push({ t: T(), text, spreker: spkEl() ? spkEl().textContent.trim() : '' });
}).observe(document.body, { subtree: true, childList: true, characterData: true });

const script = await (await fetch('/storydata/script.json')).json();
const textOnly = new Map(); const voiced = new Map();
for (const sc of script.scenes) for (const l of sc.lines) { (l.textOnly ? textOnly : voiced).set(l.text, sc.id); }
const norm = (s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const expect = (text) => { const n = norm(text); for (const [t, id] of voiced) if (norm(t) === n) return 'stem'; for (const [t, id] of textOnly) if (norm(t) === n) return 'tekst'; return 'onbekend'; };

// elke ondertitelregel -> de opnames die binnen 0,3 s ervoor tot 0,7 s erna (en vóór de volgende regel) starten.
// 'start': een opname speelde (ok) en is niet afgekapt; 'afgekapt': hij speelde maar stopte voor het eind; 'geweigerd': alle pogingen
// faalden; 'stil': geen enkele poging. dubbel = meer dan één poging voor dezelfde regel (een tweede start breekt de eerste af).
function judge(from, to) {
  const rows = [];
  const mine = subs.filter((s) => s.t >= from && s.t <= to);
  for (let i = 0; i < mine.length; i++) {
    const s = mine[i];
    const until = (mine[i + 1] ? mine[i + 1].t : to) + 300;
    const ps = plays.filter((q) => q.t >= s.t - 300 && q.t < Math.min(s.t + 700, until) && /voicelines/.test(q.src));
    const goed = ps.filter((q) => q.ok === true || q.ok === null);
    let stem = 'stil';
    if (ps.length) stem = goed.length === 0 ? 'geweigerd' : goed.every((q) => q.cut != null) ? 'afgekapt' : 'start';
    const murmur = tones.filter((q) => q >= s.t - 100 && q < until).length;
    rows.push({ t: s.t - from, murmur, spreker: s.spreker, tekst: s.text.slice(0, 80), verwacht: expect(s.text), stem, dubbel: ps.length > 1, pogingen: ps.map((q) => ({ dt: q.t - s.t, src: q.src.replace(/^audio\/voicelines\//, '').slice(0, 60), ok: q.ok, cut: q.cut ?? null, ended: q.ended })) });
  }
  const bad = rows.filter((r) => (r.verwacht === 'stem' && r.stem !== 'start') || (r.verwacht === 'tekst' && r.stem !== 'stil'));
  // een tekstregel van een sprekend personage hoort een gemurmel te hebben (#326): geen stilte die 'kapot' voelt
  const zonderMurmel = rows.filter((r) => r.verwacht === 'tekst' && r.spreker && r.murmur === 0);
  return { regels: rows.length, metStem: rows.filter((r) => r.stem === 'start').length, stil: rows.filter((r) => r.stem === 'stil').length, afgekapt: rows.filter((r) => r.stem === 'afgekapt').length, geweigerd: rows.filter((r) => r.stem === 'geweigerd').length, dubbel: rows.filter((r) => r.dubbel).length, afwijkend: bad, zonderMurmel: zonderMurmel.map((r) => ({ t: r.t, spreker: r.spreker, tekst: r.tekst })), metMurmel: rows.filter((r) => r.murmur > 0).length, rows };
}

const cine = await import('/js/cinematics.js');
const result = {};

// --- 1. de opening van een echt nieuw spel
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const ss = document.getElementById('start-screen');
if (!TB.skipOpening) {
  for (let i = 0; i < 120; i++) {
    const up = !!ss && ss.classList.contains('visible');
    if (up) {
      const it = [...ss.querySelectorAll('.ss-item')].find((q) => /nieuw spel/i.test(q.textContent));
      if (it) it.click(); else key('Enter', 'Enter');
      await sleep(2500);
      if (!ss.classList.contains('visible')) break;
    } else await sleep(500);
  }
  const tOpen = T();
  let started = 0, quiet = 0;
  for (let i = 0; i < 3000; i++) { // tot 300 s
    await sleep(100);
    const active = cine.isCinematicActive();
    if (cine.isCinematicActive('story-opening')) started = started || T();
    if (started && !active) { if (++quiet > 40) break; } else quiet = 0;
  }
  result.opening = { begin: started ? started - tOpen : null, ...judge(tOpen, T()) };
  console.log('[tb] opening klaar: ' + result.opening.regels + ' regels');
} else {
  for (let i = 0; i < 120 && !document.body.classList.contains('game-started'); i++) {
    const up = !!ss && ss.classList.contains('visible');
    if (up) { const it = [...ss.querySelectorAll('.ss-item')].find((q) => /nieuw spel/i.test(q.textContent)); if (it) it.click(); }
    await sleep(2000);
  }
}

// --- 2. introductie en afloop van M01 t/m M03
const SP = await import('/js/storyarc.js');
const MS = await import('/js/missionstory.js');
const ids = (TB.missions || 'M01,M02,M03').split(',');
w.devInvuln = true;
for (const id of ids) {
  const step = SP.STEPS.find((s) => s.id === id || s.mission === id);
  const idx = step ? SP.MISSION_IDS.indexOf(step.mission) : -1;
  if (idx < 0) { result[id] = { fout: 'stap of missie niet gevonden: ' + id + ' ' + (step && step.mission) }; continue; }
  for (const kind of ['intro', 'outro']) {
    // een rustige plek: de speler staat te voet waar de opening eindigde
    for (let i = 0; i < 300 && (cine.isCinematicActive() || w.pendingRespawn); i++) await sleep(100);
    await sleep(800);
    const from = T();
    let ok = false;
    try { ok = kind === 'intro' ? MS.playStoryIntro(w, idx, { stage: idx }) : MS.playStoryOutro(w, idx, { stage: idx }); } catch (e) { result[id + '.' + kind] = { fout: String(e).slice(0, 200) }; continue; }
    let began = false, quiet = 0;
    for (let i = 0; i < 1800; i++) { // tot 180 s
      await sleep(100);
      const active = cine.isCinematicActive();
      if (active) began = true;
      if (began && !active) { if (++quiet > 25) break; } else if (!began && i > 60) break; else quiet = 0;
    }
    result[id + '.' + kind] = { gestart: !!ok && began, ...judge(from, T()) };
    console.log('[tb] ' + id + '.' + kind + ': ' + result[id + '.' + kind].regels + ' regels, stem ' + result[id + '.' + kind].metStem);
    if (cine.isCinematicActive()) cine.skipCinematic();
    await sleep(500);
  }
}
const alle = plays.filter((q) => /voicelines/.test(q.src));
result.samenvatting = { opnames: alle.length, meerdereOpnamesZelfdeRegel: Object.values(result).filter((v) => v && v.rows).reduce((n, v) => n + v.dubbel, 0), geweigerd: alle.filter((q) => q.ok !== true && q.ok !== null).length, afgekapt: alle.filter((q) => q.cut != null).length, geenUitkomst: alle.filter((q) => q.ok === null).length };
return JSON.stringify({ results: result });
