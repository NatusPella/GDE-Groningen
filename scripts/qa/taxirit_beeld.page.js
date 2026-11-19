// Page half van scripts/qa/taxirit_beeld.mjs (desktop --perf-script body; #882 taxi, #926 trein): start een echte taxirit en een
// echte treinrit via de kaartopties (reiskaart.reisOptiesVoor -> reisrit.startMeerijden), neemt beelden op vaste momenten
// (`[capture] naam`, desktop/devtools.js) en meet per rit: welke scène liep (de echte rit of de oude DOM-laag), de camera, de
// zwarte sprong met kloktekst, de klok en waar de speler uitkwam. window.__tr = { vanNaam, naar: [namen], momenten: [s], max: s }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(200); }
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const RK = await imp('reiskaart');
const RR = await imp('reisrit');
const R3 = await imp('reisrit3d');
const CFG = window.__tr || {};
const errors = [];
window.addEventListener('error', (e) => { errors.push(String(e.message)); console.error('[tr-error] ' + e.message); });
window.addEventListener('unhandledrejection', (e) => { errors.push(String(e.reason)); console.error('[tr-error] ' + e.reason); });
const warn = console.warn;
console.warn = (...a) => { if (String(a[0]).startsWith('reisrit')) errors.push(a.map(String).join(' ')); warn(...a); };
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.money = 900;

const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
const plaats = (naam) => index.places.find((x) => x.name === naam);
const van = plaats(CFG.vanNaam || 'Groningen') || index.places[0];
// Wat staat er recht voor de camera? De eerste treffer van een straal door het midden van het beeld, met zijn naam, materiaal
// (kleur, dekking) en de namen van zijn ouders: zo is een vlak dat het beeld vult te herleiden tot zijn onderdeel.
const kijkVoorwerp = () => {
  try {
    const S3 = window.__scene3d, T = S3.THREE;
    const rc = new T.Raycaster(); rc.setFromCamera(new T.Vector2(0, 0), S3.cam);
    const hit = rc.intersectObjects(S3.scene.children, true).find((h) => h.object.visible && h.object.isMesh);
    if (!hit) return null;
    const o = hit.object, m = Array.isArray(o.material) ? o.material[hit.face ? hit.face.materialIndex : 0] : o.material;
    const ouders = []; for (let q = o.parent; q && ouders.length < 5; q = q.parent) ouders.push(q.name || q.type);
    const t = w.ritTaxi; let plek = null;
    if (t) { const dx = hit.point.x - t.x, dy = hit.point.z - t.y, c = Math.cos(t.angle), n = Math.sin(t.angle); plek = { vooruit: +(dx * c + dy * n).toFixed(2), rechts: +(-dx * n + dy * c).toFixed(2), hoog: +(hit.point.y - (t.z || 0)).toFixed(2) }; }
    return { plek, afstand: +hit.distance.toFixed(2), naam: o.name || o.type, kleur: m && m.color ? m.color.getHexString() : null, dekking: m ? m.opacity : null, transparant: m ? !!m.transparent : null, ouders };
  } catch (e) { return { fout: String(e) }; }
};
const MOMENTEN = CFG.momenten || [1.5, 5, 8.5, 10.4, 12.5, 17, 21];
const out = { van: van.name, ritten: [], errors };

async function rit(soort, naam) {
  const dest = plaats(naam);
  const rep = { soort, naar: naam };
  out.ritten.push(rep);
  if (!dest) { rep.fout = 'plaats niet gevonden'; return; }
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = van.x; p.y = van.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  await sleep(6000); // de wereld rond de start laten streamen
  const opts = RK.reisOptiesVoor(w, { x: dest.x, y: dest.y, name: dest.name });
  const o = opts.find((x) => x.id === soort);
  rep.optie = o ? { eta: o.eta, etaS: o.etaS, prijs: o.price, lengte: Math.round(o.length), legs: (o.legs || []).map((l) => l.kind) } : null;
  if (!o) { rep.fout = 'geen optie ' + soort; return; }
  const klok0 = w.clock, geld0 = w.money;
  let uitkomst = null;
  const t0 = performance.now();
  RR.startMeerijden(w, o, { x: dest.x, y: dest.y, name: dest.name }).then((r) => { uitkomst = r; });
  const volgende = [...MOMENTEN];
  rep.samples = [];
  let echt = false, oud = false;
  while (!uitkomst && (performance.now() - t0) / 1000 < (CFG.max || 70)) {
    const s = (performance.now() - t0) / 1000;
    const zwart = document.querySelector('.rr3-zwart');
    const co = w.cameraOverride;
    const rij = {
      s: +s.toFixed(1), actief: R3.isRit3dActive(), cine: cine.isCinematicActive('reisrit'), oudeScene: !!document.querySelector('.reisrit'),
      zwart: zwart ? +(+zwart.style.opacity || 0).toFixed(2) : null, tekst: (document.querySelector('.rr3-tekst') || {}).textContent || '',
      klok: w.dayNight ? w.dayNight.label : null, taxi: w.ritTaxi ? { x: Math.round(w.ritTaxi.x), y: Math.round(w.ritTaxi.y), z: +(w.ritTaxi.z || 0).toFixed(1), v: +(w.ritTaxi.speed || 0).toFixed(1) } : null,
      cam: co ? { x: Math.round(co.position.x), y: Math.round(co.position.y), z: +(co.position.z || 0).toFixed(1) } : null,
      speler: { x: Math.round(p.x), y: Math.round(p.y) }, health: Math.round(w.health),
      kijk: kijkVoorwerp(),
    };
    if (rij.actief || rij.cine) echt = true;
    if (rij.oudeScene) oud = true;
    rep.samples.push(rij);
    if (volgende.length && s >= volgende[0]) { console.log('[capture] tr-' + soort + '-' + String(volgende.shift()).replace('.', '_')); await sleep(900); } else await sleep(250);
  }
  rep.echteRit = echt; rep.oudeSceneGezien = oud;
  rep.uitkomst = uitkomst || 'time-out';
  rep.duurS = +((performance.now() - t0) / 1000).toFixed(1);
  await sleep(1500);
  rep.landing = { x: Math.round(p.x), y: Math.round(p.y), afstandTotDoel: Math.round(Math.hypot(p.x - dest.x, p.y - dest.y)) };
  rep.klokVerschilUur = +(((w.clock - klok0) + 24) % 24).toFixed(2);
  rep.geldBetaald = Math.round(geld0 - w.money);
  rep.opgeruimd = { ritTaxi: !w.ritTaxi, hold: !w.challengeHoldPlayer, cameraOverride: !w.cameraOverride, hudWeg: !document.querySelector('.reisrit3d') };
  rep.hudKlaar = true;
  console.log('[capture] tr-' + soort + '-aangekomen');
  await sleep(900);
}

try {
  const doelen = CFG.naar || ['Winsum', 'Delfzijl'];
  await rit('taxi', doelen[0]);
  await rit('trein', doelen[1] || doelen[0]);
} catch (e) { out.fout = String(e && e.stack || e).slice(0, 500); }
return JSON.stringify(out);
