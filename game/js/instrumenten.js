// Instrumentenpaneel voor het vliegtuig (#444, #397): hoogte, snelheid, kompas, kunstmatige horizon, gas, kleppen en
// landingsgestel, wind en de toetsen. De pure kant (wind, kompas, de getallen) heeft tests (scripts/instrumenten_test.mjs);
// maakPaneel() zet het paneel in #hud en tekent met twee kleine canvassen. Altijd zomer: de wind is een bries (0 tot 7 m/s),
// nooit storm, en de lucht blijft zonnig met hooguit een beetje bewolking.

const TWEEPI = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// De wind op dit moment: { x, y, speed, dir } (x en y in m/s waarheen hij waait; y groeit naar het zuiden, zoals de wereld).
// De richting volgt de weerrichting van het spel (windAngle, 0 = naar het oosten); de sterkte golft langzaam, met een zomerse bries.
export function zomerWind(t = 0, windAngle = 0) {
  const g = Number.isFinite(t) ? t : 0;
  const speed = clamp(3.2 + 2.4 * Math.sin(g / 210) + 1.4 * Math.sin(g / 57 + 1.3), 0, 7);
  const dir = Number.isFinite(windAngle) ? windAngle : 0;
  return { x: Math.cos(dir) * speed, y: Math.sin(dir) * speed, speed, dir };
}

// Kompaskoers in graden (0 = noord, 90 = oost) uit een wereldhoek (0 = oost, y groeit naar het zuiden).
export function kompasGraden(heading) {
  const d = (heading * 180 / Math.PI + 90) % 360;
  return Math.round(d < 0 ? d + 360 : d) % 360;
}
const LETTERS = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];
export const kompasLetters = (graden) => LETTERS[Math.round(((graden % 360) + 360) % 360 / 45) % 8];

// Waar de wind vandaan komt, als kompasrichting (de wind waait naar dir, dus komt hij uit de tegenovergestelde kant).
export const windUit = (wind) => (wind && wind.speed > 0.3 ? kompasLetters(kompasGraden(wind.dir + Math.PI)) : 'windstil');

// Alle getallen voor het paneel uit de staat van het vliegtuig (v.plane), de hoogte van de grond en de wind.
export function instrumentData(v, wind = null) {
  const p = v && v.plane;
  if (!p) return null;
  const graden = kompasGraden(p.heading);
  const agl = Math.max(0, p.z - (v.groundZ ?? 0));
  const tegen = wind ? -(wind.x * Math.cos(p.heading) + wind.y * Math.sin(p.heading)) : 0;
  return {
    speedKmh: Math.round(p.speed * 3.6),
    altM: Math.round(agl),
    vz: Math.round(p.vz * 10) / 10,
    graden, letters: kompasLetters(graden),
    pitch: p.pitch || 0, roll: p.roll || 0,
    throttle: Math.round((p.throttle || 0) * 100),
    flaps: p.flaps || 0,
    gear: p.gear !== false,
    onGround: !!p.onGround,
    stalled: !!p.stalled,
    windSpeed: wind ? Math.round(wind.speed * 10) / 10 : 0,
    windUit: windUit(wind),
    tegenwind: Math.round(tegen * 10) / 10,
  };
}

// De toetsen en knoppen, voor de balk onderin en voor de uitleg bij het instappen.
export const BEDIENING = 'W en S gas · A en D rollen · Spatie neus omhoog · Ctrl neus omlaag · Shift remmen · K kleppen · G landingsgestel';
export const BEDIENING_PAD = 'Linkerstick rollen en gas · A of RT omhoog · B of LT omlaag · LB kleppen · X landingsgestel';
export const UITLEG_INSTAPPEN = 'Gas met W, bij 30 m/s optrekken met Spatie. Kleppen (K) helpen bij start en landing. Haal het landingsgestel in met G en zet het weer uit voor je landt. Op de baan, met de wielen uit, landen is zacht; hard of te snel telt niet.';

// --- het paneel ------------------------------------------------------------------------------------------------------------
const CSS = `#hud .hud-instr{position:absolute;right:var(--hud-edge,46px);bottom:var(--hud-edge,46px);display:none;width:300px;padding:8px 12px 8px 12px;color:#f0ede4;text-shadow:var(--hud-shadow);background:linear-gradient(90deg,rgba(12,20,14,.88),rgba(23,48,31,.62) 85%,rgba(23,48,31,.15));border-left:3px solid #3fc97a}
body.plane-flying #hud .hud-instr{display:block}
body.plane-flying #hud .hud-speedo{display:none}
#hud .hud-instr small{display:block;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#3fc97a}
#hud .hud-instr .hi-top{display:flex;gap:10px;align-items:center;margin-top:4px}
#hud .hud-instr canvas{width:96px;height:96px;flex:none}
#hud .hud-instr .hi-num{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:2px 10px}
#hud .hud-instr .hi-num b{display:block;font-weight:normal;font-size:24px;line-height:26px;letter-spacing:1px}
#hud .hud-instr .hi-num span{display:block;font-size:12px;letter-spacing:1px;color:rgba(240,237,228,.7)}
#hud .hud-instr .hi-row{display:flex;gap:12px;align-items:center;margin-top:6px;font-size:13px}
#hud .hud-instr .hi-bar{flex:1;height:8px;background:rgba(255,255,255,.18)}
#hud .hud-instr .hi-bar i{display:block;height:100%;background:#3fc97a}
#hud .hud-instr .hi-lamp{padding:1px 8px;border:1px solid rgba(240,237,228,.4);font-size:12px;letter-spacing:1px}
#hud .hud-instr .hi-lamp.on{background:#2f8f58;border-color:#3fc97a}
#hud .hud-instr .hi-lamp.warn{background:#a8431f;border-color:#ff8a5c}
#hud .hud-instr .hi-st{margin-top:5px;font-size:14px;min-height:18px}
#hud .hud-instr .hi-keys{margin-top:4px;font-size:12px;line-height:15px;color:rgba(240,237,228,.62)}`;

