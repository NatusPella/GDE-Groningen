// Samen spelen (#95): serverloze signalering via openbare brokers (in de stijl van
// Trystero): BitTorrent-trackers (WebSocket, JSON), MQTT-brokers (WebSocket,
// binair) en als terugval PeerJS Cloud. Een broker ziet alleen versleutelde blobs
// (net/sigcrypto.js); de kamercode zelf gaat nooit over de lijn, alleen een
// daaruit afgeleid onderwerp. Er wordt niets anders verstuurd: geen telemetrie.
//
// Alle backends hebben dezelfde vorm:
//   host:  new Backend(opts).host(topic, offerBlob, onAnswer(blob))
//   gast:  new Backend(opts).join(topic, onOffer(blob, reply(answerBlob)))
//   status: 'bezig' | 'ok' | 'fout' (onstatus), close()
// opts = { url, socket(url) -> WebSocket-achtig, timers: { setTimeout, clearTimeout, setInterval, clearInterval }, rand }
// Zo draait alles in tests tegen een nepsocket; hier staat geen echte netwerkcode.

const bin = (hex) => hex.match(/../g).map((h) => String.fromCharCode(parseInt(h, 16))).join(''); // hex → binaire string voor info_hash
const rid = (rand, n = 20) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(97 + Math.floor(rand() * 26)); return s; };
const defaultTimers = () => ({ setTimeout: (...a) => setTimeout(...a), clearTimeout: (...a) => clearTimeout(...a), setInterval: (...a) => setInterval(...a), clearInterval: (...a) => clearInterval(...a) });

const HERSTEL_MAX = 6, HERSTEL_WACHT = 2000; // pogingen en eerste wachttijd (ms) na een weggevallen broker

class Backend {
  constructor(name, opts) {
    this.name = name; this.url = opts.url; this.open = opts.socket; this.timers = opts.timers || defaultTimers();
    this.rand = opts.rand || Math.random; this.status = 'bezig'; this.onstatus = null; this.ws = null; this.closed = false; this.ivs = [];
  }
  _set(s) { if (s === 'ok') this.pogingen = 0; if (this.status !== s) { this.status = s; if (this.onstatus) this.onstatus(this.name, s); } }
  // Een broker die wegvalt terwijl de host wacht (de uitnodiging staat minuten open) wordt opnieuw geprobeerd, met oplopende wachttijd:
  // een verbinding die stilletjes dicht was, liet de uitnodiging anders onbereikbaar terwijl de status 'ok' bleef.
  _herstel() {
    if (this.closed) return;
    this.pogingen = (this.pogingen || 0) + 1;
    if (this.pogingen > HERSTEL_MAX) { this._set('fout'); return; }
    for (const i of this.ivs) this.timers.clearInterval(i);
    this.ivs = []; this._set('bezig');
    this._hersteld = this.timers.setTimeout(() => { if (!this.closed) this._connect(...this._args); }, HERSTEL_WACHT * 2 ** (this.pogingen - 1));
  }
  _connect(timeoutMs, onopen, onmessage) {
    this._args = [timeoutMs, onopen, onmessage];
    let ws;
    try { ws = this.open(this.url); } catch (e) { this._set('fout'); return; }
    this.ws = ws;
    const t = this.timers.setTimeout(() => { if (this.status === 'bezig') { this._set('fout'); this.close(); } }, timeoutMs);
    ws.onopen = () => { if (!this.closed) onopen(); };
    ws.onmessage = (e) => { if (!this.closed) onmessage(e.data); };
    const weg = () => { this.timers.clearTimeout(t); if (this.closed || ws !== this.ws) return; if (this.status === 'ok' || this.pogingen > 0) this._herstel(); else this._set('fout'); };
    ws.onerror = weg;
    ws.onclose = weg;
    this._t = t;
  }
  _every(ms, f) { this.ivs.push(this.timers.setInterval(f, ms)); }
  // een broker die net dichtging mag geen fout in de console geven: sturen op een gesloten socket is dan stil niets (readyState 2 en 3)
  _send(data) { if (!this.ws || this.ws.readyState > 1) return false; try { this.ws.send(data); return true; } catch (e) { return false; } }
  close() {
    this.closed = true;
    for (const i of this.ivs) this.timers.clearInterval(i);
    this.ivs = [];
    if (this._t) this.timers.clearTimeout(this._t);
    if (this._hersteld) this.timers.clearTimeout(this._hersteld);
    try { if (this.ws) this.ws.close(); } catch (e) { /* al dicht */ }
  }
}

