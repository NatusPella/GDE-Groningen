// Page-script voor scripts/qa/cutscene_shots_web.mjs --page=openingfilm_shots.page.js: speelt de openingsfilm (intromontage.js
// playIntroMontage, film) vanaf CS.startAt seconden en neemt CS.n stills met CS.every seconden ertussen (echte tijd).
const D = window.__debug; const w = D.world;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const CS = window.__cs || {};
const cine = await import('/js/cinematics.js');
const im = await import('/js/intromontage.js');
D.input.canLock = () => false;
if (!CS.live) for (let i = 0; i < 100 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(400); }
if (!CS.live) await sleep(CS.settle || 8000);
// CS.live: de film die een nieuw spel zelf start (geen eigen start), anders vanaf CS.startAt
if (!CS.live) im.playIntroMontage(w, { film: true, startAt: CS.startAt || 0 });
else await sleep(CS.delay || 0);
const out = { shots: [] };
for (let k = 0; k < (CS.n || 12); k++) {
  await sleep((CS.every || 0.6) * 1000);
  const name = 'film-' + String(k).padStart(2, '0');
  await window.__cap(name);
  out.shots.push(name);
}
cine.skipCinematic && cine.skipCinematic();
return JSON.stringify(out);
