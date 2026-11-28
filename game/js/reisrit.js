import { hoofdspeler } from './players.js';
// De reisscène bij meerijden (#97): een korte, overslaanbare rit in plaats van een
// leeg wachtscherm. Dunne DOM-laag; de opbouw, de tijd en het skippen met spatie
// zitten in meerijden.js. Na de scène staat de speler op de bestemming (de interne
// verplaatsing, zoals een respawn) en toont main.js het laadscherm voor de sprong.
import { zachtePauze, klokSprongMag, meerSpelers } from './coopgroep.js';
import { ritPlan, startRit, stepRit, aankomst, aankomstNaRit, skipHint, ondertitel, voortgang, shotAt, SKIP_KEY, landingsplek, LANDING_DRIFT_M, BOAT_DRIFT_M } from './meerijden.js';
import { padButtonIndex, playerPad } from './glyphs.js';
import { treinReis } from './trainride.js';
import { start3dRit } from './reisrit3d.js';
import { perronZAt } from './perrons.js';
import { noteOvGebruikt } from './ovhintlive.js';
import { setLoadHold } from './loadlogic.js';

let active = null;

export const isRitActive = () => !!active;

function build(taxi = false, label = '', trein = false) {
  const el = document.createElement('div');
  el.className = 'reisrit' + (taxi ? ' reisrit-taxi' : '') + (trein ? ' reisrit-trein' : '');
  el.style.cssText = 'position:fixed;inset:0;z-index:9000;background:var(--ds-c-ink-bord);color:var(--ds-c-ink-inkt);font:20px var(--ds-font-zeef-tekst);display:grid;grid-template-rows:12% 1fr 12%;pointer-events:none';
  // #926: de treinreis is een echte scène: een trein op het spoor, het perron
  // met zijn bord en de polder die voorbijschuift. Het canvas ligt onder de
  // tekst; de rest van de laag (voortgang, skip) blijft hetzelfde.
  const treinLayer = trein
    ? '<canvas class="rr-trein" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;display:block"></canvas>'
    : '';
  // #882: de taxi is in beeld: een weg met een rijdende taxi, het dakbord en de
  // meter. De rest van de scène blijft dezelfde dunne, overslaanbare laag.
  const taxiLayer = taxi
    ? '<div class="rr-taxi" style="--p:0;position:relative;height:120px;margin:20px auto 0;width:min(520px,80vw)">'
      + '<div style="position:absolute;left:0;right:0;bottom:18px;height:3px;background:var(--ds-c-ink-bord)"></div>'
      + '<div class="rr-cab" style="position:absolute;bottom:20px;left:6%;width:88px;height:46px">'
      + '<div style="position:absolute;left:6px;right:6px;top:14px;height:26px;background:var(--ds-c-ink-geel);border-radius:5px 8px 3px 3px"></div>'
      + '<div style="position:absolute;left:22px;right:16px;top:2px;height:16px;background:var(--ds-c-ink-geel);border-radius:6px 8px 0 0"></div>'
      + '<div style="position:absolute;left:28px;right:22px;top:5px;height:10px;background:var(--ds-c-ink-bord)"></div>'
      + '<div style="position:absolute;left:20px;top:-4px;width:34px;height:8px;background:var(--ds-c-creme);border-radius:2px;color:var(--ds-c-ink-bord);font:bold 7px Arial,sans-serif;text-align:center;line-height:8px">TAXI</div>'
      + '<div style="position:absolute;left:14px;bottom:-5px;width:16px;height:16px;border-radius:50%;background:var(--ds-c-ink-bord);border:2px solid var(--ds-c-creme)"></div>'
      + '<div style="position:absolute;right:14px;bottom:-5px;width:16px;height:16px;border-radius:50%;background:var(--ds-c-ink-bord);border:2px solid var(--ds-c-creme)"></div>'
      + '</div></div>'
    : '';
  el.innerHTML = treinLayer + '<div></div><div class="rr-mid" style="display:grid;place-items:center;text-align:center;padding:0 8%;position:relative"><div class="rr-plaat" style="background:var(--ds-c-ink-papier);padding:14px 26px 18px;border:var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt);border-radius:8px;box-shadow:var(--ds-schaduw-hard)"><div class="rr-lijn" style="font:800 16px var(--ds-font-zeef-kop);letter-spacing:0.12em;color:var(--ds-c-ink-bord)"></div><div class="rr-tekst" style="font:800 34px var(--ds-font-zeef-kop);margin-top:10px"></div><div class="rr-balk" style="margin:22px auto 0;width:280px;height:14px;background:var(--ds-c-ink-papier);border:var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt);box-sizing:border-box;border-radius:4px;overflow:hidden"><div class="rr-vul" style="height:100%;width:0;background:var(--ds-c-ink-geel)"></div></div>' + taxiLayer + '</div></div>' +
    '<div style="display:flex;justify-content:center;align-items:center"><span class="rr-hint" style="display:none;font:15px var(--ds-font-zeef-tekst);background:var(--ds-c-ink-papier);color:var(--ds-c-ink-inkt);padding:5px 12px;border:var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt);border-radius:8px;box-shadow:var(--ds-schaduw-hard-klein)">{SPACE}overslaan (of tik op het scherm)</span></div>';
  // de eerste frame is nooit leeg: de scène vult zichzelf meteen met de rit
  el.querySelector('.rr-lijn').textContent = String(label || '').toUpperCase();
  el.querySelector('.rr-tekst').textContent = taxi ? 'Instappen' : '';
  return el;
}

