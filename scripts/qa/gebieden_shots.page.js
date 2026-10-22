// Page half van scripts/qa/gebieden_shots.mjs (desktop --perf-script body; #414).
// Telt wat er te doen is per wijk, plaats en streek (de catalogus uit de echte wereld), speelt een paar gebieden
// uit via gebiedenlive.doeTaak en neemt beelden van de kaartlaag Veroverd en van het overzicht in het Loopbaan-scherm.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(700); }
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const MV = await imp('mapview');
const GL = await imp('gebiedenlive');
const G = await imp('gebieden');
const errors = [];
window.addEventListener('error', (e) => { errors.push(String(e.message)); console.error('[gb-error] ' + e.message); });
window.addEventListener('unhandledrejection', (e) => { errors.push(String(e.reason)); console.error('[gb-error] ' + e.reason); });
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

let hold = null, done = false;
const tick = () => { if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = 0; w.camYaw = 0; } w.clock = 13; if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const cap = async (name) => { console.log('[capture] ' + name); await sleep(900); };

// wachten tot de bronnen er zijn
let o = null;
for (let i = 0; i < 300 && !o; i++) { o = GL.getOverzicht(); if (!o) await sleep(200); }
const results = { css: [innerWidth, innerHeight], shots: [], errors };
if (!o) { results.fout = 'geen indeling'; done = true; return JSON.stringify(results); }
const ind = o.ind;
const perSoort = {};
for (const t of ind.taak.values()) perSoort[t.soort] = (perSoort[t.soort] || 0) + 1;
const zonder = [...ind.taak.values()].filter((t) => !(ind.perTaak.get(t.id) || []).length).map((t) => t.id);
results.catalogus = {
  taken: ind.taak.size, perSoort, zonderGebied: zonder.length, zonderVoorbeeld: zonder.slice(0, 12),
  gebieden: ind.gebieden.length,
  perNiveau: G.NIVEAUS.map((n) => { const l = ind.gebieden.filter((g) => g.niveau === n.id); return { niveau: n.id, totaal: l.length, veroverbaar: l.filter((g) => g.veroverbaar).length }; }),
  gemeenten: ind.gebieden.filter((g) => g.niveau === 'gemeente').map((g) => `${g.naam}:${g.taken.length}`),
  woonplaatsenMetTaken: ind.gebieden.filter((g) => g.niveau === 'woonplaats' && g.taken.length).map((g) => `${g.naam}:${g.taken.length}`),
  grootsteWijken: ind.gebieden.filter((g) => g.niveau === 'wijk').sort((a, b) => b.taken.length - a.taken.length).slice(0, 8).map((g) => `${g.naam}:${g.taken.length}`),
  grootsteBuurten: ind.gebieden.filter((g) => g.niveau === 'buurt').sort((a, b) => b.taken.length - a.taken.length).slice(0, 8).map((g) => `${g.naam}:${g.taken.length}`),
  startProfiel: { gedaan: o.profiel.gedaan.length, beloond: o.profiel.beloond.length, zaad: !!o.profiel.zaad },
};

const stad = ind.gebieden.find((g) => g.niveau === 'gemeente' && g.naam === 'Groningen') || ind.gebieden[0];
hold = { x: stad.x, y: stad.y };

// 1. de kaart zonder voortgang
PM.openPauseMenu('map'); await sleep(1500);
MV.setMapView(stad.x, stad.y, 2); await sleep(3500); await cap('gb-kaart-leeg'); MV.setMapView(stad.x, stad.y, 0.6); await sleep(3000); await cap('gb-kaart-leeg-wijd'); results.shots.push('gb-kaart-leeg-wijd'); MV.setMapView(stad.x, stad.y, 2); await sleep(1500); results.shots.push('gb-kaart-leeg');
PM.closePauseMenu(); await sleep(500);

