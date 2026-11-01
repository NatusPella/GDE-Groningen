// Samen spelen (#95): wat de host op het scherm heeft (een filmpje, de regel die iemand zegt, een keuze in een
// gesprek) en hoe een gast dat meekijkt. De host leest zijn eigen scherm (readHostScene), coopnet.js stuurt de
// verandering naar de gasten (coopworld.js sceneBericht), en een gast tekent het als een kleine laag met zwarte
// balken en tekst (updateHostScene). Een gast drukt mee op een keuze of timing (#525), maar slaat niets over en
// beslist niets: de gastheer leest de druk als zijn eigen antwoord. Alleen DOM.
import { sceneLeeg, filmpjeTekst, pauzeTekst, paneelTekst } from './coopworld.js';
import { openerNaam } from './coopplayers.js';
// Leaf-module (#108): alleen een leesvraag over de lopende opdracht, geen cyclus.
import { activeStage } from './missionquery.js';

// cinematics.js en storytalk.js zitten in de grote importcyclus: hier lui geladen (import() wordt niet gevolgd door
// import_cycles_test), zodat dit paneel en samenpanel.js buiten de cyclus blijven. Beide zijn al geladen als het spel draait.
let isCinematicActive = () => false, talkState = () => ({ cur: null });
import('./cinematics.js').then((m) => { isCinematicActive = m.isCinematicActive; }).catch(() => {});
import('./storytalk.js').then((m) => { talkState = m.talkState; }).catch(() => {});

const text = (el) => (el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : '');

// De host: wat staat er nu op het scherm? { filmpje, regel: {wie, tekst}|null, keuze: {tekst, opties}|null }
export function readHostScene(world) {
  const cine = document.getElementById('cine');
  const filmpje = !!(world && world.cameraOverride) || isCinematicActive();
  let regel = null;
  if (cine && cine.classList.contains('has-sub')) regel = { wie: text(cine.querySelector('.cine-speaker')), tekst: text(cine.querySelector('.cine-line')) };
  else {
    const ts = talkState();
    if (ts.cur && ts.cur.line) regel = { wie: text(document.querySelector('#story-talk .st-speaker')), tekst: String(ts.cur.line) };
  }
  let keuze = null, meter = null, kicker = '';
  const panel = document.querySelector('#hud .cw-panel:not([hidden])');
  if (panel) {
    keuze = { tekst: text(panel.querySelector('.cw-text')), opties: [...panel.querySelectorAll('.cw-opt')].map((o) => text(o.querySelector('span:last-child'))) };
    meter = leesMeter(panel);
    kicker = text(panel.querySelector('small'));
  }
  // de host in zijn pauzemenu, kaart of winkel: zijn wereld staat stil (het wachtscherm bij wegvallen is geen pauze van de host)
  const pauze = !!(world && world.paused && !world.uiPaused && !world.coopHold);
  return { filmpje, pauze, regel, keuze, paneel: paneelStand(world, keuze, meter, kicker) };
}

// De balk van een timing zoals de gastheer hem ziet (choicepanel.js zet de naald op `left: v%` en de zone op
// `left: from%` met `width: (to - from)%`). Zonder balk drukt een gast blind (#525).
function leesMeter(panel) {
  const m = panel.querySelector('.cw-meter');
  if (!m || m.hidden) return null;
  const mark = m.querySelector('i'), zone = m.querySelector('b');
  const deel = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) / 100 : null);
  const v = mark ? deel(mark.style.left) : null;
  if (v == null) return null;
  const from = zone && zone.style.display !== 'none' ? deel(zone.style.left) : null;
  const wid = zone && zone.style.display !== 'none' ? deel(zone.style.width) : null;
  return { v: Math.max(0, Math.min(1, v)), from: from ?? 0, to: from != null && wid != null ? from + wid : null };
}

// Welke stap van de opdracht staat er op het paneel, en welke toetsen neemt die aan (#525)? Een gast
// ziet daaraan dat hij kan meedrukken; zonder paneel valt er niets te doen. De `timing`-stap toont de
// opties niet (hij heeft alleen een balk), dus die herkennen we aan zijn eigen paneel, niet aan de tekst.
function paneelStand(world, keuze, meter = null, kicker = '') {
  if (!world || world.coopRole !== 'host' || !activeStage) return null;
  let stap = null;
  try { stap = activeStage(); } catch (e) { return null; }
  if (!stap || (stap.kind !== 'choice' && stap.kind !== 'timing')) return null;
  const toetsen = stap.kind === 'choice'
    ? (keuze && keuze.opties ? keuze.opties.map((o, i) => String(i + 1)) : [])
    : [' ', 'e', 'f'];
  if (!toetsen.length) return null;
  // een timing zet zijn vraag niet in de optielijst maar in de tekst van het paneel: die gaat mee, met de
  // rondeteller ("Timing - 2 VAN 3"), zodat een gast weet waar hij op drukt.
  return stap.kind === 'timing'
    ? { stap: stap.kind, toetsen, meter, tekst: (keuze && keuze.tekst) || '', ronde: kicker }
    : { stap: stap.kind, toetsen };
}

