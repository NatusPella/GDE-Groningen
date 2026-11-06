// Samen spelen (#528, ADR 0022): the boot path that closes the gap between the world starting and a
// session existing. Once the world is playable this decides, with the rules of sessiekeuze.js, whether
// to join the busiest fitting public session, to host one, or to stay on our own - and it says why in a
// short line on screen. Nothing here blocks the start: a list that cannot be reached only costs a couple
// of seconds in the background, and the world keeps running the whole time.
//
// Consent comes first (constitution 4 and 10): without magOnline() there is no list, no broker and no
// socket, and the game simply plays locally. There is no path here that contacts anyone after "no".
//
// The work of a session itself stays where it already was: startHost/startClient (coopnet.js) over the
// same rtcroom.js + brokers.js route the lobby uses, and the public line of #438 (hub.zetOpenbaar +
// maakAankondiger + LijstSignaler). This module only wires those together for the boot.
//   node scripts/sessionboot_test.mjs
import { magOnline, getSettings } from './settings.js';
import { kies, volgende, KEUZE } from './sessiekeuze.js';
import { handshakeInfo, canJoin, startHost, startClient, addGuest, stopCoopNet } from './coopnet.js';
import { readHostScene } from './coopscene.js';
import { readSession, writeSession, toSession } from './coopsave.js';
import { LIJST, Serverlijst, schoonNaam, maakAankondiger, STANDAARD_NAAM } from './net/serverlijst.js';
import { MultiSignaler, LijstSignaler } from './net/brokers.js';
import { hostRoom, joinRoom, rtcSupported } from './net/rtcroom.js';
import { makeRoom, formatRoom, topicFor } from './net/sigcrypto.js';
import { PROTO } from './net/protocol.js';
import { KEYS } from './storagekeys.js';
import { VERSION } from './version.js';
import { isPauseMenuOpen, isMapOpen } from './pausestate.js';
import * as CONFIG from './net/netconfig.js';

// How long each step may take. Deliberately short: the player is already walking around, so a broker
// that does not answer costs a few seconds and not a hanging start.
export const BOOT = {
  lijstWacht: 2500,   // ms waiting for the public list before deciding without it
  lijstSettle: 400,   // ms of quiet after the first announcement: the other hosts get one more moment
  verbindWacht: 8000, // ms per join attempt: the room answered, but no welcome in time
  pogingen: 2,        // join attempts before hosting yourself: no endless loop
};

const MESSAGE_S = 5; // s the reason stays on screen
const hasSocket = () => typeof WebSocket !== 'undefined';

// The boot state of each world: one attempt at a time, the result, and how often a failing boot tried.
// Kept here and not on `world`, so the boot adds no fields to the world object (scripts/world_eigenaar.mjs).
const stand = new WeakMap();
const standVan = (world) => { let st = stand.get(world); if (!st) { st = { bezig: false, uit: false, pogingen: 0, resultaat: null, fout: '' }; stand.set(world, st); } return st; };

const socketFor = (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; };
const newSignaler = () => new MultiSignaler(CONFIG, { socket: socketFor }, { fallbackAfter: CONFIG.TIMEOUTS.fallbackAfter, brokerTimeout: CONFIG.TIMEOUTS.broker });
const newLijstSignaler = () => new LijstSignaler(CONFIG, { socket: socketFor }, { brokerTimeout: CONFIG.TIMEOUTS.broker, interval: LIJST.interval });
const store = () => { try { return localStorage; } catch (e) { return null; } };

// The sessions the player reported stay hidden on this device (#438), exactly as in the list of the lobby.
function hiddenIds() {
  try {
    const a = JSON.parse(store().getItem(KEYS.serverlijstVerborgen) || '[]');
    return Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(-50) : [];
  } catch (e) { return []; }
}

// May the boot look for a session at this moment? Consent, a working route and a player who can walk
// away from his own world (coopnet.canJoin) are the whole condition.
// sessionBootBezig is voor de sessie van één (#554): zolang de startzoektocht loopt,
// mag die niet als gastheer beginnen, anders sluit hij de zoektocht buiten.
export function sessionBootBezig(world) { const st = world ? stand.get(world) : null; return !!(st && st.bezig); }
export function canBootSession(world) {
  const st = world ? stand.get(world) : null;
  if (!world || world.coopNet || world.coopWissel) return false;
  if (st && (st.bezig || st.uit)) return false; // one attempt at a time, and no second one after a session
  if (!magOnline()) return false; // no consent: no contact at all
  if (!rtcSupported() || !hasSocket()) return false;
  return canJoin(world).ok;
}

