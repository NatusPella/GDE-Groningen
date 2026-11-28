import { hoofdspeler } from './players.js';
// De bediening van de bus in het spel (#444): O deuren, K knielt, de halteknop-lamp en de prognose voor de volgende
// halte in het HUD-kaartje van busboard3d.js. De regels staan in busbestuur.js (met tests); dit bestand is de lijm
// met de wereld, de deuren van vehicledoors.js en het HUD. Meldt zich in main.js als kind.

import { ensureDoors, wantDoor, doorsFor } from './vehicledoors.js';
import { busCardState } from './busboard3d.js';
import { mountCockpitCss } from './cockpit.js';
import { roundDist } from './busboard.js';
import {
  makeBediening, toggleDeuren, toggleKneel, stepBediening, haltePrognose, vertragingTekst, waardering, tevredenWoord,
} from './busbestuur.js';

let lastBus = null;
let row = null;

function getRow() {
  if (row && row.el.isConnected) return row;
  if (typeof document === 'undefined') return null;
  const card = document.querySelector('#hud .hud-busnext');
  if (!card) return null;
  mountCockpitCss();
  if (!document.getElementById('busbed-style')) {
    const st = document.createElement('style');
    st.id = 'busbed-style';
    st.textContent = `#hud .hud-busbed{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:2px 12px;max-width:100%;margin-top:6px;font-size:max(13px,var(--hud-min, 13px));color:color-mix(in srgb, var(--ds-c-creme) 85%, transparent)}
#hud .hud-busbed>span{white-space:nowrap}
#hud .hud-busbed .bb-stop{padding:0 8px;border-radius:3px;background:color-mix(in srgb, var(--ds-c-rood-glas-vlak) 90%, transparent);color:color-mix(in srgb, var(--ds-c-creme) 45%, transparent);letter-spacing:2px;font-weight:bold}
#hud .hud-busbed .bb-stop.on{background:var(--mk-danger, #d93f3f);color:var(--ds-c-wit)}
#hud .hud-busbed .on:not(.bb-stop){color:var(--mk-mission, #e8c93a)}
#hud .hud-busbed .bb-tev{display:none;color:var(--ds-c-creme)}`;
    document.head.appendChild(st);
  }
  const el = document.createElement('div');
  el.className = 'hud-busbed';
  // #502: "Knielt" alleen zegt niet wat de knop doet. De uitleg staat in de hint van de bus (hintkit.js) en als
  // titel op de knop, zodat wie er met de muis op staat het ook leest; een extra regel in het kaartje kan niet,
  // want dan raakt het de doelregel erboven (busboard3d.js, 120 px).
  el.innerHTML = '<span class="bb-eta"></span><span class="bb-stop">STOP</span><span class="bb-deur"><span class="hud-key">O</span><i>Deuren open</i></span><span class="bb-kneel" title="Laat de bus zakken bij de halte"><span class="hud-key">K</span><i>Knielt</i></span><span class="bb-tev"></span>';
  card.appendChild(el);
  row = { el, eta: el.querySelector('.bb-eta'), stop: el.querySelector('.bb-stop'), deur: el.querySelector('.bb-deur'), kneel: el.querySelector('.bb-kneel'), tev: el.querySelector('.bb-tev') };
  return row;
}

// De deuren van de bus volgen de bediening (de schuifdeuren aan de stoepkant).
function applyDoors(v, b) {
  const st = ensureDoors(v);
  for (const d of doorsFor(v)) if (d.soort === 'schuif') wantDoor(st, d.id, b.doorWant, 0);
}

function release(v, w) {
  if (!v || !v.busBediend) return;
  const sj = w.sideJobActions; // de bus van de bijbaan blijft bediend zolang de dienst loopt
  if (sj && sj.active() && sj.vehicle() === v) return;
  const st = v.doors;
  if (st) for (const id of Object.keys(st.want)) st.want[id] = 0;
  delete v.busBediend;
}