// ------------------------------------------------------------------ BitTorrent-tracker
export class TrackerBackend extends Backend {
  constructor(opts) { super('tracker', opts); this.peerId = rid(this.rand); }
  _announce(extra) {
    const m = { action: 'announce', info_hash: this.hash, peer_id: this.peerId, numwant: 5, uploaded: 0, downloaded: 0, left: 1, ...extra };
    this._send(JSON.stringify(m));
  }
  host(topic, offerBlob, onAnswer, timeoutMs = 6000) {
    this.hash = bin(topic); this.offerId = rid(this.rand);
    const offer = () => this._announce({ event: 'started', offers: [{ offer_id: this.offerId, offer: { type: 'offer', sdp: offerBlob } }] });
    this._connect(timeoutMs, () => { offer(); this._every(15000, offer); }, (data) => {
      let m; try { m = JSON.parse(data); } catch (e) { return; }
      if (!m || m.info_hash !== this.hash) return;
      this._set('ok');
      if (m.answer && m.offer_id === this.offerId && m.answer.sdp) onAnswer(m.answer.sdp);
    });
  }
  join(topic, onOffer, timeoutMs = 6000) {
    this.hash = bin(topic);
    const seen = new Set();
    const ask = () => this._announce({ event: 'started', offers: [] });
    this._connect(timeoutMs, () => { ask(); this._every(10000, ask); }, (data) => {
      let m; try { m = JSON.parse(data); } catch (e) { return; }
      if (!m || m.info_hash !== this.hash) return;
      this._set('ok');
      if (m.offer && m.offer.sdp && m.offer_id && m.peer_id && !seen.has(m.offer_id)) {
        seen.add(m.offer_id);
        onOffer(m.offer.sdp, (answerBlob) => this._announce({ to_peer_id: m.peer_id, offer_id: m.offer_id, answer: { type: 'answer', sdp: answerBlob } }));
      }
    });
  }
}

// ------------------------------------------------------------------ MQTT 3.1.1 over WebSocket
const te = new TextEncoder(), td = new TextDecoder();
function varlen(n) { const out = []; do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; out.push(b); } while (n > 0); return out; }
function str(s) { const b = te.encode(s); return [b.length >> 8, b.length & 255, ...b]; }
function packet(first, body) { const b = Uint8Array.from(body); const h = [first, ...varlen(b.length)]; const out = new Uint8Array(h.length + b.length); out.set(h); out.set(b, h.length); return out; }

export const mqtt = {
  connect: (clientId, keepalive = 30) => packet(0x10, [...str('MQTT'), 4, 2, keepalive >> 8, keepalive & 255, ...str(clientId)]),
  subscribe: (id, topic) => packet(0x82, [id >> 8, id & 255, ...str(topic), 0]),
  publish: (topic, payload, retain = false) => { const t = str(topic), p = te.encode(payload); return packet(0x30 | (retain ? 1 : 0), [...t, ...p]); },
  ping: () => Uint8Array.from([0xc0, 0]),
  // een of meer pakketten uit één frame; onbekende of afgekapte pakketten worden overgeslagen
  parse(u8) {
    const out = []; let o = 0;
    while (o < u8.length) {
      const first = u8[o++]; let mult = 1, len = 0, b, guard = 0;
      do { if (o >= u8.length || guard++ > 3) return out; b = u8[o++]; len += (b & 127) * mult; mult *= 128; } while (b & 128);
      if (o + len > u8.length) return out;
      const body = u8.subarray(o, o + len); o += len;
      const type = first >> 4;
      if (type === 2) out.push({ type: 'connack', rc: body[1] });
      else if (type === 9) out.push({ type: 'suback' });
      else if (type === 13) out.push({ type: 'pingresp' });
      else if (type === 3) {
        const tl = (body[0] << 8) | body[1];
        const qos = (first >> 1) & 3; const start = 2 + tl + (qos ? 2 : 0);
        out.push({ type: 'publish', topic: td.decode(body.subarray(2, 2 + tl)), payload: td.decode(body.subarray(start)) });
      }
    }
    return out;
  },
};