function tekenHorizon(ctx, d) {
  const S = 96, c = S / 2, r = c - 3;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath(); ctx.arc(c, c, r, 0, TWEEPI); ctx.clip();
  ctx.translate(c, c);
  ctx.rotate(-d.roll);
  const off = clamp(d.pitch * 90, -r, r);   // neus omhoog: de horizon zakt
  ctx.fillStyle = '#4d92c9'; ctx.fillRect(-S, -S + off, S * 2, S);
  ctx.fillStyle = '#6b8a47'; ctx.fillRect(-S, off, S * 2, S);
  ctx.strokeStyle = '#f4f1e6'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-S, off); ctx.lineTo(S, off); ctx.stroke();
  ctx.lineWidth = 1;
  for (const k of [-2, -1, 1, 2]) { const y = off + k * 14; ctx.beginPath(); ctx.moveTo(-10 - (Math.abs(k) === 2 ? 4 : 0), y); ctx.lineTo(10 + (Math.abs(k) === 2 ? 4 : 0), y); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = '#f4f1e6'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(c, c, r, 0, TWEEPI); ctx.stroke();
  ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(c - 26, c); ctx.lineTo(c - 8, c); ctx.lineTo(c, c + 6); ctx.lineTo(c + 8, c); ctx.lineTo(c + 26, c); ctx.stroke();
}

function tekenKompas(ctx, d) {
  const S = 96, c = S / 2, r = c - 4;
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(8,16,12,.7)'; ctx.beginPath(); ctx.arc(c, c, r, 0, TWEEPI); ctx.fill();
  ctx.save(); ctx.translate(c, c); ctx.rotate(-d.graden * Math.PI / 180);
  ctx.strokeStyle = '#f0ede4'; ctx.fillStyle = '#f0ede4'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let a = 0; a < 360; a += 30) {
    ctx.save(); ctx.rotate(a * Math.PI / 180);
    ctx.lineWidth = a % 90 === 0 ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(0, -r + 1); ctx.lineTo(0, -r + (a % 90 === 0 ? 9 : 5)); ctx.stroke();
    if (a % 90 === 0) { ctx.fillStyle = a === 0 ? '#ff8a5c' : '#f0ede4'; ctx.fillText(['N', 'O', 'Z', 'W'][a / 90], 0, -r + 20); }
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = '#ffc21a'; ctx.beginPath(); ctx.moveTo(c, 6); ctx.lineTo(c - 5, 0); ctx.lineTo(c + 5, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f0ede4'; ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(d.graden).padStart(3, '0'), c, c);
}

// Het paneel in #hud zetten; geeft { el, zet(data, status), weg() } of null zonder document.
export function maakPaneel() {
  if (typeof document === 'undefined') return null;
  const root = document.getElementById('hud');
  if (!root) return null;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const el = document.createElement('div');
  el.className = 'hud-instr';
  el.innerHTML = '<small data-k="naam">Kist Kees</small>'
    + '<div class="hi-top"><canvas width="96" height="96" data-k="hor"></canvas><canvas width="96" height="96" data-k="kom"></canvas>'
    + '<div class="hi-num"><div><b data-k="speed">0</b><span>km/u</span></div><div><b data-k="alt">0</b><span>m hoogte</span></div><div><b data-k="vz">0</b><span>m/s stijgen</span></div><div><b data-k="wind">0</b><span data-k="windtxt">wind</span></div></div></div>'
    + '<div class="hi-row"><span>Gas</span><div class="hi-bar"><i data-k="thr"></i></div><span data-k="thrn">0%</span></div>'
    + '<div class="hi-row"><span class="hi-lamp" data-k="flaps">Kleppen 0</span><span class="hi-lamp" data-k="gear">Gestel uit</span></div>'
    + '<div class="hi-st" data-k="st"></div>'
    + `<div class="hi-keys">${BEDIENING}</div>`;
  root.appendChild(el);
  const q = (k) => el.querySelector(`[data-k="${k}"]`);
  const hor = q('hor').getContext('2d'), kom = q('kom').getContext('2d');
  const last = {};
  const set = (k, txt) => { if (last[k] !== txt) { last[k] = txt; q(k).textContent = txt; } };
  return {
    el,
    zet(d, status, naam) {
      if (!d) return;
      if (naam) set('naam', naam);
      set('speed', String(d.speedKmh)); set('alt', String(d.altM));
      set('vz', (d.vz > 0 ? '+' : '') + String(d.vz).replace('.', ','));
      set('wind', String(d.windSpeed).replace('.', ',')); set('windtxt', 'wind uit ' + d.windUit);
      q('thr').style.width = d.throttle + '%'; set('thrn', d.throttle + '%');
      set('flaps', 'Kleppen ' + d.flaps); q('flaps').classList.toggle('on', d.flaps > 0);
      set('gear', d.gear ? 'Gestel uit' : 'Gestel in'); q('gear').classList.toggle('on', d.gear); q('gear').classList.toggle('warn', !d.gear && d.altM < 60 && !d.onGround);
      set('st', status || '');
      tekenHorizon(hor, d); tekenKompas(kom, d);
    },
  };
}
