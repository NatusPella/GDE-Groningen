// Het hoofdmenu met de levende 3D-achtergrond (28-11) en de opslagkeuze voor Samen spelen, in Electron (draait als --perf-script, zie huidig_beeld.mjs).
//   a: met saves: luchtfoto, vervagen naar de stad, de baan (twee beelden), fps, Samen spelen -> Kies welke wereld je host, Terug, Doorgaan, opruimen
//   b: koude start zonder save: hoofdmenu op de stad, Nieuw spel, opruimen
// GDE_STARTKEUZE=vraag en GDE_MOEILIJKHEID=vraag zijn nodig (de keuzekaart en de niveaukaart verschijnen dan echt). Fase: window.__dsOnly[0].
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const FASE = (window.__dsOnly || [])[0] || 'a';
const out = [FASE];
const shot = async (name, wait = 700) => { await sleep(wait); console.log('[capture] ' + FASE + '-' + name); await sleep(900); };
const wacht = async (fn, max = 240, stap = 500) => { for (let i = 0; i < max; i++) { try { if (fn()) return true; } catch (e) { /* nog niet */ } await sleep(stap); } return false; };
const spelKlaar = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !document.querySelector('.ls.on:not(.out)') && !document.querySelector('#loading:not(.done):not([data-gone])');
const klassen = () => ['hm-3d', 'hm-3d-klaar'].filter((k) => document.body.classList.contains(k)).join('+') || '-';
const geheugen = async () => { const S3 = await imp('scene3d'); const r = S3.getRenderer(); const m = r.info.memory; return `geo ${m.geometries} tex ${m.textures} prog ${(r.info.programs || []).length} kinderen ${S3.getScene().children.length}`; };

const t0 = performance.now();
await sleep(800);
const heeftMenu = await wacht(() => document.querySelector('#online-start.sp-hm .sp-menu'), 400, 250);
out.push('menu ' + heeftMenu + ' na ' + Math.round(performance.now() - t0) + ' ms');
if (!heeftMenu) return JSON.stringify(out);
const tMenu = performance.now();
out.push('klassen bij menu ' + klassen());
await shot('foto', 300);
out.push('klassen 1,5 s ' + klassen());
const MA = await imp('menuachtergrond').catch(() => null); // zonder de module (de basis) is dit de controlerun: geen achtergrond
const klaar = await wacht(() => document.body.classList.contains('hm-3d-klaar'), 40, 250);
out.push('stad klaar ' + klaar + ' na ' + Math.round(performance.now() - tMenu) + ' ms');
await shot('stad1', 2200); // de fade (1,4 s) is af
await shot('stad2', 6000); // de baan is verder
out.push('geheugen in menu ' + await geheugen());
{
  const stand = () => (MA && MA.menuAchtergrondStand()) || { beelden: 0 };
  const f0 = stand().beelden; const w0 = performance.now(); await sleep(3000);
  out.push('beelden per seconde van de achtergrond ' + (((stand().beelden - f0) / ((performance.now() - w0) / 1000)) | 0));
  out.push('speler in menu ' + JSON.stringify([window.__debug.world.player.x | 0, window.__debug.world.player.y | 0]) + ' menuCam ' + window.__debug.world.menuCam + ' klok ' + window.__debug.world.clock);
}

const rij = (id) => [...document.querySelectorAll('.sp-menu [data-hm]')].findIndex((b) => b.dataset.hm === id);
if (FASE === 'a') {
  const i = rij('samen'); const slotsVoor = (await imp('saveslots')).listSlots(null).map((s) => ({ n: s.n, naam: s.name, geld: s.summary ? s.summary.money : null, t: s.summary ? s.summary.savedAt : null }));
  tap(String(i + 1), 'Digit' + (i + 1));
  const kaarten = await wacht(() => document.querySelector('#saveslots .ssl-card'), 40, 250);
  out.push('samen: keuzescherm ' + kaarten + ' titel "' + (document.querySelector('#saveslots .m-h1') || {}).textContent + '" opzij "' + (document.querySelector('#saveslots .m-eb') || {}).textContent + '"');
  out.push('eerste kaart ' + ((document.querySelector('#saveslots .ssl-card') || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) + ' | kaarten ' + document.querySelectorAll('#saveslots .ssl-card').length);
  out.push('netwerk: sessie ' + (window.__debug.world.coopRole || 'geen') + ' klassen ' + klassen());
  await shot('samen-kies', 1200);
  tap('Escape', 'Escape'); await sleep(900);
  out.push('terug in hoofdmenu ' + !!document.querySelector('#online-start.sp-hm .sp-menu') + ' keuzescherm weg ' + !document.querySelector('#saveslots'));
  const na = (await imp('saveslots')).listSlots(null).map((s) => ({ n: s.n, naam: s.name, geld: s.summary ? s.summary.money : null, t: s.summary ? s.summary.savedAt : null }));
  out.push('saves ongewijzigd na Terug ' + (JSON.stringify(slotsVoor) === JSON.stringify(na)));
  await shot('terug', 800);
  tap('Enter', 'Enter'); // Doorgaan
  await sleep(150);
  out.push('klassen direct na Doorgaan ' + klassen() + ' menu weg ' + !document.querySelector('#online-start') + ' achtergrond actief ' + !!(MA && MA.menuAchtergrondStand()));
}
if (FASE === 'b') {
  tap('Enter', 'Enter'); // Nieuw spel
  const k = await wacht(() => document.querySelector('#online-start') && /pittig/.test(document.querySelector('#online-start').textContent), 120, 250);
  out.push('niveaukaart ' + k + ' klassen ' + klassen());
  if (k) { await shot('niveau', 800); tap('2', 'Digit2'); }
}
const ok = await wacht(spelKlaar, 360);
out.push('spel klaar ' + ok);
const cine = await imp('cinematics');
for (let i = 0; i < 60 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(250); }
await sleep(2500);
const w = window.__debug.world;
out.push('opgeruimd: klassen ' + klassen() + ' override ' + JSON.stringify(w.cameraOverride && w.cameraOverride.bron) + ' menuCam ' + w.menuCam + ' pinnen ' + JSON.stringify(w.map._shotKeys ? w.map._shotKeys.size : null) + ' clock ' + w.clock.toFixed(1));
out.push('geheugen in spel ' + await geheugen());
await sleep(35000);
out.push('geheugen in spel +35 s ' + await geheugen());
out.push('speler ' + JSON.stringify([w.player.x | 0, w.player.y | 0]) + ' geld ' + w.money + ' plek ' + (await imp('savegame')).currentSlot());
await shot('spel', 800);
return JSON.stringify(out);
