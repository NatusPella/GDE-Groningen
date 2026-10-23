// Coöp fase 4 (#95): hostmodel. De host simuleert alles; de client stuurt
// alleen invoer en ontvangt toestand (snapshots ~20 Hz, onbetrouwbaar) en
// gebeurtenissen (betrouwbaar). Verkeer, voetgangers, dieren en weer worden
// niet gesynchroniseerd (zie ontwerp in #95). Pure logica: tijd komt van
// tick(dt), het transport is elk object met send/onmessage (memtransport.js
// of rtc.js). Geen IP-adressen of namen in berichten, geen telemetrie.

import { T, encodeInput, decodeInput, encodeSnapshot, decodeSnapshot, encodeJson, decodeJson, encodeSimple, readHeader, encodeExtra, decodeExtra } from './codec.js';
import { PROTO, Reliable, checkHandshake, seqNewer, seqDiff } from './protocol.js';

export const SNAP_HZ = 20;
export const INPUT_HZ = 30;
export const EXTRA_HZ = 5;       // voetgangers, dieren, lichten: traag veranderend, dus een kwart van het snapshottempo
export const LAG_AFTER = 0.6;      // s zonder bericht: status 'lag'
export const LOST_AFTER = 5;       // s zonder bericht: verbinding verloren
export const HELLO_TIMEOUT = 30;   // s zonder welkom van de host (die laadt, hangt of is weg): de gast geeft het op met een duidelijke melding
export const RESUME_WINDOW = 120;  // s waarin de gast kan hervatten
export const INTERP_DELAY = 0.1;   // s: de client toont de wereld iets in het verleden
export const MAX_EXTRAPOLATE = 0.25;
export const STALE_INPUT = 0.5;    // s zonder invoer: de host neutraliseert (geen vastzittende toets)
const PING_EVERY = 1;

export function makeToken(rand = Math.random) {
  let s = ''; for (let i = 0; i < 12; i++) s += Math.floor(rand() * 36).toString(36); return s;
}

class Base {
  constructor(link, id, rand) {
    this.link = link; this.id = id; this.rand = rand || Math.random;
    this.now = 0; this.tickN = 0; this.rel = new Reliable();
    this.lastRecv = 0; this.status = 'verbinden'; this.rtt = 0; this.pingT = 0;
    this.onstatus = null; this.onevent = null;
    this._attach(link);
  }
  _attach(link) { this.link = link; link.onmessage = (b) => this._raw(b); }
  rebind(link) { this._attach(link); } // nieuw transport na wegvallen (hervatten met hetzelfde token)
  _emit(bytes) { return this.link.send(bytes); }
  _setStatus(s) { if (s !== this.status) { this.status = s; if (this.onstatus) this.onstatus(s); } }
  // geeft event-bodies door; ACK en ping zijn intern
  _common(h, buf) {
    if (h.type === T.ACK) { this.rel.onAck(h.ack, h.seq); return true; }
    if (h.type === T.EVENT) {
      const m = decodeJson(buf); if (!m) return true;
      for (const b of this.rel.receive({ seq: m.seq, body: m.body, epoch: m.ack }, (x) => this._emit(x))) this._onEvent(b);
      return true;
    }
    if (h.type === T.PING) { this._emit(encodeSimple(T.PONG, 0, h.tick, 0)); return true; }
    if (h.type === T.PONG) { this.rtt = Math.max(0, this.now - h.tick / 1000); return true; }
    return false;
  }
  _onEvent(b) { if (this.onevent) this.onevent(b); }
  sendEvent(body) { return this.rel.send(body, this.now, (x) => this._emit(x), this.tickN); }
  _tickCommon(dt) {
    this.now += dt; this.tickN++;
    this.rel.tick(this.now, (x) => this._emit(x), this.status === 'lost');
    if (this.now - this.pingT >= PING_EVERY && this.status !== 'verbinden') {
      this.pingT = this.now; this._emit(encodeSimple(T.PING, 0, Math.floor(this.now * 1000), 0));
    }
  }
  _quiet() { return this.now - this.lastRecv; }
}

