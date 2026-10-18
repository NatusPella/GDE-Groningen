// Coöp fase 4 (#95): handmatige koppelcodes (game/js/net/signal.js): alleen
// lokaal netwerk, controlesom, kopieerrommel, geen externe adressen.
import assert from 'node:assert/strict';
import * as S from '../game/js/net/signal.js';

let n = 0;
const t = (name, f) => { f(); n++; };

const FP = 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89';
const SDP = [
  'v=0', 'o=- 123 2 IN IP4 127.0.0.1', 's=-', 't=0 0', 'a=group:BUNDLE 0',
  'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0',
  'a=ice-ufrag:Xk3d', 'a=ice-pwd:0123456789abcdefghijklmn', `a=fingerprint:sha-256 ${FP}`, 'a=setup:actpass', 'a=mid:0',
  'a=candidate:842163049 1 udp 1677729535 192.168.1.5 54321 typ host generation 0',
  'a=candidate:1 1 udp 2113937151 11111111-2222-3333-4444-555555555555.local 50000 typ host generation 0',
  'a=candidate:2 1 udp 1677729535 84.12.34.56 40000 typ srflx raddr 0.0.0.0 rport 0',
  'a=candidate:3 1 udp 2113937151 8.8.4.4 40001 typ host',
  'a=candidate:4 1 tcp 1518280447 192.168.1.5 9 typ host tcptype active',
].join('\r\n') + '\r\n';

t('LAN-adressen: privé, link-local, mDNS ja; openbaar nee', () => {
  for (const a of ['10.0.0.2', '192.168.178.20', '172.16.5.5', '172.31.0.1', '127.0.0.1', '169.254.1.1', 'abc.local', 'fe80::1', 'fd12::3', '::1']) assert.equal(S.isLanAddress(a), true, a);
  for (const a of ['8.8.8.8', '172.32.0.1', '84.12.34.56', '300.1.1.1', '2001:db8::1', '192.169.0.1']) assert.equal(S.isLanAddress(a), false, a);
});
t('extractSignal houdt alleen UDP-host-kandidaten van het lokale net', () => {
  const sig = S.extractSignal(SDP);
  assert.equal(sig.u, 'Xk3d'); assert.equal(sig.f, FP);
  assert.equal(sig.c.length, 2);
  assert.ok(sig.c.every((c) => !/8\.8\.4\.4|84\.12|srflx|tcp/.test(c)));
  assert.equal(S.extractSignal('v=0\r\n'), null);
});
t('rondreis: pack -> unpack geeft dezelfde bruikbare gegevens', () => {
  const sig = S.extractSignal(SDP), code = S.packSignal(sig, 'offer');
  assert.ok(code.startsWith('GDE1.O.')); assert.ok(code.length < 700, `lengte ${code.length}`);
  const r = S.unpackSignal(code);
  assert.equal(r.ok, true); assert.equal(r.kind, 'offer');
  assert.deepEqual(r.sig, sig);
  const sdp = S.buildSdp(r.sig, 'answer');
  assert.match(sdp, /a=setup:active/); assert.match(sdp, /a=candidate:842163049 1 udp 1677729535 192\.168\.1\.5 54321 typ host/);
  assert.equal(S.packSignal(sig, 'answer').split('.')[1], 'A');
});
t('geplakte code met spaties, regeleinden en weergave-blokken werkt', () => {
  const code = S.packSignal(S.extractSignal(SDP), 'offer');
  const shown = S.formatForDisplay(code);
  assert.ok(shown.includes('\n'));
  assert.equal(S.unpackSignal('  ' + shown + '\n').ok, true);
});
t('fouten krijgen Nederlandse tekst: leeg, vreemd, beschadigd, te lang', () => {
  const code = S.packSignal(S.extractSignal(SDP), 'offer');
  assert.match(S.unpackSignal('').reason, /niets/);
  assert.match(S.unpackSignal('hallo wereld').reason, /geen koppelcode/);
  const parts = code.split('.'); parts[2] = parts[2].slice(0, -3) + 'AAA';
  assert.match(S.unpackSignal(parts.join('.')).reason, /beschadigd/);
  assert.match(S.unpackSignal('x'.repeat(5000)).reason, /te lang/);
});
t('een gemaakte code met alleen een openbaar adres wordt geweigerd', () => {
  const sig = { u: 'Xk3d', p: '0123456789abcdefghijklmn', f: FP, c: ['candidate:1 1 udp 100 8.8.8.8 4000 typ host'] };
  // packSignal zelf filtert niet; unpack moet het toch weigeren
  const r = S.unpackSignal(S.packSignal(sig, 'offer'));
  assert.equal(r.ok, false); assert.match(r.reason, /lokale netwerk/);
});
t('geen onverwachte velden of rommel in kandidaten', () => {
  const sig = { u: 'Xk3d', p: '0123456789abcdefghijklmn', f: FP, c: ['candidate:1 1 udp 100 10.0.0.1 4000 typ host', 'candidate:1 1 udp 1 1.1.1.1 1 typ host'] };
  const r = S.unpackSignal(S.packSignal(sig, 'answer'));
  assert.equal(r.ok, true); assert.equal(r.sig.c.length, 1);
});
console.log(`net_signal_test: ${n}/${n} ok`);
