// Samen spelen (#95): wat de host op het scherm heeft (een filmpje, de regel die iemand zegt, een keuze in een
// gesprek) en hoe een gast dat meekijkt. De host leest zijn eigen scherm (readHostScene), coopnet.js stuurt de
// verandering naar de gasten (coopworld.js sceneBericht), en een gast tekent het als een kleine laag met zwarte
// balken en tekst (updateHostScene). Een gast kiest niet en slaat niets over: de gastheer beslist. Alleen DOM.
import { sceneLeeg, filmpjeTekst, pauzeTekst } from './coopworld.js';
import { openerNaam } from './coopplayers.js';

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
  let keuze = null;
  const panel = document.querySelector('#hud .cw-panel:not([hidden])');
  if (panel) keuze = { tekst: text(panel.querySelector('.cw-text')), opties: [...panel.querySelectorAll('.cw-opt')].map((o) => text(o.querySelector('span:last-child'))) };
  // de host in zijn pauzemenu, kaart of winkel: zijn wereld staat stil (het wachtscherm bij wegvallen is geen pauze van de host)
  const pauze = !!(world && world.paused && !world.uiPaused && !world.coopHold);
  return { filmpje, pauze, regel, keuze };
}

// De gast: de laag met de scène van de host. Alleen de DOM aanraken als de inhoud verandert.
let el = null, last = '';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
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
  el.innerHTML = balken + kop + pauze + regel + keuze;
}