// ---------------------------------------------------------------- host
export class HostSession extends Base {
  // cfg: { info:{game,proto,version,tiles,story}, seed, sim:{ applyInput(slot,input), snapshot(), fullState() } }
  constructor(link, cfg, rand) {
    super(link, 'host', rand);
    this.cfg = cfg; this.caps = []; this.slot = 1; this.extra = {}; // zonder hub is de gast altijd slot 1 (host = slot 0); een hub wijst plekken toe (cfg.assign)
    this.guest = null;             // { token, lastInputSeq, input, lastInputAt, joined }
    this.snapAcc = 0; this.snapSeq = 0; this.extraAcc = 0; this.extraSeq = 0; this.lostAt = null;
    this.onlost = null; this.onjoin = null; this.onrelease = null; this.rejected = [];
  }
  _raw(buf) {
    const h = readHeader(buf); if (!h) return;
    if (h.type === T.HELLO) return this._hello(buf);
    if (!this.guest) return; // eerst een geldige hello
    if (this.status === 'lost') {
      if (h.type === T.BYE) { this._release('weg'); return; }
      // alleen een hello met token hervat, of invoer van de gast zelf: de gast merkte de stilte niet (hij hoorde de pings van de host nog),
      // dus hij stuurt nooit een hello. Zonder dit bleef de host hem voor altijd als weggevallen zien (en negeerde zijn invoer).
      if (h.type !== T.INPUT) return;
      this.lastRecv = this.now; this.lostAt = null; this._setStatus('ok'); this._sendResync();
    }
    this.lastRecv = this.now;
    if (this.status === 'lag') this._setStatus('ok');
    if (this._common(h, buf)) return;
    if (h.type === T.INPUT) this._input(buf);
    else if (h.type === T.RESYNC) this._sendResync();
    else if (h.type === T.BYE) this._release('weg');
  }
  _hello(buf) {
    const m = decodeJson(buf); if (!m) return;
    const r = checkHandshake(this.cfg.info, m.body);
    const reply = (b) => this._emit(encodeJson(T.WELCOME, 0, this.tickN, 0, b));
    if (!r.ok) { this.rejected.push(r.reason); return reply({ ok: false, reason: r.reason, version: String(this.cfg.info.version || '') }); }
    const tok = m.body.token;
    if (this.guest && tok && tok === this.guest.token) { // hervatten of herhaalde hello
      const resumed = this.status === 'lost';
      this.lastRecv = this.now; this.lostAt = null; this._setStatus('ok');
      reply({ ok: true, slot: this.slot, token: this.guest.token, seed: this.cfg.seed, resumed, caps: this.caps, ...this.extra });
      if (resumed) { this.rel.reset(); this._sendResync(); }
      return;
    }
    if (this.guest && !tok && this.guest.lastInputSeq == null) { // welkom ging verloren: herhaal
      this.lastRecv = this.now; this._setStatus('ok');
      return reply({ ok: true, slot: this.slot, token: this.guest.token, seed: this.cfg.seed, resumed: false, caps: this.caps, ...this.extra });
    }
    if (this.guest && this.status !== 'lost') { this.rejected.push('vol'); return reply({ ok: false, reason: 'vol' }); }
    if (this.guest && tok !== this.guest.token) { this.rejected.push('token'); if (tok) return reply({ ok: false, reason: 'token' }); }
    if (this.cfg.assign) { // meerdere spelers: de hub wijst een plek en een figuur toe, of zegt dat het vol is
      const a = this.cfg.assign(m.body);
      if (!a) { this.rejected.push('vol'); return reply({ ok: false, reason: 'vol' }); }
      this.slot = a.slot; this.extra = a.extra || {};
    }
    this.guest = { token: makeToken(this.rand), lastInputSeq: null, input: neutral(), lastInputAt: this.now };
    this.lastRecv = this.now; this.lostAt = null; this.rel.reset(); this._setStatus('ok');
    this.caps = negotiate(this.cfg.caps, m.body.caps);
    reply({ ok: true, slot: this.slot, token: this.guest.token, seed: this.cfg.seed, resumed: false, caps: this.caps, ...this.extra });
    this._sendResync();
    if (this.onjoin) this.onjoin(this.slot);
  }
  _input(buf) {
    const m = decodeInput(buf); if (!m) return;
    const g = this.guest;
    if (g.lastInputSeq != null && !seqNewer(m.seq, g.lastInputSeq)) return; // oud of dubbel
    g.lastInputSeq = m.seq; g.lastInputAt = this.now;
    g.input = { mx: m.mx, my: m.my, buttons: m.buttons, yaw: m.yaw };
    this.cfg.sim.applyInput(this.slot, g.input, m.seq);
  }
  _sendResync() { this.sendEvent({ k: 'resync', state: this.cfg.sim.fullState() }); }
  _release(why) {
    if (this.guest && this.cfg.onRelease) this.cfg.onRelease(this.slot, why);
    this.guest = null; this.lostAt = null; this._setStatus('verbinden');
    if (this.onrelease) this.onrelease(this.slot, why);
  }
  tick(dt) {
    this._tickCommon(dt);
    if (!this.guest) return;
    const q = this._quiet();
    if (this.status === 'ok' && q >= LAG_AFTER) this._setStatus('lag');
    if ((this.status === 'ok' || this.status === 'lag') && q >= LOST_AFTER) {
      this.lostAt = this.now; this._setStatus('lost');
      if (this.onlost) this.onlost(this.slot); // de NPC-metgezel neemt over
    }
    if (this.status === 'lost' && this.now - this.lostAt >= RESUME_WINDOW) { this._release('verlopen'); return; }
    // vastzittende toets: zonder verse invoer lopen we niet door
    if (this.now - this.guest.lastInputAt > STALE_INPUT && (this.guest.input.mx || this.guest.input.my || this.guest.input.buttons)) {
      this.guest.input = neutral(); this.cfg.sim.applyInput(this.slot, this.guest.input, this.guest.lastInputSeq);
    }
    if (this.status === 'lost') return;
    this.snapAcc += dt;
    while (this.snapAcc >= 1 / SNAP_HZ) {
      this.snapAcc -= 1 / SNAP_HZ;
      this.snapSeq = (this.snapSeq + 1) & 0xffff;
      this._emit(encodeSnapshot(this.snapSeq, this.tickN, this.guest.lastInputSeq ?? 0, this.cfg.sim.snapshot()));
    }
    // de extra wereld van de host (coopextra.js), per gast op maat: alleen wat dicht bij de spelers is
    this.extraAcc += dt;
    if (this.extraAcc >= 1 / EXTRA_HZ) {
      this.extraAcc = 0;
      const lading = this.cfg.sim.extra ? this.cfg.sim.extra(this.slot, this.tickN) : null;
      if (lading && lading.length) { this.extraSeq = (this.extraSeq + 1) & 0xffff; this._emit(encodeExtra(this.extraSeq, this.tickN, 0, lading)); }
    }
  }
  // gebeurtenis voor de gast (missie, cutscene-start, geld): betrouwbaar
  announce(body) { return this.guest ? this.sendEvent(body) : false; }
  leave() { this._emit(encodeSimple(T.BYE, 0, 0, 0)); this._release('weg'); }
}
// Uitbreidbaar: elke kant noemt wat hij kan (bijv. 'scene', 'spelers>2'); gebruikt wordt
// wat beide kennen. Onbekende gebeurtenissen (k) worden door de ontvanger genegeerd.
export function negotiate(mine, theirs) {
  const a = Array.isArray(mine) ? mine : [], b = Array.isArray(theirs) ? theirs : [];
  return a.filter((c) => typeof c === 'string' && b.includes(c)).slice(0, 16);
}
const neutral = () => ({ mx: 0, my: 0, buttons: 0, yaw: 0 });