// ------------------------------------------------------------------ the public list
// The rows of net/serverlijst.js, or an empty list when nothing answers in time. Never throws and never
// keeps a socket open: the invitation has to be given away before the session itself starts.
export function haalLijst({ wacht = BOOT.lijstWacht } = {}) {
  return new Promise((resolve) => {
    if (!hasSocket()) return resolve([]);
    const sig = newLijstSignaler();
    const lijst = new Serverlijst({ proto: PROTO, versie: VERSION, verborgen: hiddenIds() });
    let klaar = false, timer = null, settle = null, tik = null;
    const stop = () => {
      if (klaar) return;
      klaar = true;
      clearTimeout(timer); clearTimeout(settle); clearInterval(tik);
      try { sig.close(); } catch (e) { /* al weg */ }
      resolve(lijst.lijst());
    };
    timer = setTimeout(stop, wacht);
    tik = setInterval(() => { if (sig.alleFout()) stop(); }, 200); // every broker refused: waiting longer says nothing
    topicFor(LIJST.sleutel).then((topic) => {
      if (klaar) return;
      sig.luister(topic, (tekst) => {
        if (lijst.ontvang(tekst).ok && !settle) settle = setTimeout(stop, BOOT.lijstSettle);
      });
    }, () => stop());
  });
}

// ------------------------------------------------------------------ joining
// Resolves true once the host accepted us, false when it refused or stayed silent. The session reports
// both through onstatus (net/session.js): a full room, another version or a password end in 'geweigerd'.
function waitForWelcome(session, ms = BOOT.verbindWacht) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => { if (done) return; done = true; clearTimeout(timer); resolve(ok); };
    const timer = setTimeout(() => finish(false), ms);
    if (session.status === 'ok' || session.status === 'lag') return finish(true);
    const prev = session.onstatus;
    session.onstatus = (status) => {
      if (prev) prev(status);
      if (status === 'ok' || status === 'lag') finish(true);
      else if (status === 'geweigerd' || status === 'verbroken') finish(false);
    };
  });
}

// The transport to a room, over the room-code route the lobby uses (net/rtcroom.js). A seam, so the test
// can hand over the in-memory transport of net/memtransport.js instead of a real connection.
function openRoomTransport(room) {
  return new Promise((resolve, reject) => {
    if (!rtcSupported()) return reject(new Error('Een kamercode werkt niet op dit apparaat.'));
    const signaler = newSignaler();
    let handle = null;
    const timer = setTimeout(() => { try { if (handle) handle.cancel(); } catch (e) { /* al weg */ } reject(new Error('geen antwoord')); }, BOOT.verbindWacht);
    joinRoom(room, {
      signaler, timeouts: CONFIG.TIMEOUTS,
      onstate: (state, info) => { if (state === 'fout') { clearTimeout(timer); reject(new Error(info || 'verbinden lukte niet')); } },
    }).then((h) => {
      handle = h;
      h.opened.then((tr) => { clearTimeout(timer); resolve(tr); }, (e) => { clearTimeout(timer); reject(e || new Error('verbinden lukte niet')); });
    }, (e) => { clearTimeout(timer); reject(e || new Error('verbinden lukte niet')); });
  });
}

// Join one row. A refused or silent host leaves no half session behind: the world is ours again before
// the error goes up, so the boot can try the next candidate and finally host.
export async function openSession(world, rij, { onHold = null, onCode = null, openTransport = openRoomTransport } = {}) {
  const transport = await openTransport(rij.room);
  // The own game is checkpointed by startClient itself (#448) before we play in someone else's world.
  const session = startClient(world, transport, handshakeInfo({ tiles: '-', story: 'nieuw' }), {
    route: 'kamer', code: formatRoom(rij.room), wens: null,
    onHold: onHold ? (rol, slot, reden) => onHold(rol, slot, reden) : null,
  });
  if (!(await waitForWelcome(session))) {
    const reason = session.rejected || 'geen antwoord';
    try { stopCoopNet(world); } catch (e) { /* al weg */ }
    throw new Error(reason);
  }
  if (onCode) onCode(formatRoom(rij.room));
  return session;
}

