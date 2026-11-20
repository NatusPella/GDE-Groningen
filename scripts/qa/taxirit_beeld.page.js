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
// de opening (#986) loopt eerst: overslaan en uitlopen, anders weigert de rit te starten (een andere scène gaat voor)
for (let i = 0; i < 12 && cine.isCinematicActive(); i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(2500); }
await sleep(3000);
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
// frametijden: elk beeld van de rit (requestAnimationFrame), per rit samengevat (gemiddelde, p95, max, aantal beelden boven 50 ms)
let opname = null, laatsteBeeld = performance.now();
const beeldLus = (n) => { if (opname) opname.push(n - laatsteBeeld); laatsteBeeld = n; requestAnimationFrame(beeldLus); };
requestAnimationFrame(beeldLus);
const frameStats = (a) => { const s = [...a].sort((x, y) => x - y), g = a.reduce((n, x) => n + x, 0) / (a.length || 1); return { beelden: a.length, gemMs: +g.toFixed(1), p95Ms: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(1), maxMs: +(s[s.length - 1] || 0).toFixed(1), boven50: a.filter((x) => x > 50).length }; };
const MOMENTEN = CFG.momenten || [1.5, 3, 5, 7.2, 8.5, 12.5, 17, 21];
const out = { van: van.name, ritten: [], errors };

// wat kost de cabine? Beelden met en zonder (de mesh aan en uit, afwisselend) en de tekenaanroepen en driehoeken uit renderer.info.
async function kostenCabine(rep) {
  const S3 = window.__scene3d, m = (S3.actors().vehicles.get(w.ritTaxi.id) || {}).userData, cab = m && m.ritCabine && m.ritCabine.mesh;
  if (!cab) { rep.kosten = { fout: 'geen cabine' }; return; }
  const meet = async (aan) => { cab.visible = aan; await sleep(400); const f = []; let l = performance.now(); for (let i = 0; i < 40; i++) { await new Promise((r) => requestAnimationFrame(r)); const n = performance.now(); f.push(n - l); l = n; } const i = S3.renderer.info.render; return { gemMs: +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1), calls: i.calls, driehoeken: i.triangles }; };
  const aan = [], uit = [];
  for (let k = 0; k < 3; k++) { aan.push(await meet(true)); uit.push(await meet(false)); }
  cab.visible = true;
  const gem = (a, k) => +(a.reduce((x, y) => x + y[k], 0) / a.length).toFixed(1);
  rep.kosten = { metMs: gem(aan, 'gemMs'), zonderMs: gem(uit, 'gemMs'), callsMet: aan[0].calls, callsZonder: uit[0].calls, driehoekenMet: aan[0].driehoeken, driehoekenZonder: uit[0].driehoeken };
}