export class MqttBackend extends Backend {
  constructor(opts) { super('mqtt', opts); this.clientId = 'gde' + rid(this.rand, 12); }
  _run(timeoutMs, onReady, onPublish) {
    this._connect(timeoutMs, () => { this._send(mqtt.connect(this.clientId)); }, (data) => {
      const u8 = typeof data === 'string' ? te.encode(data) : new Uint8Array(data);
      for (const p of mqtt.parse(u8)) {
        if (p.type === 'connack') { if (p.rc !== 0) { this._set('fout'); return; } this._set('ok'); this._every(20000, () => this._send(mqtt.ping())); onReady(); }
        else if (p.type === 'publish') onPublish(p);
      }
    });
  }
  host(topic, offerBlob, onAnswer, timeoutMs = 6000) {
    this.base = `gde/coop/${topic}`; this.hosting = true;
    this._run(timeoutMs, () => {
      this._send(mqtt.subscribe(1, this.base + '/a'));
      this._send(mqtt.publish(this.base + '/o', offerBlob, true)); // vastgehouden: de gast mag later komen
    }, (p) => { if (p.topic === this.base + '/a' && p.payload) onAnswer(p.payload); });
  }
  join(topic, onOffer, timeoutMs = 6000) {
    this.base = `gde/coop/${topic}`;
    let got = false;
    this._run(timeoutMs, () => this._send(mqtt.subscribe(1, this.base + '/o')), (p) => {
      if (p.topic !== this.base + '/o' || !p.payload || got) return;
      got = true;
      onOffer(p.payload, (answer) => this._send(mqtt.publish(this.base + '/a', answer, false)));
    });
  }
  close() {
    // het vastgehouden aanbod opruimen (een leeg bericht wist het)
    try { if (this.base && this.ws && this.hosting && !this.closed) this._send(mqtt.publish(this.base + '/o', '', true)); } catch (e) { /* weg */ }
    super.close();
  }
}

// ------------------------------------------------------------------ PeerJS Cloud (alleen terugval)
// Het PeerJS-signaleringsprotocol: wie zich aanmeldt met een id krijgt OFFER/ANSWER-berichten
// van elders doorgestuurd. Wij sturen er onze versleutelde blobs doorheen.
export class PeerJsBackend extends Backend {
  constructor(opts) { super('peerjs', opts); this.cfg = opts.cfg; this.id = null; }
  _url(id) { const c = this.cfg; return `${c.secure ? 'wss' : 'ws'}://${c.host}:${c.port}${c.path}peerjs?key=${c.key}&id=${id}&token=${rid(this.rand, 12)}`; }
  host(topic, offerBlob, onAnswer, timeoutMs = 6000) {
    this.id = 'gde' + topic.slice(0, 24); this.url = this._url(this.id);
    this._connect(timeoutMs, () => { this._every(5000, () => { try { this._send(JSON.stringify({ type: 'HEARTBEAT' })); } catch (e) { /* weg */ } }); }, (data) => {
      let m; try { m = JSON.parse(data); } catch (e) { return; }
      if (m.type === 'OPEN') this._set('ok');
      else if (m.type === 'OFFER' && m.payload && m.payload.gde === 'hallo' && m.src) this._send(JSON.stringify({ type: 'OFFER', dst: m.src, payload: { gde: 'aanbod', blob: offerBlob } }));
      else if (m.type === 'ANSWER' && m.payload && m.payload.gde === 'antwoord' && m.payload.blob) onAnswer(m.payload.blob);
    });
  }
  join(topic, onOffer, timeoutMs = 6000) {
    const hostId = 'gde' + topic.slice(0, 24);
    this.id = 'gde' + rid(this.rand, 16); this.url = this._url(this.id);
    let got = false;
    this._connect(timeoutMs, () => {}, (data) => {
      let m; try { m = JSON.parse(data); } catch (e) { return; }
      if (m.type === 'OPEN') { this._set('ok'); this._send(JSON.stringify({ type: 'OFFER', dst: hostId, payload: { gde: 'hallo' } })); }
      else if (m.type === 'OFFER' && m.payload && m.payload.gde === 'aanbod' && m.payload.blob && !got) {
        got = true;
        onOffer(m.payload.blob, (answer) => this._send(JSON.stringify({ type: 'ANSWER', dst: hostId, payload: { gde: 'antwoord', blob: answer } })));
      }
    });
  }
}

