// Coöp fase 4 (#95): hostmodel. De host simuleert alles; de client stuurt
// alleen invoer en ontvangt toestand (snapshots ~20 Hz, onbetrouwbaar) en
// gebeurtenissen (betrouwbaar). Verkeer, voetgangers, dieren en weer worden
// niet gesynchroniseerd (zie ontwerp in #95). Pure logica: tijd komt van
// tick(dt), het transport is elk object met send/onmessage (memtransport.js
// of rtc.js). Geen IP-adressen of namen in berichten, geen telemetrie.

import { T, encodeInput, decodeInput, encodeSnapshot, decodeSnapshot, encodeJson, decodeJson, encodeSimple, readHeader, encodeExtra, decodeExtra } from './codec.js';
import { volgTijd, schatTempo, mixPositie, mixEntiteiten, lerp, INTERP_DELAY } from './interp.js';
import { PROTO, Reliable, checkHandshake, seqNewer, seqDiff } from './protocol.js';

export const SNAP_HZ = 20;
export const INPUT_HZ = 30;
export const EXTRA_HZ = 5;       // voetgangers, dieren, lichten: traag veranderend, dus een kwart van het snapshottempo
export const LAG_AFTER = 0.6;      // s zonder bericht: status 'lag'
export const LOST_AFTER = 5;       // s zonder bericht: verbinding verloren
export const HELLO_TIMEOUT = 30;   // s zonder welkom van de host (die laadt, hangt of is weg): de gast geeft het op met een duidelijke melding
export const RESUME_WINDOW = 120;  // s waarin de gast kan hervatten
export { INTERP_DELAY, EXTRA_MAX as MAX_EXTRAPOLATE } from './interp.js'; // de client toont de wereld iets in het verleden en voorspelt hoogstens even (net/interp.js, #434)

export const STALE_INPUT = 0.5;    // s zonder invoer: de host neutraliseert (geen vastzittende toets)
const PING_EVERY = 1;

// #589: een verbinding die klaar is, gaat ook echt dicht. Het afscheidsbericht
// (BYE, 'weg') krijgt eerst nog even de tijd om de deur uit te gaan.
export const SLUIT_NA_MS = 250;      // ms: na het afscheid nog even de tijd om te versturen
export const REJECTED_MAX = 16;      // host: zoveel weigeringsredenen onthouden we, niet meer (het is een diagnoselijst)
export const BAD_HELLO_MAX = 5;      // host: zoveel mislukte kennismakingen op één verbinding, dan gaat hij dicht
export const OVERFLOW_MAX_S = 5;     // s dat de betrouwbare wachtrij vol zit voordat de host de gast laat gaan

export function makeToken(rand = Math.random) {
  let s = ''; for (let i = 0; i < 12; i++) s += Math.floor(rand() * 36).toString(36); return s;
}

