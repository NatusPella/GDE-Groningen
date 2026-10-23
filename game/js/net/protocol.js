// Coöp fase 4 (#95): protocol bovenop de codec. Handshake-controle en een
// kleine betrouwbare laag (volgnummers, bevestiging, herhaling) voor
// gebeurtenissen, zodat het ook werkt op een onbetrouwbaar kanaal met verlies
// en omwisseling. Pure logica, geen DOM, geen netwerk.

import { T, encodeJson, decodeJson, encodeSimple, readHeader } from './codec.js';

export const PROTO = 2; // 2: bericht EXTRA (net/codec.js, coopextra.js): voetgangers, dieren, verkeerslichten en objecten van de host

// Volgnummers zijn u16 met omslag: a is eerder dan b?
export const seqDiff = (a, b) => ((a - b) << 16) >> 16; // >0: a is nieuwer dan b
export const seqNewer = (a, b) => seqDiff(a, b) > 0;

// De host weigert een gast met een ander spel, andere tegels of ander verhaal.
// local en remote: { game, proto, version, tiles, story }.
export function checkHandshake(local, remote) {
  if (!remote || remote.game !== local.game) return { ok: false, reason: 'spel' };
  if (remote.proto !== local.proto) return { ok: false, reason: 'protocol' };
  if (remote.version !== local.version) return { ok: false, reason: 'versie' };
  if (remote.tiles !== local.tiles) return { ok: false, reason: 'tegels' };
  if (remote.story !== local.story) return { ok: false, reason: 'verhaal' };
  return { ok: true, reason: null };
}
// Nederlandse melding voor het lobbyscherm.
export const REASON_TEXT = {
  spel: 'Dit is niet hetzelfde spel.',
  protocol: 'De versies van samen spelen passen niet bij elkaar.',
  versie: 'Andere versie van het spel. Installeer allebei dezelfde versie, het liefst de nieuwste, en probeer het opnieuw.',
  tegels: 'De wereldbestanden zijn verschillend. Werk beide spellen bij.',
  verhaal: 'Het verhaal is verschillend. Kies op beide kanten hetzelfde verhaal.',
  vol: 'De sessie zit al vol.',
  token: 'Deze verbinding kan niet hervat worden.',
  gesloten: 'De verbinding is gesloten. Zit het spel vol, of is het spel gestopt?',
};

// Betrouwbare gebeurtenissen: in volgorde, zonder dubbele aflevering.
export class Reliable {
  constructor({ rto = 0.2, maxPending = 32, maxAhead = 32 } = {}) {
    this.rto = rto; this.maxPending = maxPending; this.maxAhead = maxAhead;
    this.nextSend = 1; this.pending = []; // { seq, bytes, at }
    this.expected = 1; this.ahead = new Map();
  }
  // geeft false als de wachtrij vol is (de ander reageert niet)
  send(body, now, emit, tick = 0) {
    if (this.pending.length >= this.maxPending) return false;
    const seq = this.nextSend; this.nextSend = (this.nextSend + 1) & 0xffff || 1;
    const bytes = encodeJson(T.EVENT, seq, tick, 0, body);
    this.pending.push({ seq, bytes, at: now });
    emit(bytes); return true;
  }
  // bevestiging: cumulatief, alles vóór `expected` is binnen
  onAck(expected) {
    this.pending = this.pending.filter((p) => seqNewer(p.seq, expected - 1 & 0xffff));
  }
  tick(now, emit) {
    for (const p of this.pending) if (now - p.at >= this.rto) { p.at = now; emit(p.bytes); }
  }
  // ontvangt een EVENT; geeft de lijst nu af te leveren bodies; emit stuurt de ACK
  receive(msg, emit) {
    const out = [];
    const d = seqDiff(msg.seq, this.expected);
    if (d === 0) {
      out.push(msg.body); this.expected = (this.expected + 1) & 0xffff || 1;
      while (this.ahead.has(this.expected)) {
        out.push(this.ahead.get(this.expected)); this.ahead.delete(this.expected);
        this.expected = (this.expected + 1) & 0xffff || 1;
      }
    } else if (d > 0 && d <= this.maxAhead) this.ahead.set(msg.seq, msg.body);
    // d < 0: dubbel, alleen bevestigen
    emit(encodeSimple(T.ACK, 0, 0, this.expected));
    return out;
  }
  reset() { this.pending = []; this.ahead.clear(); }
}

export { T, decodeJson, readHeader };