function updateBusBestuur(dt, w) {
  const p = hoofdspeler(w);
  const pv = p && p.inVehicle;
  const bus = pv && pv.isBus && !pv.wrecked ? pv : null;
  if (lastBus && lastBus !== bus) release(lastBus, w);
  lastBus = bus;
  if (!bus) return;
  const input = w.input;
  if (input && !w.paused) {
    if (input.wasPressed('o')) {
      input.consume('o');
      const b = bus.busBediend || (bus.busBediend = makeBediening());
      const r = toggleDeuren(b, bus.speed);
      if (!r.ok) w.addMessage('Sta eerst stil voordat je de deuren opent.', 2, { kind: 'tip', key: 'bus-deur' });
    } else if (input.wasPressed('k')) {
      input.consume('k');
      const b = bus.busBediend || (bus.busBediend = makeBediening());
      const r = toggleKneel(b, bus.speed);
      if (!r.ok) w.addMessage('Sta eerst stil voordat je de bus laat knielen.', 2, { kind: 'tip', key: 'bus-kneel' });
    }
  }
  const b = bus.busBediend;
  if (b) {
    for (const e of stepBediening(b, dt, bus.speed)) {
      if (e.type === 'deurslag') { b.slag = true; w.addMessage('De deuren sloegen dicht: niet rijden met open deuren!', 2.6, { kind: 'tip', key: 'bus-slag' }); }
    }
    applyDoors(bus, b);
  }
  // HUD
  const r = getRow();
  if (!r) return;
  const ride = b && b.ride && !b.ride.done && !b.ride.failed ? b.ride : null;
  const info = busCardState.info;
  let etaText = '';
  if (info) {
    const pr = haltePrognose({ dist: info.dist, speed: bus.speed, ride });
    const vt = vertragingTekst(pr.vertraging);
    etaText = `${roundDist(info.dist)} · ${pr.eta} s${vt ? ' · ' + vt : ''}`;
  }
  if (r._eta !== etaText) { r._eta = etaText; r.eta.textContent = etaText; }
  const stopOn = !!(ride && ride.request);
  if (r._stop !== stopOn) { r._stop = stopOn; r.stop.classList.toggle('on', stopOn); }
  const doorOn = !!(b && b.doorWant);
  if (r._door !== doorOn) {
    r._door = doorOn;
    r.deur.classList.toggle('on', doorOn);
    const di = r.deurI || (r.deurI = r.deur.querySelector('i'));
    if (di) di.textContent = doorOn ? 'Deuren dicht' : 'Deuren open';
  }
  const kneelOn = !!(b && b.kneelWant);
  if (r._kneel !== kneelOn) {
    r._kneel = kneelOn;
    r.kneel.classList.toggle('on', kneelOn);
    const ki = r.kneelI || (r.kneelI = r.kneel.querySelector('i'));
    if (ki) ki.textContent = kneelOn ? 'Omhoog' : 'Knielt';
    // de uitleg van de knop volgt de stand: knielen laat de bus zakken, omhoog brengt hem weer op rijhoogte (#502)
    r.kneel.title = kneelOn ? 'Laat de bus weer omhoog komen' : 'Laat de bus zakken bij de halte';
  }
  const showTev = !!ride;
  if (r._tevShow !== showTev) { r._tevShow = showTev; r.tev.style.display = showTev ? 'inline' : 'none'; }
  if (ride) {
    const sat = ride.tevreden.sat;
    const wStars = waardering(sat);
    const tevKey = `${wStars}|${tevredenWoord(sat)}`;
    if (r._tevKey !== tevKey) {
      r._tevKey = tevKey;
      r.tev.textContent = `${'★'.repeat(wStars)}${'☆'.repeat(5 - wStars)} ${tevredenWoord(sat)}`;
    }
  }
}

export const busBestuurKind = { id: 'busbestuur', tickPhase: 'world', tick: updateBusBestuur };