class Base {
  constructor(link, id, rand) {
    this.link = link; this.id = id; this.rand = rand || Math.random;
    this.now = 0; this.tickN = 0; this.rel = new Reliable();
    this.lastRecv = 0; this.status = 'verbinden'; this.rtt = 0; this.pingT = 0;
    this.onstatus = null; this.onevent = null;
    this._sluitTimer = null;
    this._attach(link);
  }
  _attach(link) { this.link = link; link.onmessage = (b) => this._raw(b); }
  rebind(link) { this._attach(link); this._herverbonden = true; } // nieuw transport na wegvallen (hervatten met hetzelfde token)
  // #589: na het afscheidsbericht (BYE, 'weg') gaat het transport ook echt dicht.
  // Niet meteen: een kanaal of TCP-verbinding moet het bericht nog kunnen
  // versturen. Daarna blijft er geen open datachannel of socket meer over.
  _sluitLink(ms = SLUIT_NA_MS) {
    if (this._sluitTimer) return;
    const link = this.link;
    const dicht = () => {
      this._sluitTimer = null;
      try { if (link) { link.onmessage = null; if (link.close) link.close(); } } catch (e) { /* al weg */ }
    };
    if (!(ms > 0)) { dicht(); return; }
    this._sluitTimer = setTimeout(dicht, ms);
    if (this._sluitTimer && this._sluitTimer.unref) this._sluitTimer.unref(); // onder Node (de tests) houdt dit het proces niet open
  }
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
  stilte() { return this._quiet(); } // s zonder enig bericht van de ander (de overname bij wegvallen, coophostwisselnet.js)
  // s dat deze gast verbonden is (#450): de langst verbonden speler neemt over als de gastheer wegvalt. Een gast die
  // hervat (weggevallen en met zijn token terug) houdt zijn eerste moment: hij zat er al.
  verbondenSinds() { return this.guest ? Math.max(0, this.now - (Number.isFinite(this.guest.joinedAt) ? this.guest.joinedAt : this.now)) : 0; }
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
    this.gesloten = false;      // na een kick, verbod of release: deze verbinding neemt niets meer aan (#589)
    this.badHellos = 0;         // mislukte kennismakingen op deze verbinding; daarna gaat hij dicht (#589)
    this.dropped = 0;           // betrouwbare berichten die niet in de wachtrij pasten (#589)
    this.overflowSinds = null;  // wanneer de wachtrij vol liep (#589)
    this._dropGemeld = false;   // één waarschuwing per sessie, geen regel per bericht
  }
  // Een geweigerde kennismaking: de reden in een korte lijst (begrensd), en na
  // een paar pogingen gaat de verbinding dicht in plaats van WELCOME's te blijven sturen (#589).
  _weiger(reden) {
    this.rejected.push(reden);
    if (this.rejected.length > REJECTED_MAX) this.rejected.splice(0, this.rejected.length - REJECTED_MAX);
    this.badHellos++;
    if (this.badHellos >= BAD_HELLO_MAX && !this.gesloten) { this.gesloten = true; this._sluitLink(); }
  }
  _raw(buf) {
    if (this.gesloten) return; // #589: een gekickte of verbannen verbinding wordt niet meer gehoord
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
    if (this.gesloten) return;
    const m = decodeJson(buf); if (!m) return;
    const r = checkHandshake(this.cfg.info, m.body);
    const reply = (b) => this._emit(encodeJson(T.WELCOME, 0, this.tickN, 0, b));
    const weiger = (reden, metVersie = false) => {
      this._weiger(reden);
      return reply({ ok: false, reason: reden, ...(metVersie ? { version: String(this.cfg.info.version || '') } : null) });
    };
    if (!r.ok) return weiger(r.reason, true);
    // Een sessie op slot (#450): ook een terugkerende gast moet het wachtwoord opnieuw noemen, en een verbannen token
    // komt er niet meer in. Dezelfde weg als elke andere weigering: het welkom zegt waarom, de verbinding blijft wachten.
    const ww = this.cfg.wachtwoord ? String(this.cfg.wachtwoord() || '') : '';
    if (ww && String(m.body.wachtwoord == null ? '' : m.body.wachtwoord) !== ww) return weiger('wachtwoord', true);
    const verboden = this.cfg.verboden ? this.cfg.verboden() : null;
    if (verboden && m.body.token && verboden.has(String(m.body.token))) return weiger('verbod', true);
    const tok = m.body.token;
    // Een gast die al speelt (zijn invoer kwam al binnen) hoeft geen tweede welkom. Een late of
    // herhaalde HELLO is ruis en mag geen WELCOME per bericht kosten (#589); een andere of ontbrekende
    // token blijft wel een geweigerde kennismaking, zodat de ander weet waarom. Na een weggevallen
    // verbinding (status 'lost') is een HELLO met hetzelfde token juist de hervatting.
    if (this.guest && tok && tok === this.guest.token) { // hervatten of herhaalde hello
      const hervat = this._herverbonden; this._herverbonden = false;
      const resumed = this.status === 'lost' || hervat;
      this.lastRecv = this.now; this.lostAt = null; this.badHellos = 0; this._setStatus('ok');
      reply(this._welkom({ ok: true, slot: this.slot, token: this.guest.token, seed: this.cfg.seed, resumed, caps: this.caps, ...this.extra }));
      if (resumed) { this.rel.reset(); this._sendResync(); }
      return;
    }
    if (this.guest && !tok && this.guest.lastInputSeq == null) { // welkom ging verloren: herhaal
      this.lastRecv = this.now; this.badHellos = 0; this._setStatus('ok');
      return reply(this._welkom({ ok: true, slot: this.slot, token: this.guest.token, seed: this.cfg.seed, resumed: false, caps: this.caps, ...this.extra }));
    }
    if (this.guest && this.status !== 'lost') return weiger('vol');
    if (this.guest && tok !== this.guest.token) { this._weiger('token'); if (tok) return reply({ ok: false, reason: 'token' }); }
    if (this.cfg.assign) { // meerdere spelers: de hub wijst een plek en een figuur toe, of zegt dat het vol is
      const a = this.cfg.assign(m.body);
      if (!a) return weiger('vol');
      this.slot = a.slot; this.extra = a.extra || {};
    }
    this.guest = { token: makeToken(this.rand), lastInputSeq: null, input: neutral(), lastInputAt: this.now, joinedAt: this.now };
    this.lastRecv = this.now; this.lostAt = null; this.rel.reset(); this.badHellos = 0; this._setStatus('ok');
    this.caps = negotiate(this.cfg.caps, m.body.caps);
    reply(this._welkom({ ok: true, slot: this.slot, token: this.guest.token, seed: this.cfg.seed, resumed: false, caps: this.caps, ...this.extra }));
    this._sendResync();
    if (this.onjoin) this.onjoin(this.slot);
  }
  // Het welkom plus de vaste identiteit van deze sessie (#450): een gast weet zo bij welke sessie hij hoort en vindt hem later
  // in de lijst terug. Klein: het id en de naam, geen spelers, geen adressen.
  _welkom(basis) {
    const s = this.cfg.sessie ? this.cfg.sessie() : null;
    return s && s.id ? { ...basis, sessie: { id: String(s.id), naam: String(s.naam || '') } } : basis;
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
    this._sluitLink(); // #589: het afscheid is geweest, de verbinding gaat dicht
  }
  tick(dt) {
    this._tickCommon(dt);
    if (!this.guest) return;
    // #589: een gast die zijn betrouwbare wachtrij structureel laat vollopen (tab op de achtergrond,
    // kanaal hapert) houdt anders voor altijd 32 berichten vast. Na een paar seconden gaat hij met een
    // gewoon afscheid weg; een gast met een oude missie/scène kan de hash-desync niet redden.
    const vol = this.rel.pending.length >= this.rel.maxPending;
    if (vol && this.overflowSinds == null) this.overflowSinds = this.now;
    else if (!vol) this.overflowSinds = null;
    if (this.overflowSinds != null && this.now - this.overflowSinds >= OVERFLOW_MAX_S) {
      console.warn(`samen spelen: de wachtrij van plek ${this.slot} zit ${OVERFLOW_MAX_S} s vol; de verbinding wordt verbroken`);
      this.leave();
      return;
    }
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
      // de kop draagt de tijd van dit moment (ms van de klok van de host) als de gast dat kent: dan weet hij precies wanneer de toestand gold, ook als de host
      // een beeld te laat is (een gast die het niet kent rekent met seq / SNAP_HZ en hoort bij een oudere host de teller)
      this._emit(encodeSnapshot(this.snapSeq, this.caps.includes('snaptijd') ? Math.round(this.now * 1000) : this.tickN, this.guest.lastInputSeq ?? 0, this.cfg.sim.snapshot()));
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
  announce(body) {
    if (!this.guest) return false;
    const ok = this.sendEvent(body);
    if (!ok) { // #589: niet stil laten verdwijnen; de volgende snapshot/desync of het afscheid neemt het over
      this.dropped++;
      if (!this._dropGemeld) { this._dropGemeld = true; console.warn('samen spelen: een betrouwbaar bericht paste niet in de wachtrij (de gast reageert niet)'); }
    }
    return ok;
  }
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
  constructor() { this.snaps = []; this.renderT = null; this.wall = 0; this.rate = 1; this.marks = []; }
  push(s) {
    const t = s.hostT;
    if (this.snaps.length && t <= this.snaps[this.snaps.length - 1].hostT) return false; // oud of dubbel
    this.snaps.push(s); if (this.snaps.length > 40) this.snaps.shift();
    this.rate = schatTempo(this.marks, this.wall, t, this.rate); // een host met weinig beelden per seconde loopt trager dan onze klok: de weergavetijd loopt in zijn tempo mee (#434)
    return true;
  }
  clear() { this.snaps.length = 0; this.renderT = null; this.marks.length = 0; this.rate = 1; }
  get latestT() { return this.snaps.length ? this.snaps[this.snaps.length - 1].hostT : null; }
  // schuif de weergavetijd op met dt, zacht richting laatste - vertraging; blijft er een snapshot weg, dan voorspelt sample() even door (#434)
  advance(dt) {
    const L = this.latestT; if (L == null) return null;
    this.wall += dt;
    this.renderT = volgTijd(this.renderT, L, dt, INTERP_DELAY, this.rate);
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
        return mix(a, b, Math.max(0, k)); // k boven 1: voorspellen met de snelheid tussen de laatste twee (net/interp.js)
      }
    }
    return s[s.length - 1];
  }
  // aantal seconden dat we al zonder nieuwe toestand zitten (voor de lag-balk)
  starved(hostNow) { return this.latestT == null ? 0 : Math.max(0, hostNow - this.latestT); }
}
function mix(a, b, k) {
  const pa = new Map(a.players.map((p) => [p.slot, p]));
  const players = b.players.map((pb) => {
    const p = pa.get(pb.slot);
    if (!p || pb.vehicle !== p.vehicle || pb.alive !== p.alive || pb.inVeh !== p.inVeh) return pb; // geen interpolatie over een sprong (instappen, respawn)
    return mixPositie(p, pb, k, 'y', ['z']);
  });
  return { ...b, players, entities: mixEntiteiten(a.entities, b.entities, k), hostT: lerp(a.hostT, b.hostT, Math.min(1, k)) };
}