// 2. een paar gebieden spelen: een wijk helemaal, een wijk bijna, een plaats helemaal
const wijken = ind.gebieden.filter((g) => g.niveau === 'wijk' && g.veroverbaar).sort((a, b) => a.taken.length - b.taken.length);
const plaatsen = ind.gebieden.filter((g) => g.niveau === 'woonplaats' && g.veroverbaar && g.naam !== 'Groningen').sort((a, b) => a.taken.length - b.taken.length);
const volledig = wijken.find((g) => g.taken.length >= 3) || wijken[0];
const bijna = wijken.find((g) => g !== volledig && g.taken.length >= 4) || wijken.find((g) => g !== volledig);
const dorp = plaatsen.find((g) => g.taken.length >= 2) || plaatsen[0];
results.gekozen = { volledig: volledig && volledig.naam, bijna: bijna && bijna.naam, dorp: dorp && dorp.naam };
const geldVoor = w.money;
const meldingen = [];
const origMsg = w.addMessage;
w.addMessage = function (...a) { meldingen.push(String(a[0])); return origMsg.apply(this, a); };
if (bijna) { const ids = [...bijna.taken]; for (let i = 0; i < ids.length - 1; i++) GL.doeTaak(w, ids[i]); }
if (dorp) { for (const id of dorp.taken) GL.doeTaak(w, id); }
if (volledig) {
  const ids = [...volledig.taken];
  for (let i = 0; i < ids.length - 1; i++) GL.doeTaak(w, ids[i]);
  hold = { x: ind.taak.get(ids.at(-1)).x, y: ind.taak.get(ids.at(-1)).y };
  p.x = hold.x; p.y = hold.y;
  await sleep(9000); // de wijknaam bij het binnenkomen is dan weg
  const m0 = w.money;
  GL.doeTaak(w, ids.at(-1));
  results.beloning = { wijk: volledig.naam, geld: w.money - m0 };
  await sleep(700);
  await cap('gb-hud-beloning'); results.shots.push('gb-hud-beloning');
}
results.meldingen = meldingen.slice(0, 20);
results.geldVerschil = w.money - geldVoor;
await sleep(6500);

// 3. de kaart met voortgang: de veroverde wijk dichtbij, de stad op middelgrote zoom, de provincie wijd
PM.openPauseMenu('map'); await sleep(1500);
if (volledig) { MV.setMapView(volledig.x, volledig.y, 4); await sleep(3500); await cap('gb-kaart-wijk-z4'); results.shots.push('gb-kaart-wijk-z4'); }
if (bijna) { MV.setMapView(bijna.x, bijna.y, 4); await sleep(3500); await cap('gb-kaart-bijna-z4'); results.shots.push('gb-kaart-bijna-z4'); }
MV.setMapView(stad.x, stad.y, 2); await sleep(3500); await cap('gb-kaart-stad-z2'); MV.setMapView(stad.x, stad.y, 1); await sleep(3500); await cap('gb-kaart-stad-z1'); results.shots.push('gb-kaart-stad-z1'); results.shots.push('gb-kaart-stad-z2');
if (dorp) { MV.setMapView(dorp.x, dorp.y, 3); await sleep(3500); await cap('gb-kaart-dorp-z3'); results.shots.push('gb-kaart-dorp-z3'); }
MV.setMapView(stad.x, stad.y, 0.6); await sleep(3500); await cap('gb-kaart-wijd'); results.shots.push('gb-kaart-wijd');
PM.closePauseMenu(); await sleep(600);