// ------------------------------------------------------------------ alles tegelijk, PeerJS als terugval
// cfg = netconfig; env = { socket, timers, rand }. onstatus(naam, status) voor de UI.
export class MultiSignaler {
  constructor(cfg, env, { fallbackAfter = 8000, brokerTimeout = 6000 } = {}) {
    this.cfg = cfg; this.env = env; this.fallbackAfter = fallbackAfter; this.brokerTimeout = brokerTimeout;
    this.backends = []; this.fallback = null; this.onstatus = null; this.timers = env.timers || defaultTimers(); this.fbTimer = null; this.done = false;
  }
  _make() {
    const mk = (Cls, url) => { const b = new Cls({ ...this.env, url }); b.onstatus = (n, s) => { if (this.onstatus) this.onstatus(n + ' ' + url, s); this._check(); }; return b; };
    return [...this.cfg.TRACKERS.map((u) => mk(TrackerBackend, u)), ...this.cfg.MQTT_BROKERS.map((u) => mk(MqttBackend, u))];
  }
  _check() {
    if (this.done || this.fallback) return;
    if (this.backends.length && this.backends.every((b) => b.status === 'fout')) this._startFallback();
  }
  _startFallback() {
    if (this.fallback || this.done) return;
    const b = new PeerJsBackend({ ...this.env, cfg: this.cfg.PEERJS, url: '' });
    b.onstatus = (n, s) => { if (this.onstatus) this.onstatus('peerjs', s); };
    this.fallback = b; this._go(b);
  }
  host(topic, offerBlob, onAnswer) {
    const answer = (blob) => { if (!this.done) { this.done = true; onAnswer(blob); this.close(); } };
    this._go = (b) => b.host(topic, offerBlob, answer, this.brokerTimeout);
    this.backends = this._make();
    for (const b of this.backends) b.host(topic, offerBlob, answer, this.brokerTimeout);
    this.fbTimer = this.timers.setTimeout(() => { if (!this.backends.some((b) => b.status === 'ok')) this._startFallback(); }, this.fallbackAfter);
    this.hosting = true; for (const b of this.backends) b.hosting = true;
  }
  join(topic, onOffer) {
    const offer = (blob, reply) => { if (!this.done) { this.done = true; onOffer(blob, (a) => { reply(a); this.timers.setTimeout(() => this.close(), 1500); }); } };
    this._go = (b) => b.join(topic, offer, this.brokerTimeout);
    this.backends = this._make();
    for (const b of this.backends) b.join(topic, offer, this.brokerTimeout);
    this.fbTimer = this.timers.setTimeout(() => { if (!this.backends.some((b) => b.status === 'ok')) this._startFallback(); }, this.fallbackAfter);
  }
  close() {
    if (this.fbTimer) this.timers.clearTimeout(this.fbTimer);
    for (const b of this.backends) b.close();
    if (this.fallback) this.fallback.close();
  }
}
