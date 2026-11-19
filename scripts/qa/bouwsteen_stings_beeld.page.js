// Page half of scripts/qa/bouwsteen_stings_beeld.mjs (desktop --perf-script body). Speelt elke missie-sting van
// game/js/sfx/stingen.js een voor een af via world.audioEvents (soort 'missiesting', dezelfde weg als de runner-haak
// stingen.push) en meet het niveau voor de gedempte uitgang met de 20 ms-tap (audiotap.js): piek en rms boven de
// stille achtergrond. Raakt geen missie en geen opslag. Beoordeel met het oor (dit script hoort niets): is elke sting
// herkenbaar, kort, in dezelfde toonsoort, en niet harder dan de stem of de radio?
const D = window.__debug; const w = D.world;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const PM = await import('/js/pausemenu.js');
const cine = await import('/js/cinematics.js');
const S = await import('/js/sfx/stingen.js');
const ST = await import('/js/settings.js'); ST.setSetting('musicVolume', 0); ST.setSetting('voiceVolume', 0);
D.input.canLock = () => false;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); if (PM.isPauseMenuOpen()) PM.closePauseMenu(); }, 100);
await sleep(Number(window.__bs.settle || 12000));
const tap = () => window.__qaAudio;
const win = (t0, t1) => tap().rms.filter((r) => r.t >= t0 && r.t <= t1);
const results = [];
for (const naam of S.STING_NAMEN) {
  const log = tap();
  let t0 = Math.round(performance.now() - log.t0);
  await sleep(600);
  const base = win(t0, t0 + 550);
  const bRms = base.length ? base.reduce((a, r) => a + r.rms, 0) / base.length : 0;
  const ok = S.pushSting(w, naam);
  t0 = Math.round(performance.now() - log.t0);
  await sleep(Math.round((S.stingDuur(naam) + 1.2) * 1000));
  const m = win(t0, t0 + Math.round((S.stingDuur(naam) + 1.2) * 1000));
  const peak = m.reduce((a, r) => Math.max(a, r.peak), 0);
  const rms = m.reduce((a, r) => Math.max(a, r.rms), 0);
  results.push({ naam, gepusht: ok, duur: S.stingDuur(naam), peak, rms, bRms: Math.round(bRms * 1e4) / 1e4, blokken: m.length });
  console.log('[bs] ' + JSON.stringify(results[results.length - 1]));
  await sleep(3200);   // voorbij elke afkoeltijd van stingen.js
}
clearInterval(skipper);
return JSON.stringify({ results });