export class ClientSession extends Base {
  // cfg: { info, token? }
  constructor(link, cfg, rand) {
    super(link, 'client', rand);
    this.cfg = cfg; this.slot = null; this.seed = null; this.caps = []; this.token = cfg.token || null;
    this.sessie = null; // { id, naam }: bij welke sessie deze gast hoort (#450), uit het welkom
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
      if (m.body.sessie && typeof m.body.sessie.id === 'string') this.sessie = { id: m.body.sessie.id.slice(0, 16), naam: typeof m.body.sessie.naam === 'string' ? m.body.sessie.naam.slice(0, 24) : '' }; // bij welke sessie je hoort (#450)
      this.lastExtraSeq = null; this.slot = m.body.slot; this.seed = m.body.seed; this.caps = Array.isArray(m.body.caps) ? m.body.caps : []; this.token = m.body.token; this.joined = true;
      if (m.body.resumed) this.buf.clear();
      this._setStatus('ok');
    } else if (h.type === T.SNAP && this.joined) {
      const s = decodeSnapshot(buf, this.looks || (this.looks = new Map())); if (!s) return; // looks: het laatst bekende uiterlijk per voertuig (#428)
      if (this.lastSnapSeq != null && !seqNewer(s.seq, this.lastSnapSeq)) return;
      this._unwrapped = this.lastSnapSeq == null ? s.seq : this._unwrapped + seqDiff(s.seq, this.lastSnapSeq);
      this.lastSnapSeq = s.seq;
      s.hostT = this.caps.includes('snaptijd') ? s.tick / 1000 : this._unwrapped / SNAP_HZ; // de tijd uit de kop; zonder: de host stuurt SNAP_HZ snapshots per seconde
      this.buf.push(s);
      if (this.status === 'lag') this._setStatus('ok');
    } else if (h.type === T.EXTRA && this.joined) {
      const x = decodeExtra(buf); if (!x) return;
      if (this.lastExtraSeq != null && !seqNewer(x.seq, this.lastExtraSeq)) return; // oud of dubbel
      this.lastExtraSeq = x.seq;
      if (this.onextra) this.onextra(x.payload, x.seq);
    } else if (h.type === T.BYE) { this.joined = false; this._setStatus('verbroken'); this._sluitLink(); }
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
  leave() { this._emit(encodeSimple(T.BYE, 0, 0, 0)); this.joined = false; this._setStatus('verbroken'); this._sluitLink(); }
}

export { PROTO };