// --- de treinreis tekenen (#926) ------------------------------------------------
// Alles wat je ziet is met de hand op een canvas gezet: geen modellen, geen
// textures, zodat de scène ook op een zwakke kaart meteen loopt. De stand komt
// uit trainride.js (puur); hier staan alleen de vormen en de kleuren van de
// low-poly-stijl (DESIGN_SYSTEM.md): polder, spoor, perron en een stoptrein.
const T_GEEL = '#e8c93a', T_BLAUW = '#2d6a86', T_CREAM = '#f0ede4';
const T_GROEN = ['#a6e04f', '#5a8445', '#55733f', '#34562c'];
const T_LUCHT = ['#bee1f5', '#e8eae8', '#f5f0e6'];

function rrPath(g, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + q, y);
  g.arcTo(x + w, y, x + w, y + h, q);
  g.arcTo(x + w, y + h, x, y + h, q);
  g.arcTo(x, y + h, x, y, q);
  g.arcTo(x, y, x + w, y, q);
  g.closePath();
}
function rrFill(g, x, y, w, h, r, kleur) { g.fillStyle = kleur; rrPath(g, x, y, w, h, r); g.fill(); }

function wolk(g, x, y, s) {
  g.fillStyle = 'rgba(255,255,255,.82)';
  for (const [dx, dy, r] of [[0, 0, 18], [18, -6, 22], [40, 2, 16], [24, 8, 18]]) {
    g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill();
  }
}

// Een stipje kerk of molen aan de horizon, zodat het landschap Groningen blijft.
function silhouet(g, x, y, soort, s, kleur) {
  g.fillStyle = kleur;
  if (soort === 'kerk') {
    g.fillRect(x - 9 * s, y - 26 * s, 18 * s, 26 * s);
    g.beginPath(); g.moveTo(x - 11 * s, y - 26 * s); g.lineTo(x, y - 40 * s); g.lineTo(x + 11 * s, y - 26 * s); g.closePath(); g.fill();
    g.fillRect(x - 1.5 * s, y - 46 * s, 3 * s, 8 * s);
  } else {
    g.beginPath(); g.moveTo(x - 2 * s, y); g.lineTo(x - 2 * s, y - 26 * s); g.lineTo(x + 2 * s, y - 26 * s); g.lineTo(x + 2 * s, y); g.closePath(); g.fill();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.5;
      g.save(); g.translate(x, y - 26 * s); g.rotate(a);
      g.fillRect(-1.2 * s, -1.2 * s, 20 * s, 2.4 * s);
      g.restore();
    }
  }
}

function tekenPerron(g, x, y, w2, h2, bord, links) {
  // Een perron met een abri en een bord: het vertrek- of aankomststation.
  const px = links ? 0 : x - w2, py = y;
  g.fillStyle = '#a9a69b';
  g.fillRect(px, py, w2, h2);
  g.fillStyle = '#8a8474';
  g.fillRect(px, py, w2, 3);
  // abri
  const sx = links ? w2 * 0.34 : px + w2 * 0.5;
  g.fillStyle = '#6d6f66';
  g.fillRect(sx - 34, py - 54, 68, 7);
  g.fillRect(sx - 30, py - 50, 4, 50);
  g.fillRect(sx + 26, py - 50, 4, 50);
  g.fillStyle = 'rgba(207,214,220,.55)';
  g.fillRect(sx - 26, py - 46, 52, 40);
  // bord op een paal
  const bx = links ? w2 * 0.7 : px + w2 * 0.16;
  g.fillStyle = '#333a36';
  g.fillRect(bx, py - 46, 3, 46);
  rrFill(g, bx - 34, py - 74, 140, 30, 4, T_BLAUW);
  g.fillStyle = T_CREAM;
  g.font = "bold 15px 'Arial Narrow', Arial, sans-serif";
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(bord || 'Station').slice(0, 17).toUpperCase(), bx + 36, py - 59);
}