// ------------------------------------------------------------------ hosting
// A new invitation per free seat, under one room code, plus the public line of #438. Nothing is sent that
// #438 did not already send: the session name (filtered), the player count, the version and the room code.
// No address and no password.
export function hostSession(world, { openbaar = true, invites = true, onHold = null } = {}) {
  const hub = startHost(world, handshakeInfo({ tiles: '-', story: 'nieuw' }), {
    route: 'kamer',
    scene: () => readHostScene(world),
    onHold: onHold ? (rol, slot, reden) => onHold(rol, slot, reden) : null,
  });
  const boot = { hub, room: null, handles: [], sig: null, timer: null };
  standVan(world).boot = boot;
  if (invites) openInvite(world, boot);
  if (openbaar) announce(world, boot);
  // the session ends (the player stops it in the pause menu): the announcement and the invitation go too
  boot.timer = setInterval(() => { if (!world.coopNet) stopSessionBoot(world); }, 2000);
  if (boot.timer && boot.timer.unref) boot.timer.unref();
  return hub;
}

// The session this boot opened, or null. Exported for scripts/sessionboot_test.mjs and for a caller that
// wants to know whether the boot (and not the pause menu) is behind the running session.
export function sessionBootState(world) {
  const st = world && stand.get(world);
  return (st && st.boot) || null;
}

function openInvite(world, boot) {
  if (!rtcSupported() || !boot.hub || !boot.hub.vrijePlekken) return;
  const room = boot.room || makeRoom();
  boot.room = room;
  const ls = store();
  if (ls) writeSession(ls, toSession(readSession(ls), { code: formatRoom(room) })); // the code for the pause menu and a retry
  hostRoom(room, {
    signaler: newSignaler(), timeouts: CONFIG.TIMEOUTS,
    onstate: (state, info) => {
      if (state === 'fout') console.warn('sessie', info);
      if (state === 'open') openInvite(world, boot); // a new seat for the next guest, under the same code
    },
  }).then((h) => {
    if (sessionBootState(world) !== boot) { try { h.cancel(); } catch (e) { /* al weg */ } return; }
    boot.handles.push(h);
    addGuest(world, h.transport);
  }, (e) => console.warn('sessie', e));
}

function announce(world, boot) {
  const hub = boot.hub;
  if (!hub || !hub.zetOpenbaar || !hasSocket()) return;
  const naam = schoonNaam(getSettings().onlineNaam || STANDAARD_NAAM);
  const gezet = hub.zetOpenbaar(true, naam.ok ? naam.naam : STANDAARD_NAAM);
  if (!gezet.ok) return;
  const pub = hub.publiek ? hub.publiek() : null;
  if (!pub || !pub.naam) return;
  const sig = newLijstSignaler();
  boot.sig = sig;
  const maak = maakAankondiger({ naam: pub.naam, versie: VERSION, proto: PROTO, room: () => boot.room, id: pub.id, hub: () => (hub.publiek ? hub.publiek() : null) });
  topicFor(LIJST.sleutel).then((topic) => {
    if (sessionBootState(world) === boot && world.coopNet) sig.kondig(topic, maak);
  }, () => { /* no topic: then no line in the list */ });
}

// The announced session is over: stop the announcement, the last invitation and the guard.
export function stopSessionBoot(world) {
  const st = world && stand.get(world);
  const boot = st && st.boot;
  if (!boot) return;
  st.boot = null;
  if (boot.timer) clearInterval(boot.timer);
  if (boot.sig) { try { boot.sig.close(); } catch (e) { /* al weg */ } }
  for (const h of boot.handles) { try { h.cancel(); } catch (e) { /* al weg */ } }
}

// ------------------------------------------------------------------ the decision
const meld = (world, deps, tekst) => {
  if (!tekst) return;
  if (deps && deps.meld) return deps.meld(tekst);
  if (world && typeof world.addMessage === 'function') world.addMessage(tekst, MESSAGE_S);
};

