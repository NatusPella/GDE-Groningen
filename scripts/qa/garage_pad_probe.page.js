// Probe: bereikt de D-pad elke kaart van de Garage in elke tab? Bouwt een graaf (per kaart: wat doen omhoog/omlaag/links/rechts) en doet BFS vanaf de startfocus.
// De kop (gamepad, hulpjes, spel starten) komt uit controller_sweep.page.js (zie garage_pad_probe.mjs).
const GP = { tabs: {} };
async function probeTab(cat, naam) {
  PM.openPauseMenu('garage'); await sleep(1800);
  const root = pm();
  { const t = root.querySelector(`[data-garage-cat="${cat}"]`); if (!t) return; t.click(); await sleep(600); }
  const kaarten = () => [...root.querySelectorAll('.gar-list .gar-card')].filter(echtZichtbaar);
  const alle = klikbaar(root);
  const ks = kaarten();
  const sleutel = (e) => (e.dataset && e.dataset.garageSelect ? 'k:' + e.dataset.garageSelect : label(e));
  const start = document.activeElement;
  const graaf = new Map();
  const wachtrij = [start];
  const gezien = new Set([start]);
  let stappen = 0;
  while (wachtrij.length && stappen < 600) {
    const e = wachtrij.shift();
    if (!e || !e.isConnected) continue;
    const kant = {};
    for (const d of ['down', 'up', 'right', 'left']) {
      e.focus({ preventScroll: true }); await druk(d, 2); stappen++;
      const nu = document.activeElement;
      kant[d] = nu && nu !== e && root.contains(nu) ? sleutel(nu) : null;
      if (nu && nu !== e && root.contains(nu) && !gezien.has(nu)) { gezien.add(nu); wachtrij.push(nu); }
    }
    graaf.set(sleutel(e), kant);
  }
  const mist = ks.filter((k) => !gezien.has(k));
  const rij = (k) => { const r = k.getBoundingClientRect(); return Math.round(r.top) + ',' + Math.round(r.left); };
  GP.tabs[naam] = {
    doelen: alle.length, kaarten: ks.length, bereikt: gezien.size, startFocus: label(start),
    mist: mist.map((k) => k.textContent.trim().slice(0, 30) + ' @' + rij(k)),
    lijstScroll: (() => { const l = root.querySelector('.gar-list'); return l ? [l.scrollHeight, l.clientHeight] : null; })(),
    kolommen: [...new Set(ks.map((k) => Math.round(k.getBoundingClientRect().left)))],
  };
  GP.tabs[naam].graaf = Object.fromEntries([...graaf].filter(([k]) => /^k:/.test(k)).slice(0, 120)); GP.tabs[naam].namen = Object.fromEntries(ks.map((k) => [k.dataset.garageSelect, k.textContent.trim().slice(0, 24) + " @" + rij(k)]));
  try { PM.closePauseMenu(); } catch { /* */ }
  await sleep(500);
}
const cats = CS.cats || ['all'];
for (const c of cats) { try { await probeTab(c, c); } catch (e) { uit.overgeslagen.push(c + ': ' + e.message); } }
uit.gp = GP;
clearInterval(skipper);
return JSON.stringify(uit);