export function drawTrein(canvas, plan, rit) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const s = treinReis(plan, rit.t);
  const w = canvas.clientWidth || canvas.width || 1280;
  const h = canvas.clientHeight || canvas.height || 720;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const bw = Math.max(1, Math.round(w * dpr)), bh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  const g = canvas.getContext('2d');
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const horizon = h * 0.45, basis = h * 0.84;

  // lucht en zon
  const lucht = g.createLinearGradient(0, 0, 0, horizon);
  lucht.addColorStop(0, T_LUCHT[0]); lucht.addColorStop(0.55, T_LUCHT[1]); lucht.addColorStop(1, T_LUCHT[2]);
  g.fillStyle = lucht; g.fillRect(0, 0, w, horizon);
  const zon = 0.18 + s.p * 0.24;
  g.fillStyle = 'rgba(255,233,160,.95)';
  g.beginPath(); g.arc(w * zon, h * 0.13, Math.max(16, h * 0.032), 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 3; i++) {
    const cx = (((i * 0.37 + 0.08 - s.scroll * 0.018) % 1.2) + 1.2) % 1.2;
    wolk(g, cx * w, h * (0.09 + i * 0.055), Math.max(0.6, h / 900));
  }

  // de verte: velden, kerk en molen schuiven langzaam langs
  g.fillStyle = T_GROEN[2]; g.fillRect(0, horizon, w, h * 0.07);
  g.fillStyle = T_GROEN[1]; g.fillRect(0, horizon + h * 0.07, w, h * 0.08);
  const kerkX = (((0.55 - s.scroll * 0.07) % 1.4) + 1.4) % 1.4 * w;
  silhouet(g, kerkX, horizon + 2, 'kerk', Math.max(0.7, h / 900), '#34562c');
  const molenX = (((0.16 - s.scroll * 0.1) % 1.5) + 1.5) % 1.5 * w;
  silhouet(g, molenX, horizon + h * 0.03, 'molen', Math.max(0.7, h / 900), '#2f4f33');

  // sloten met riet en een heg
  g.fillStyle = '#4a8fae';
  g.fillRect(0, horizon + h * 0.13, w, h * 0.035);
  g.fillStyle = 'rgba(52,86,44,.55)';
  const rietOff = (s.scroll * 0.09 % 0.04) * w;
  for (let x = -rietOff; x < w; x += 26) {
    g.fillRect(x, horizon + h * 0.11, 2, h * 0.02);
    g.fillRect(x + 6, horizon + h * 0.115, 2, h * 0.015);
  }
  // weiland met koeien
  g.fillStyle = T_GROEN[0]; g.fillRect(0, horizon + h * 0.165, w, h * 0.18);
  g.fillStyle = T_GROEN[3];
  g.fillRect(0, horizon + h * 0.3, w, h * 0.06);
  for (let i = 0; i < 2; i++) {
    const kx = ((i * 0.53 + 0.2 - s.scroll * 0.13) % 1.3 + 1.3) % 1.3 * w;
    g.fillStyle = i ? '#e8e4d8' : '#333a36';
    rrFill(g, kx, horizon + h * 0.23, 26, 13, 5, g.fillStyle);
    g.fillRect(kx + 3, horizon + h * 0.255, 3, 8); g.fillRect(kx + 19, horizon + h * 0.255, 3, 8);
  }
  // hekpalen langs het spoor
  g.fillStyle = '#8a8474';
  for (let x = -((s.scroll * 0.4) % 0.07) * w; x < w; x += Math.max(70, w * 0.07)) {
    g.fillRect(x, basis - h * 0.13, Math.max(3, w * 0.003), h * 0.085);
    g.fillRect(x - 4, basis - h * 0.1, Math.max(11, w * 0.009), 3);
  }

  // de baan: ballast, dwarsliggers en de twee spoorstaven
  g.fillStyle = '#8a8474'; g.fillRect(0, basis - 4, w, h - basis + 4);
  g.fillStyle = '#55524c';
  const sk = Math.max(18, w * 0.022);
  const sleepOff = (s.scroll * 0.34 % 1) * sk * 2;
  for (let x = -sleepOff; x < w + sk; x += sk * 2) g.fillRect(x, basis + 2, sk, h * 0.035);
  g.fillStyle = '#333a36';
  g.fillRect(0, basis + 5, w, Math.max(3, h * 0.006));
  g.fillRect(0, basis + h * 0.035, w, Math.max(3, h * 0.006));
  // het perron van vertrek of aankomst
  if (s.perron) {
    const pw = Math.min(w * 0.3, 420), ph = h * 0.115;
    tekenPerron(g, w * 0.5, basis - ph, pw, ph, s.bord, s.shot === 'perron');
  }

  // de trein, van opzij: twee rijtuigen, een neus, wielen en een stroomafnemer
  const tw = Math.min(w * 0.64, 980), th = Math.max(64, h * 0.16);
  const cx = w * s.trein;
  if (cx > -tw && cx < w + tw) {
    const x0 = cx - tw / 2, y0 = basis - th - h * 0.012;
    const car = tw * 0.48, gap = tw * 0.04;
    for (const [i, ox] of [[0, 0], [1, car + gap]]) {
      // bak
      rrFill(g, x0 + ox, y0, car, th, Math.max(4, th * 0.08), T_GEEL);
      // blauwe raamband met ramen
      rrFill(g, x0 + ox + car * 0.06, y0 + th * 0.2, car * 0.88, th * 0.3, 3, T_BLAUW);
      for (let k = 0; k < 5; k++) {
        rrFill(g, x0 + ox + car * (0.1 + k * 0.17), y0 + th * 0.24, car * 0.12, th * 0.2, 2, '#bee1f5');
      }
      // deuren en een onderband
      for (const dx of [0.02, 0.93]) rrFill(g, x0 + ox + car * dx, y0 + th * 0.16, car * 0.05, th * 0.62, 2, T_CREAM);
      rrFill(g, x0 + ox, y0 + th * 0.78, car, th * 0.12, 0, T_BLAUW);
      // dak
      rrFill(g, x0 + ox + car * 0.02, y0 - th * 0.04, car * 0.96, th * 0.07, 3, '#cfd6dc');
      // draaistellen met wielen
      for (const wx of [0.2, 0.8]) {
        g.fillStyle = '#1b1d22';
        g.beginPath(); g.arc(x0 + ox + car * wx, basis + h * 0.005, th * 0.13, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#8f9095';
        g.beginPath(); g.arc(x0 + ox + car * wx, basis + h * 0.005, th * 0.055, 0, Math.PI * 2); g.fill();
      }
    }
    // neus links met cabine en koplamp
    g.fillStyle = T_GEEL;
    g.beginPath();
    g.moveTo(x0 + 2, y0 + th * 0.12);
    g.lineTo(x0 - tw * 0.055, y0 + th * 0.5);
    g.lineTo(x0 - tw * 0.045, y0 + th);
    g.lineTo(x0 + 2, y0 + th);
    g.closePath(); g.fill();
    rrFill(g, x0 - tw * 0.04, y0 + th * 0.18, tw * 0.04, th * 0.26, 2, '#1f2a3a');
    rrFill(g, x0 - tw * 0.045, y0 + th * 0.72, tw * 0.02, th * 0.09, 2, '#ffe9a0');
    // stroomafnemer
    g.strokeStyle = '#333a36'; g.lineWidth = Math.max(2, th * 0.03);
    g.beginPath();
    g.moveTo(x0 + car * 0.55, y0 - th * 0.04);
    g.lineTo(x0 + car * 0.6, y0 - th * 0.28);
    g.lineTo(x0 + car * 0.72, y0 - th * 0.28);
    g.lineTo(x0 + car * 0.66, y0 - th * 0.04);
    g.stroke();
    // de naam van de trein, klein op de bak
    g.fillStyle = T_BLAUW;
    g.font = `bold ${Math.max(9, th * 0.11)}px Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('STOPTREIN', x0 + car * 0.5, y0 + th * 0.92);
  }

  // onderin een zachte donkere band, zodat de tekst altijd leesbaar is
  const onder = g.createLinearGradient(0, h * 0.72, 0, h);
  onder.addColorStop(0, 'rgba(12,20,14,0)'); onder.addColorStop(1, 'rgba(12,20,14,.72)');
  g.fillStyle = onder; g.fillRect(0, h * 0.72, w, h * 0.28);
}

// De landing na een rit (de echte of de oude scène): betalen, de klok, en de speler op de landingsplek bij het doel.
// perron: de plek op het perron van het aankomststation (reisrit3d.js, treinrit): { x, y, z, rail: [x, y] }; dan staat de speler daar.
function landNaRit(world, rit, a, perron = null) {
  world.money -= a.prijs;
  if (typeof world.clock === 'number' && klokSprongMag(world)) world.clock = (world.clock + a.klokMinuten / 60) % 24; // met meer spelers springt de klok niet: de tijd is van iedereen (#452)
  // #932: de bestemming is het doel, niet een weg honderden meters verderop. Eerst de
  // open grond bij het doel zelf (openSpotNear), dan pas een straat binnen de korte
  // landingsmarge; de oude 400 m bracht een taxi soms in een ander buitengebied.
  const boot = rit.plan.mode === 'boot';
  const kandidaten = [];
  if (world.map.openSpotNear) {
    try { const o = world.map.openSpotNear(a.x, a.y); if (o) kandidaten.push(o); } catch (e) { /* kaart zonder open plekken */ }
  }
  if (world.map.findOpenSpawn) {
    try { const s = world.map.findOpenSpawn(a.x, a.y, boot ? BOAT_DRIFT_M : LANDING_DRIFT_M); if (s) kandidaten.push(s); } catch (e) { /* idem */ }
  }
  const spot = perron ? { x: perron.x, y: perron.y } : landingsplek(a, kandidaten, boot ? BOAT_DRIFT_M : LANDING_DRIFT_M) || { x: a.x, y: a.y };
  const p = hoofdspeler(world);
  if (p.inVehicle) { p.inVehicle.speed = 0; p.inVehicle.x = spot.x; p.inVehicle.y = spot.y; }
  p.x = spot.x; p.y = spot.y;
  if (perron) {
    // #926: je stapt uit op het perron (de vloer van perrons.js), met je rug naar de trein
    const P = world.map && world.map.elev && world.map.elev.perrons, z = P ? perronZAt(P, spot.x, spot.y) : null;
    p.z = 0; p.vz = 0; p.vx = 0; p.vy = 0;
    p.gz = Number.isFinite(z) ? z : Number.isFinite(perron.z) ? perron.z : 0;
    if (perron.rail) p.angle = Math.atan2(spot.y - perron.rail[1], spot.x - perron.rail[0]);
  }
  const c = world.companion;
  if (c && c.state !== 'dead' && !meerSpelers(world)) { c.x = spot.x + 1.5; c.y = spot.y; c.vx = 0; c.vy = 0; }
  world.addMessage(a.bericht, 4, { kind: 'reis' });
}

// optie: een optie uit ovopties.reisOpties, dest: { x, y, name }. Resolved met
// { aangekomen, skipped } nadat de speler is verplaatst.
// #882 en #926: een taxi of trein rijdt echt door de wereld (reisrit3d.js); lukt dat niet (geen route, geen
// spoor, een fout) dan speelt de oude korte scène hieronder, nooit een zwart scherm.
export function startMeerijden(world, optie, dest) {
  if (active || typeof document === 'undefined') return Promise.resolve({ aangekomen: false });
  const plan = ritPlan(optie);
  const rit = startRit(plan);
  if (aankomst(rit, dest, world.money) === null) {
    world.addMessage('Te weinig geld voor dit kaartje', 2.5);
    return Promise.resolve({ aangekomen: false });
  }
  if (plan.mode === 'taxi' || plan.mode === 'trein' || plan.mode === 'bus') noteOvGebruikt(); // de lichte hint (#1091) zwijgt voor wie het OV of de taxi al pakt
  if (plan.mode === 'taxi' || plan.mode === 'trein') {
    const laadTeller = world.loadCount || 0;
    let echt = null;
    try { echt = start3dRit(world, optie, plan, dest); } catch (e) { console.warn('reisrit: echte rit', e); }
    if (echt) {
      active = rit;
      return Promise.resolve(echt).then((res) => {
        active = null;
        // een save laden tijdens de rit (applySave stopt de film) mag de geladen wereld niet nog naar de bestemming zetten en laten betalen
        if ((world.loadCount || 0) !== laadTeller) return { aangekomen: false };
        if (res.terugval) return oudeScene(world, optie, dest, plan);
        rit.skipped = !!res.skipped; rit.done = true;
        // de speler reed mee en staat op de route: hij landt altijd op de bestemming en betaalt wat hij nog heeft (review 20-11 #1)
        const a = aankomstNaRit(rit, dest, world.money);
        landNaRit(world, rit, a, res.landing || null);
        return { aangekomen: true, skipped: rit.skipped };
      }, (e) => {
        // een mislukte echte rit hield `active` voor altijd vast: dan speelt de korte scène, nooit een vastloper
        console.warn('reisrit: echte rit mislukt', e);
        active = null;
        if ((world.loadCount || 0) !== laadTeller) return { aangekomen: false };
        return oudeScene(world, optie, dest, plan);
      });
    }
  }
  return oudeScene(world, optie, dest, plan);
}

// De oude korte scène (DOM-laag): terugval voor de echte rit, en de scène van bus en boot.
function oudeScene(world, optie, dest, plan) {
  const rit = startRit(plan);
  const el = build(plan.mode === 'taxi', optie.label, plan.mode === 'trein');
  document.body.appendChild(el);
  const q = (s) => el.querySelector(s);
  // zoals het laadscherm: de wereld staat stil tijdens de scène
  const wasPaused = !!world.uiPaused;
  const laadTeller = world.loadCount || 0;
  world.uiPaused = true;
  setLoadHold(world, 'reisrit', true); // phone.js refreshPause keeps uiPaused on while this hold stands
  zachtePauze(world, 'reisrit', true); // met meer spelers loopt de wereld door; jij reist alleen zelf (#452)
  let skipKey = false, keyHeld = false;
  // #1341: alleen een verse druk slaat over; een vastgehouden toets (repeat, of herhaling zonder keyup) doet niets
  const down = (e) => { if (e.key === SKIP_KEY) { if (!e.repeat && !keyHeld) tap(); keyHeld = true; e.preventDefault(); e.stopPropagation(); } };
  const up = (e) => { if (e.key === SKIP_KEY) { skipKey = false; keyHeld = false; e.preventDefault(); e.stopPropagation(); } };
  // touch and gamepad A skip too (a phone has no space bar)
  const tap = () => { skipKey = true; setTimeout(() => { skipKey = false; }, 120); };
  el.style.pointerEvents = 'auto';
  el.addEventListener('pointerdown', tap);
  document.addEventListener('keydown', down, true);
  document.addEventListener('keyup', up, true);
  return new Promise((resolve) => {
    let last = performance.now();
    active = rit;
    const finish = () => {
      document.removeEventListener('keydown', down, true);
      document.removeEventListener('keyup', up, true);
      active = null;
      setLoadHold(world, 'reisrit', false);
      world.uiPaused = wasPaused;
      zachtePauze(world, 'reisrit', false);
      const a = aankomst(rit, dest, world.money);
      el.remove();
      // een save laden tijdens de scène: de geladen wereld wordt niet nog naar de bestemming gezet
      if ((world.loadCount || 0) !== laadTeller) return resolve({ aangekomen: false });
      if (!a) { world.addMessage('Te weinig geld voor dit kaartje', 2.5); return resolve({ aangekomen: false }); }
      landNaRit(world, rit, a);
      resolve({ aangekomen: true, skipped: rit.skipped });
    };
    const tick = (now) => {
      try { stap(now); } catch (e) { console.warn('reisrit: scène', e); rit.done = true; finish(); }
    };
    const stap = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let padA = false;
      // de A-knop van de pad van speler 1, met dezelfde herbinding en wissel als het spel (#151)
      const pad = playerPad();
      const b = pad && pad.buttons[padButtonIndex('a')];
      padA = !!(b && b.pressed);
      stepRit(rit, dt, { skip: skipKey || padA });
      q('.rr-lijn').textContent = (plan.lines[0] || optie.label).toUpperCase();
      q('.rr-tekst').textContent = ondertitel(rit);
      q('.rr-vul').style.width = `${Math.round(voortgang(rit) * 100)}%`;
      const treinCanvas = q('.rr-trein');
      if (treinCanvas) drawTrein(treinCanvas, plan, rit);
      const cab = q('.rr-cab');
      if (cab) cab.style.left = `${6 + voortgang(rit) * 66}%`;
      q('.rr-hint').style.display = skipHint(rit) ? 'inline' : 'none';
      el.dataset.shot = shotAt(plan, rit.t).name;
      if (rit.done) finish();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