// Called once per frame from main.js. The tick only starts the boot when the player may join right now
// (canBootSession) and never twice; everything else happens in the background. The waiting check itself
// runs at most once a second: a vehicle, a filmpje or no consent can hold for minutes. A boot that throws
// gets a few more tries and then gives up, so a broken broker never turns into an endless loop.
let volgendeControle = 0;
const POGINGEN_MAX = 3;
export function sessionBootTick(world, deps = {}) {
  if (!world) return;
  const st = standVan(world);
  if (st.bezig || st.uit) return;
  const nu = Date.now();
  if (nu < volgendeControle) return;
  volgendeControle = nu + 1000;
  if (typeof document === 'undefined' || !document.body || !document.body.classList.contains('game-started')) return;
  if (isPauseMenuOpen() || isMapOpen()) return;
  if (!canBootSession(world)) return; // no consent, still in a filmpje or in a vehicle: try a later frame
  st.bezig = true;
  bootSession(world, deps).then((r) => {
    st.bezig = false;
    st.resultaat = r;
    // A session runs now (joined or hosted): no second attempt. No session at all (the broker refused and
    // hosting failed too) counts as a failed attempt, so even this path stops after a few tries.
    st.uit = !!world.coopNet || ++st.pogingen >= POGINGEN_MAX;
  }, (e) => {
    st.bezig = false;
    st.pogingen++;
    st.fout = e && e.message ? e.message : String(e);
    st.uit = st.pogingen >= POGINGEN_MAX; // give up quietly: the game keeps running
  });
}

// The whole boot in one call: list, choice, join (the next candidate after a failure) and finally hosting.
// Never rejects: whatever goes wrong, the player ends up in a game that runs.
// deps: { magOnline(), haalLijst(), verbind(rij), host(opts), hostOpties, openTransport, eigenId,
//         meld(tekst), onHold } - all optional, so the rules and the join path can be tested without a
// real broker (scripts/sessionboot_test.mjs).
export async function bootSession(world, deps = {}) {
  const mag = deps.magOnline || magOnline;
  if (!mag()) return { doen: KEUZE.BESLOTEN, sessie: null, pogingen: [], reden: '' }; // never contacts anyone

  let rijen = [];
  try { rijen = (await (deps.haalLijst || haalLijst)()) || []; } catch (e) { rijen = []; }
  // The player opened a session in the pause menu while the list was loading: that one wins, we stop here.
  if (world && world.coopNet) return { doen: KEUZE.BESLOTEN, sessie: null, pogingen: [], reden: '' };
  const keuze = kies({ rijen, meedoen: true, eigenId: deps.eigenId || '' });
  const pogingen = [];
  const hostNu = () => {
    const host = deps.host || ((opts) => hostSession(world, { ...(deps.hostOpties || {}), onHold: deps.onHold }));
    try { return host(deps.hostOpties || {}); } catch (e) {
      const st = world ? standVan(world) : null;
      if (st) st.fout = e && e.message ? e.message : String(e);
      return null;
    }
  };

  if (keuze.doen === KEUZE.MEEDOEN) {
    const verbind = deps.verbind || ((rij) => openSession(world, rij, { onHold: deps.onHold, openTransport: deps.openTransport }));
    let sessie = keuze.sessie;
    for (let i = 0; i < Math.min(BOOT.pogingen, keuze.kandidaten.length) && sessie; i++) {
      try {
        await verbind(sessie);
        return { doen: KEUZE.MEEDOEN, sessie, pogingen, reden: '' };
      } catch (e) {
        pogingen.push(sessie.id); // a session that filled up in the meantime: try the next one
        sessie = volgende(keuze.kandidaten, pogingen);
      }
    }
    // Nothing worked: host yourself, and say why (never silent).
    const laatste = pogingen.length ? keuze.kandidaten.find((k) => k.sessie.id === pogingen[pogingen.length - 1]) : null;
    const naam = laatste && laatste.sessie.naam ? laatste.sessie.naam : 'Die sessie';
    const reden = `${naam} gaf geen plek. Je opent zelf een sessie.`;
    await hostNu();
    meld(world, deps, reden);
    return { doen: KEUZE.HOSTEN, sessie: null, pogingen, reden };
  }

  await hostNu();
  meld(world, deps, keuze.reden); // "Er speelt nog niemand", "De sessie van X is vol": the player hears why
  return { doen: KEUZE.HOSTEN, sessie: null, pogingen, reden: keuze.reden };
}