// ---------------------------------------------------------------- client
export class SnapBuffer {
  constructor() { this.snaps = []; this.renderT = null; }
  push(s) {
    const t = s.hostT;
    if (this.snaps.length && t <= this.snaps[this.snaps.length - 1].hostT) return false; // oud of dubbel
    this.snaps.push(s); if (this.snaps.length > 40) this.snaps.shift();
    return true;
  }
  clear() { this.snaps.length = 0; this.renderT = null; }
  get latestT() { return this.snaps.length ? this.snaps[this.snaps.length - 1].hostT : null; }
  // schuif de weergavetijd op met dt; blijf tussen laatste-0.25 en laatste-0.05
  advance(dt) {
    const L = this.latestT; if (L == null) return null;
    if (this.renderT == null) this.renderT = L - INTERP_DELAY;
    this.renderT = Math.min(L - 0.05, Math.max(L - 0.25, this.renderT + dt));
    return this.renderT;
  }
  sample() {
    if (!this.snaps.length) return null;
    const t = this.renderT ?? this.snaps[this.snaps.length - 1].hostT;
    const s = this.snaps;
    if (t <= s[0].hostT) return s[0];
    for (let i = s.length - 1; i > 0; i--) {
      if (s[i - 1].hostT <= t) {
        const a = s[i - 1], b = s[i], k = (t - a.hostT) / (b.hostT - a.hostT);
        return mix(a, b, Math.min(1, Math.max(0, k)));
      }
    }
    return s[s.length - 1];
  }
  // aantal seconden dat we al zonder nieuwe toestand zitten (voor de lag-balk)
  starved(hostNow) { return this.latestT == null ? 0 : Math.max(0, hostNow - this.latestT); }
}
const lerp = (a, b, k) => a + (b - a) * k;
function lerpAngle(a, b, k) { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * k; }
function mix(a, b, k) {
  const players = b.players.map((pb) => {
    const pa = a.players.find((p) => p.slot === pb.slot);
    if (!pa || pb.vehicle !== pa.vehicle || pb.alive !== pa.alive) return pb; // geen interpolatie over een sprong (instappen, respawn)
    return { ...pb, x: lerp(pa.x, pb.x, k), y: lerp(pa.y, pb.y, k), z: lerp(pa.z, pb.z, k), angle: lerpAngle(pa.angle, pb.angle, k) };
  });
  const entities = b.entities.map((eb) => {
    const ea = a.entities.find((e) => e.id === eb.id);
    return ea ? { ...eb, x: lerp(ea.x, eb.x, k), z: lerp(ea.z, eb.z, k), angle: lerpAngle(ea.angle, eb.angle, k) } : eb;
  });
  return { ...b, players, entities, hostT: lerp(a.hostT, b.hostT, k) };
}