// De gast: de laag met de scène van de host. Alleen de DOM aanraken als de inhoud verandert.
let el = null, last = '';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// De balk van de timing van de gastheer, op dezelfde plaats als bij de gastheer (#525): de gast ziet waar de
// streep staat en waar het groen is, dus hij kan op tijd drukken in plaats van te gokken.
const pct = (v) => `${Math.round(Math.max(0, Math.min(1, Number(v) || 0)) * 100)}%`;
function meterBalk(paneel) {
  const m = paneel && paneel.meter;
  if (!m) return '';
  const zone = m.to != null ? `<b style="position:absolute;top:0;bottom:0;left:${pct(m.from)};width:${pct(m.to - m.from)};background:rgba(63,201,122,0.55)"></b>` : '';
  return `<div style="position:relative;height:10px;margin:8px auto 0;width:min(420px,80%);background:rgba(240,237,228,0.16);border-radius:2px">${zone}<i style="position:absolute;top:0;bottom:0;width:3px;background:#f0ede4;left:${pct(m.v)}"></i></div>`;
}
export const hasHostScene = () => !!el;
export function updateHostScene(world) {
  // de gast speelt de scène van de gastheer zelf af (coopcut.js): dan geen laag eroverheen
  const sc = world && world.coopCutBezig == null && world.coopScene && !sceneLeeg(world.coopScene) ? world.coopScene : null;
  if (!sc) { if (el) { el.remove(); el = null; last = ''; } return; }
  const key = JSON.stringify(sc);
  if (el && key === last) return;
  last = key;
  if (!el) {
    el = document.createElement('div');
    el.id = 'coop-scene';
    el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;inset:0;z-index:7000;pointer-events:none;font-family:\'Arial Narrow\',Arial,sans-serif;color:#f0ede4;';
    document.body.appendChild(el);
  }
  const naam = openerNaam(world && world.coopRoster, true);
  const bar = 'position:absolute;left:0;right:0;background:#000;';
  const balken = sc.filmpje ? `<div style="${bar}top:0;height:11%"></div><div style="${bar}bottom:0;height:11%"></div>` : '';
  const eigenMenu = !!document.querySelector('#pause-menu.visible'); // de gast zit zelf in zijn pauzemenu: de regel zou over de kop liggen
  const pauze = ''; // de melding 'X heeft het spel op pauze' is op verzoek van de eigenaar weggehaald (24-10): de wereld loopt door of staat stil zonder melding;
  const kop = sc.filmpje ? `<div style="position:absolute;left:0;right:0;top:12.5%;text-align:center;font-size:22px;text-shadow:0 1px 3px #000">${esc(filmpjeTekst(naam))}</div>` : '';
  const regel = sc.regel ? `<div style="position:absolute;left:10%;right:10%;bottom:${sc.filmpje ? '13' : '16'}%;text-align:center;font-size:26px;line-height:1.3;text-shadow:0 1px 3px #000,0 0 2px #000"><b style="color:#3fc97a">${esc(sc.regel.wie)}</b>${sc.regel.wie ? ': ' : ''}${esc(sc.regel.tekst)}</div>` : '';
  const keuze = sc.keuze ? `<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:620px;padding:18px 24px;border-radius:8px;background:rgba(12,20,14,0.88);box-shadow:inset 0 0 0 1px rgba(240,237,228,0.24)"><div style="font-size:24px;line-height:1.3">${esc(sc.keuze.tekst)}</div><div style="margin-top:10px;font-size:20px;opacity:.85">${esc(naam)} kiest:</div><ul style="margin:6px 0 0;padding-left:22px;font-size:22px">${sc.keuze.opties.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : '';
  // de choice-stap toont zijn opties ook als tekstblok in het midden; dan staat er alleen de toetsregel bij (#525)
  const los = sc.keuze && sc.paneel && sc.paneel.stap === 'choice' ? '' : keuze;
  const balk = meterBalk(sc.paneel);
  const vraag = sc.paneel && sc.paneel.stap === 'timing' && (sc.paneel.ronde || sc.paneel.tekst)
    ? `<div style="font-size:17px;opacity:.85">${esc(sc.paneel.ronde)}</div><div style="font-size:22px;margin-top:2px">${esc(sc.paneel.tekst)}</div>`
    : '';
  const paneel = sc.paneel ? `<div style="position:absolute;left:0;right:0;bottom:${sc.filmpje ? '13' : (los ? '16' : '9')}%;text-align:center;font-size:19px;opacity:.9;text-shadow:0 1px 3px #000">${vraag}${esc(paneelTekst(sc.paneel))}${balk}</div>` : '';
  el.innerHTML = balken + kop + pauze + regel + los + paneel;
}