// 4. het overzicht in het Loopbaan-scherm
PM.openPauseMenu('loopbaan'); await sleep(1500);
const klik = async (sel) => { const el = document.querySelector(sel); if (el) { el.click(); await sleep(700); } return !!el; };
results.tabGevonden = await klik('[data-lbview="gebieden"]');
await cap('gb-loopbaan-overzicht'); results.shots.push('gb-loopbaan-overzicht');
if (volledig) { results.klikVolledig = await klik(`[data-gebied="${volledig.id}"]`); await cap('gb-loopbaan-wijk-klaar'); results.shots.push('gb-loopbaan-wijk-klaar'); }
if (bijna) { results.klikBijna = await klik(`[data-gebied="${bijna.id}"]`); await cap('gb-loopbaan-wijk-bezig'); results.shots.push('gb-loopbaan-wijk-bezig'); }
results.tabTerug = await klik('[data-lbview="vakken"]');
await cap('gb-loopbaan-vakken'); results.shots.push('gb-loopbaan-vakken');
PM.closePauseMenu(); await sleep(400);

// 5. de safehouses: de woning bij de veroverde wijk (cadeau), een die te koop is, het menu en de kaart
const SH = window.__safehuis;
const SHOP = await imp('shopui');
const huizen = SH ? SH.lijst() : [];
results.huizen = { aantal: huizen.length, eigen: huizen.filter((h) => h.eigen).map((h) => h.id), voorbeeld: huizen.slice(0, 4).map((h) => `${h.naam} · ${h.adres}`) };
// Het huisje krijgt zijn echte plek pas als je binnen 200 m komt (op droog land): eerst erheen, dan de vaste plek opnieuw lezen.
const naarHuis = async (h0, naam, afstand = 0) => {
  const zet = (h, af) => { const d = h.deur; hold = { x: d.x + Math.cos(h.ang) * af, y: d.y + Math.sin(h.ang) * af }; p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = h.ang + Math.PI; w.camYaw = p.angle; };
  zet(h0, 0);
  await sleep(4000);
  const h = SH.lijst().find((q) => q.id === h0.id) || h0;
  results.plek = results.plek || [];
  results.plek.push({ id: h.id, naam: h.naam, geplaatst: h.geplaatst, onbruikbaar: h.onbruikbaar, verschoof: Math.round(Math.hypot(h.x - h0.x, h.y - h0.y)) });
  if (h.onbruikbaar) return;
  zet(h, afstand);
  await sleep(afstand ? 8000 : 3000);
  await cap(naam); results.shots.push(naam);
};
const eigen = huizen.find((h) => h.eigen);
if (eigen) {
  await naarHuis(eigen, 'gb-huis-eigen-ver', 11);
  await naarHuis(eigen, 'gb-huis-eigen-deur', 0);
  SH.menu(eigen.id); await sleep(1200); await cap('gb-huis-eigen-menu'); results.shots.push('gb-huis-eigen-menu');
  SHOP.closeShopMenu(); await sleep(500);
}
const teKoop = huizen.find((h) => !h.eigen && h.id !== (eigen && eigen.id));
if (teKoop) {
  w.money = Math.max(w.money, 9000);
  await naarHuis(teKoop, 'gb-huis-tekoop-ver', 11);
  await naarHuis(teKoop, 'gb-huis-tekoop-deur', 0);
  SH.menu(teKoop.id); await sleep(1200); await cap('gb-huis-tekoop-menu'); results.shots.push('gb-huis-tekoop-menu');
  SHOP.closeShopMenu(); await sleep(500);
  results.prompt = (window.__debug && window.__debug.prompt) ? 'n.v.t.' : null;
}
PM.openPauseMenu('map'); await sleep(1500);
if (eigen) { MV.setMapView(eigen.x, eigen.y, 4); await sleep(3500); await cap('gb-kaart-huizen-z4'); results.shots.push('gb-kaart-huizen-z4'); }
PM.closePauseMenu(); await sleep(600);
results.huizenNa = SH ? SH.lijst().map((h) => ({ id: h.id, geplaatst: h.geplaatst, mesh: h.mesh, eigen: h.eigen })).slice(0, 6) : null;

const na = GL.getOverzicht();
results.eind = { gedaan: na.profiel.gedaan.length, beloond: na.profiel.beloond, samenvatting: G.samenvatting(na.profiel, na.ind) };
done = true;
clearInterval(skipper);
return JSON.stringify(results);
