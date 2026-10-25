// De bediening van de bus in het spel (#444): O deuren, K knielt, de halteknop-lamp en de prognose voor de volgende
// halte in het HUD-kaartje van busboard3d.js. De regels staan in busbestuur.js (met tests); dit bestand is de lijm
// met de wereld, de deuren van vehicledoors.js en het HUD. Meldt zich in main.js als kind.

import { ensureDoors, wantDoor, doorsFor } from './vehicledoors.js';
import { busCardState } from './busboard3d.js';
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
  if (!document.getElementById('busbed-style')) {
    const st = document.createElement('style');
    st.id = 'busbed-style';
    st.textContent = `#hud .hud-busbed{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px 12px;margin-top:6px;font-size:13px;color:rgba(240,237,228,.85)}
#hud .hud-busbed>span{white-space:nowrap}
#hud .hud-busbed kbd{font:inherit;font-weight:bold;padding:0 6px;margin-right:5px;border-radius:3px;background:rgba(240,237,228,.85);color:#14201a;text-shadow:none}
#hud .hud-busbed .bb-stop{padding:0 8px;border-radius:3px;background:rgba(80,24,18,.9);color:rgba(240,237,228,.45);letter-spacing:2px;font-weight:bold}
#hud .hud-busbed .bb-stop.on{background:#d93a2b;color:#fff}
#hud .hud-busbed .on:not(.bb-stop){color:#ffb21a}
#hud .hud-busbed .bb-tev{display:none;color:#f0ede4}`;
    document.head.appendChild(st);
  }
  const el = document.createElement('div');
  el.className = 'hud-busbed';
  el.innerHTML = '<span class="bb-eta"></span><span class="bb-stop">STOP</span><span class="bb-deur"><kbd>O</kbd><i>Deuren open</i></span><span class="bb-kneel"><kbd>K</kbd><i>Knielt</i></span><span class="bb-tev"></span>';
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
  const p = w.player;
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
  if (info) {
    const pr = haltePrognose({ dist: info.dist, speed: bus.speed, ride });
    const vt = vertragingTekst(pr.vertraging);
    r.eta.textContent = `${roundDist(info.dist)} · ${pr.eta} s${vt ? ' · ' + vt : ''}`;
  } else r.eta.textContent = '';
  r.stop.classList.toggle('on', !!(ride && ride.request));
  r.deur.classList.toggle('on', !!(b && b.doorWant));
  r.deur.querySelector('i').textContent = b && b.doorWant ? 'Deuren dicht' : 'Deuren open';
  r.kneel.classList.toggle('on', !!(b && b.kneelWant));
  r.kneel.querySelector('i').textContent = b && b.kneelWant ? 'Omhoog' : 'Knielt';
  if (ride) {
    const sat = ride.tevreden.sat;
    r.tev.style.display = 'inline';
    r.tev.textContent = `${'★'.repeat(waardering(sat))}${'☆'.repeat(5 - waardering(sat))} ${tevredenWoord(sat)}`;
  } else r.tev.style.display = 'none';
}

export const busBestuurKind = { id: 'busbestuur', tickPhase: 'world', tick: updateBusBestuur };
