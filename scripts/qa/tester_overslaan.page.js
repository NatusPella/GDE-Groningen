// Page half van scripts/qa/tester_bugs.mjs --check=overslaan (#986): het echte pad van de opening in een nieuw spel.
// Kiest Nieuw spel, wacht op de openingsfilm, houdt Spatie ingedrukt (zoals een speler of een controller-A dat doet) en meet
// daarna of het spel netjes in de normale startstand staat: geen film meer, de stap M00 klaar en M01 aan de beurt, geen
// tweede start (geen 'start'-vlucht of tweede opening), de klok op de ochtend, geen missie die dubbel begon.
// Optie --opts={"tweede":1} laat de opening in het eerste bedrijf (de trailer) overslaan (standaard) of in de keuken (tweede=1).
// Uitvoer: JSON in de [perf-script]-regel (results.overslaan); beelden als [capture] tb-hint en tb-na.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TB = window.__tb || {};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const cineMod = await import('/js/cinematics.js');
const IDS = ['start', 'intro', 'story-opening', 'story-opening-trailer', 'story-opening-keuken', 'story-opening-verhuisdag'];
const cidNow = () => IDS.find((c) => cineMod.isCinematicActive(c)) || (cineMod.isCinematicActive() ? '?' : '');
const seen = []; // elke film-id die in beeld kwam, met tijd
let lastCid = null;
const t0 = performance.now();
const T = () => Math.round(performance.now() - t0);
const watch = setInterval(() => { const c = cidNow(); if (c !== lastCid) { seen.push({ t: T(), cid: c }); lastCid = c; } }, 50);

// Nieuw spel kiezen
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120; i++) {
  if (ss && ss.classList.contains('visible')) {
    if (window.__menuStart) window.__menuStart('nieuw');
    await sleep(2500);
    if (!ss.classList.contains('visible')) break;
  } else await sleep(500);
}
const tStart = T();
const out = { nieuwSpelNa: tStart };

// wacht op de openingsfilm (de montage heet 'intro' of de terugval 'story-opening')
let opening = false;
for (let i = 0; i < 1200; i++) { // 120 s
  await sleep(100);
  if (cineMod.isCinematicActive('intro') || cineMod.isCinematicActive('story-opening') || cidNow().startsWith('story-opening')) { opening = true; break; }
}
out.openingBegon = opening ? T() - tStart : null;
out.eersteFilm = (seen.find((s) => s.cid && s.cid !== '') || {}).cid || null;
if (!opening) { clearInterval(watch); return JSON.stringify({ results: { overslaan: { ...out, fout: 'de opening begon niet' } } }); }

// de hint staat er, met een knopnaam
await sleep(3500);
const skipEl = document.querySelector('#cine .cine-skip');
const rootEl = document.getElementById('cine');
out.hint = skipEl ? skipEl.textContent.trim().replace(/\s+/g, ' ') : null;
out.hintZichtbaar = !!(rootEl && rootEl.classList.contains('show-skip') && skipEl && getComputedStyle(skipEl).opacity > 0.5);
console.log('[capture] tb-hint');
await sleep(400);

// naar het tweede bedrijf (keuken) als gevraagd: wacht tot de montage klaar is
if (TB.tweede) {
  for (let i = 0; i < 1800 && cidNow() === 'intro'; i++) await sleep(100);
  await sleep(3000);
}
out.overgeslagenIn = cidNow();
const clock0 = w.clock;

// Spatie ingedrukt houden (1,3 s: de overslaan-houdtijd is 0,9 s)
const send = (type) => { for (const t of [window]) t.dispatchEvent(new KeyboardEvent(type, { key: ' ', code: 'Space', bubbles: true, cancelable: true })); };
send('keydown');
let ring = 0;
for (let i = 0; i < 13; i++) { await sleep(100); const h = skipEl ? Number(skipEl.style.getPropertyValue('--hold') || 0) : 0; ring = Math.max(ring, h); }
send('keyup');
out.ringMax = +ring.toFixed(2);
const tSkip = T();

// de film stopt, de opening is klaar: wacht tot er geen film meer is
let weg = null;
for (let i = 0; i < 150; i++) { await sleep(100); if (!cineMod.isCinematicActive()) { weg = T() - tSkip; break; } }
out.filmWegNa = weg;
await sleep(6000); // adem: een dubbele start of een tweede opening zou nu beginnen
console.log('[capture] tb-na');
const St = window.__story;
const cur = St.current();
const view = St.view ? St.view() : null;
const m = St.mission ? St.mission() : null;
const after = seen.filter((s) => s.t > tSkip);
out.stap = cur;
out.klokVoor = clock0;
out.klokNa = w.clock;
out.filmNaSlaan = cineMod.isCinematicActive();
out.filmenNaSlaan = after.map((s) => s.cid + '@' + (s.t - tSkip));
out.missie = m && (m.active !== undefined ? { active: m.active, index: m.index, phase: m.phase } : m);
out.paused = !!w.paused;
out.hudZichtbaar = !document.body.classList.contains('cine-hide-hud');
out.tweedeOpening = seen.filter((s) => s.cid && s.cid.startsWith('story-opening')).length;
out.gezien = seen;
clearInterval(watch);
return JSON.stringify({ results: { overslaan: out } });