async function rit(soort, naam) {
  const dest = plaats(naam);
  const rep = { soort, naar: naam };
  out.ritten.push(rep);
  if (!dest) { rep.fout = 'plaats niet gevonden'; return; }
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = van.x; p.y = van.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  await sleep(6000); // de wereld rond de start laten streamen
  if (soort === 'taxi' && CFG.padAudit) {
    // #882: het ritpad vóór (de gewone spline door de route) en na (ritroute.js) tegen de gebouwen van de echte wereld, voor een aantal doelen
    try {
      const RT = await imp('routing'), CD = await imp('cinedrive'), RR = await imp('ritroute');
      const binnen = (x, y) => RT.insideBuilding(map, x, y);
      out.padAudit = [];
      for (const nm of CFG.padAudit) {
        const d = plaats(nm); if (!d) { out.padAudit.push({ naar: nm, fout: 'onbekend' }); continue; }
        const r = RT.planDriveRoute(w, { x: d.x, y: d.y, name: d.name }, { x: van.x, y: van.y, inVehicle: null });
        const pts = (r.pts || []).filter((q, i, a2) => i === 0 || Math.hypot(q[0] - a2[i - 1][0], q[1] - a2[i - 1][1]) > 0.5);
        if (r.noRoute || pts.length < 2) { out.padAudit.push({ naar: nm, noRoute: true }); continue; }
        const oud = CD.smoothPath(pts, 1), nieuw = RR.ritRoute(pts, { start: { x: van.x, y: van.y }, doel: d, binnen });
        out.padAudit.push({ naar: nm, lengteM: Math.round(oud.len), oudSchendingen: RR.schendingen(oud, binnen), nieuwSchendingen: nieuw.schendingen, mix: nieuw.mix, beginBinnen: nieuw.begin, eindBinnen: nieuw.eind, bijgesneden: nieuw.bijgesneden });
      }
    } catch (e) { out.padAuditFout = String(e && e.stack || e).slice(0, 300); }
  }
  const opts = RK.reisOptiesVoor(w, { x: dest.x, y: dest.y, name: dest.name });
  const o = opts.find((x) => x.id === soort);
  rep.optie = o ? { eta: o.eta, etaS: o.etaS, prijs: o.price, lengte: Math.round(o.length), legs: (o.legs || []).map((l) => l.kind) } : null;
  if (!o) { rep.fout = 'geen optie ' + soort; return; }
  const klok0 = w.clock, geld0 = w.money;
  let uitkomst = null;
  const t0 = performance.now();
  RR.startMeerijden(w, o, { x: dest.x, y: dest.y, name: dest.name }).then((r) => { uitkomst = r; });
  const volgende = [...MOMENTEN];
  opname = [];
  rep.samples = [];
  let echt = false, oud = false;
  while (!uitkomst && (performance.now() - t0) / 1000 < (CFG.max || 70)) {
    const s = (performance.now() - t0) / 1000;
    const zwart = document.querySelector('.rr3-zwart');
    const co = w.cameraOverride;
    const rij = {
      camNaam: (document.querySelector('.rr3-camnaam') || {}).textContent || null,
      s: +s.toFixed(1), actief: R3.isRit3dActive(), cine: cine.isCinematicActive('reisrit'), oudeScene: !!document.querySelector('.reisrit'),
      meter: w.ritMeter, kader: w.ritKader || null,
      zwart: zwart ? +(+zwart.style.opacity || 0).toFixed(2) : null, tekst: (document.querySelector('.rr3-tekst') || {}).textContent || '',
      klok: w.dayNight ? w.dayNight.label : null, taxi: w.ritTaxi ? { x: Math.round(w.ritTaxi.x), y: Math.round(w.ritTaxi.y), z: +(w.ritTaxi.z || 0).toFixed(1), v: +(w.ritTaxi.speed || 0).toFixed(1) } : null,
      cam: co ? { x: Math.round(co.position.x), y: Math.round(co.position.y), z: +(co.position.z || 0).toFixed(1) } : null,
      speler: { x: Math.round(p.x), y: Math.round(p.y) }, health: Math.round(w.health),
      kijk: kijkVoorwerp(),
    };
    if (rij.actief || rij.cine) echt = true;
    if (rij.oudeScene) oud = true;
    rep.samples.push(rij);
    if (soort === 'taxi' && s >= 6.2 && !rep.kosten && w.ritTaxi) await kostenCabine(rep);
    if (volgende.length && s >= volgende[0]) { if (CFG.cams && volgende.length < MOMENTEN.length) for (const t of [document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'c', code: 'KeyC', bubbles: true })); } await sleep(400); console.log('[capture] tr-' + soort + '-' + String(volgende.shift()).replace('.', '_')); await sleep(900); } else await sleep(250);
  }
  rep.frames = frameStats(opname || []); opname = null;
  rep.echteRit = echt; rep.oudeSceneGezien = oud;
  rep.uitkomst = uitkomst || 'time-out';
  rep.duurS = +((performance.now() - t0) / 1000).toFixed(1);
  await sleep(1500);
  rep.landing = { x: Math.round(p.x), y: Math.round(p.y), afstandTotDoel: Math.round(Math.hypot(p.x - dest.x, p.y - dest.y)), gz: +(p.gz || 0).toFixed(2), op_perron: soort === 'trein' ? (p.gz || 0) > 0.5 : null };
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