export class ClientSession extends Base {
  // cfg: { info, token? }
  constructor(link, cfg, rand) {
    super(link, 'client', rand);
    this.cfg = cfg; this.slot = null; this.seed = null; this.caps = []; this.token = cfg.token || null;
    this.buf = new SnapBuffer(); this.inputSeq = 0; this.inputAcc = 0; this.pendingInput = neutral();
    this.helloAt = -1; this.wachtHello = 0; this.rejected = null; this.lastSnapSeq = null; this.lastExtraSeq = null; this.onextra = null; this.onlost = null; this.onresync = null; this.joined = false;
  }
  _raw(buf) {
    const h = readHeader(buf); if (!h) return;
    this.lastRecv = this.now;
    if (this._common(h, buf)) { if (this.status === 'lag') this._setStatus('ok'); return; }
    if (h.type === T.WELCOME) {
      const m = decodeJson(buf); if (!m) return;
      if (!m.body.ok) { this.rejected = m.body.reason; this.remoteVersion = typeof m.body.version === 'string' ? m.body.version.slice(0, 20) : ''; this._setStatus('geweigerd'); return; }
      if (this.token && m.body.token !== this.token) this.rel.reset(); // een nieuwe sessie (te lang weg geweest): onze eigen stroom naar de host begint ook opnieuw; de stroom van de host volgt vanzelf (tijdperk)
      this.welcome = m.body; // inclusief wat de hub meegaf: personage, lijst van spelers
      this.lastExtraSeq = null; this.slot = m.body.slot; this.seed = m.body.seed; this.caps = Array.isArray(m.body.caps) ? m.body.caps : []; this.token = m.body.token; this.joined = true;
      if (m.body.resumed) this.buf.clear();
      this._setStatus('ok');
    } else if (h.type === T.SNAP && this.joined) {
      const s = decodeSnapshot(buf, this.looks || (this.looks = new Map())); if (!s) return; // looks: het laatst bekende uiterlijk per voertuig (#428)
      if (this.lastSnapSeq != null && !seqNewer(s.seq, this.lastSnapSeq)) return;
      this._unwrapped = this.lastSnapSeq == null ? s.seq : this._unwrapped + seqDiff(s.seq, this.lastSnapSeq);
      this.lastSnapSeq = s.seq;
      s.hostT = this._unwrapped / SNAP_HZ; // de host stuurt precies SNAP_HZ snapshots per seconde
      this.buf.push(s);
      if (this.status === 'lag') this._setStatus('ok');
    } else if (h.type === T.EXTRA && this.joined) {
      const x = decodeExtra(buf); if (!x) return;
      if (this.lastExtraSeq != null && !seqNewer(x.seq, this.lastExtraSeq)) return; // oud of dubbel
      this.lastExtraSeq = x.seq;
      if (this.onextra) this.onextra(x.payload, x.seq);
    } else if (h.type === T.BYE) { this.joined = false; this._setStatus('verbroken'); }
  }
  _onEvent(b) {
    if (b.k === 'resync' && this.onresync) this.onresync(b.state);
    else if (this.onevent) this.onevent(b);
  }
  // voor de weergave: invoer van deze frame; wordt met INPUT_HZ verstuurd
  setInput(mx, my, buttons, yaw) { this.pendingInput = { mx, my, buttons, yaw }; }
  tick(dt) {
    this._tickCommon(dt);
    if (!this.joined) {
      if (this.status === 'verbinden') { this.wachtHello += dt; if (this.wachtHello >= HELLO_TIMEOUT) { this.rejected = 'time-out'; this.remoteVersion = ''; this._setStatus('geweigerd'); return; } }
      if (this.status !== 'geweigerd' && this.status !== 'verbroken' && this.now - this.helloAt >= 1) {
        this.helloAt = this.now;
        this._emit(encodeJson(T.HELLO, 0, this.tickN, 0, { ...this.cfg.info, caps: this.cfg.caps || [], token: this.token || undefined }));
      }
      return;
    }
    this.buf.advance(dt);
    const q = this._quiet();
    if (this.status === 'ok' && q >= LAG_AFTER) this._setStatus('lag');
    if ((this.status === 'ok' || this.status === 'lag') && q >= LOST_AFTER) {
      this._setStatus('lost'); if (this.onlost) this.onlost();
    }
    if (this.status === 'lost') { // blijf proberen te hervatten met hetzelfde token
      if (this.now - this.helloAt >= 2) { this.helloAt = this.now; this._emit(encodeJson(T.HELLO, 0, this.tickN, 0, { ...this.cfg.info, caps: this.cfg.caps || [], token: this.token })); }
      return;
    }
    this.inputAcc += dt;
    while (this.inputAcc >= 1 / INPUT_HZ) {
      this.inputAcc -= 1 / INPUT_HZ;
      this.inputSeq = (this.inputSeq + 1) & 0xffff;
      this._emit(encodeInput(this.inputSeq, this.tickN, 0, this.pendingInput));
    }
  }
  // het transport zegt dat de verbinding dicht is (TCP, kanaal): een gast die nog geen welkom had, hoort dat meteen (sessie vol of gastheer weg)
  // in plaats van eindeloos te wachten; een gast die al meespeelde, telt als weggevallen zonder de 5 s te wachten
  _linkState(s) {
    if (s !== 'closed') return;
    if (this.status === 'verbinden' && !this.joined) { this.rejected = 'gesloten'; this._setStatus('geweigerd'); }
    else if (this.joined && (this.status === 'ok' || this.status === 'lag')) { this._setStatus('lost'); if (this.onlost) this.onlost(); }
  }
  _attach(link) {
    super._attach(link);
    if ('onstate' in link) { const prev = link.onstate; link.onstate = (s) => { if (prev) prev(s); this._linkState(s); }; } // ketenen: rtcroom zet er zelf ook een
  }
  // na een vervangen transport (nieuwe handmatige code) hervatten met hetzelfde token
  reconnect(link) { this._attach(link); this.helloAt = -1; this.wachtHello = 0; this.joined = false; this._setStatus('verbinden'); } // de betrouwbare stroom loopt door: het welkom zegt of de host opnieuw begon
  world() { return this.buf.sample(); }
  // de gast vraagt de host om zijn toestand opnieuw (desync, net/desync.js); het antwoord komt als 'resync' bij onresync
  requestResync() { this._emit(encodeSimple(T.RESYNC, 0, 0, 0)); }
  leave() { this._emit(encodeSimple(T.BYE, 0, 0, 0)); this.joined = false; this._setStatus('verbroken'); }
}

export { PROTO };
