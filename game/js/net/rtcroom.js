// Samen spelen (#95): WebRTC-datakanaal via een kamercode. De host maakt een
// aanbod, versleutelt het met de kamercode (sigcrypto.js) en zet het op de
// openbare brokers (brokers.js); de gast haalt het op, antwoordt versleuteld en
// het kanaal gaat direct tussen de twee spelers, met openbare STUN-servers om
// door routers heen te komen (netconfig.js). Werkt in browser en Electron.
// Dit wordt alleen gestart na de toestemming van de speler (net/consent.js).
// pcFactory en signaler worden meegegeven, zodat tests geen echt netwerk raken.

import { encryptBlob, decryptBlob, topicFor } from './sigcrypto.js';
import { ICE_SERVERS, TIMEOUTS } from './netconfig.js';

export const rtcSupported = () => typeof RTCPeerConnection !== 'undefined';
const MAX_SDP = 20000;

export const defaultPc = (iceServers) => new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 0 });

function waitGathered(pc, ms) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    let t;
    const done = () => { pc.removeEventListener('icegatheringstatechange', on); clearTimeout(t); resolve(); };
    const on = () => { if (pc.iceGatheringState === 'complete') done(); };
    t = setTimeout(done, ms);
    pc.addEventListener('icegatheringstatechange', on);
  });
}

// Transport met de vorm van memtransport: send(bytes), onmessage, isOpen(), close().
function wrapChannel(ch, pc) {
  ch.binaryType = 'arraybuffer';
  const tr = {
    onmessage: null, onstate: null, dispose() {},
    isOpen: () => ch.readyState === 'open',
    send(bytes) { if (ch.readyState !== 'open') return false; try { ch.send(bytes); return true; } catch (e) { return false; } },
    close() { try { ch.close(); pc.close(); } catch (e) { /* al dicht */ } },
  };
  ch.onmessage = (e) => { if (tr.onmessage) tr.onmessage(new Uint8Array(e.data)); };
  ch.onopen = () => { if (tr.onstate) tr.onstate('open'); };
  ch.onclose = () => { if (tr.onstate) tr.onstate('closed'); };
  return tr;
}

function readSdp(text, type) {
  let o; try { o = JSON.parse(text); } catch (e) { return null; }
  if (!o || o.type !== type || typeof o.sdp !== 'string' || o.sdp.length > MAX_SDP) return null;
  return o;
}

// env: { pcFactory, signaler (MultiSignaler-achtig), iceServers?, timeouts?, onstate(state, info) }
// Geeft { transport, cancel() }. onstate: 'wacht' | 'verbinden' | 'open' | 'fout' (info = Nederlandse tekst).
export async function hostRoom(room, env) {
  const { pcFactory = defaultPc, signaler, iceServers = ICE_SERVERS, timeouts = TIMEOUTS, onstate = () => {} } = env;
  const pc = pcFactory(iceServers);
  const ch = pc.createDataChannel('gde-coop', { ordered: false, maxRetransmits: 0 });
  const transport = wrapChannel(ch, pc);
  let ended = false, timer = null;
  const fail = (txt) => { if (!ended) { ended = true; onstate('fout', txt); cancel(); } };
  const cancel = () => { ended = true; clearTimeout(timer); try { signaler.close(); } catch (e) { /* weg */ } if (!transport.isOpen()) { try { pc.close(); } catch (e) { /* weg */ } } };
  const opened = transport.onstate;
  transport.onstate = (s) => { if (s === 'open') { ended = true; clearTimeout(timer); try { signaler.close(); } catch (e) { /* weg */ } onstate('open'); } if (opened) opened(s); };
  // Eerst wachten tot een medespeler de code gebruikt (lang: tijd om de code door te geven), daarna pas de tijd om echt te verbinden.
  // Eén timer voor allebei liet de uitnodiging na 30 s verlopen, ook als de vriend de code nog moest overnemen.
  const MELDING = 'Er kwam geen verbinding tot stand. Controleer de code en probeer het opnieuw.';
  timer = setTimeout(() => fail(MELDING), timeouts.wait ?? timeouts.connect);
  await pc.setLocalDescription(await pc.createOffer());
  await waitGathered(pc, timeouts.gather);
  const blob = await encryptBlob(room, JSON.stringify({ type: 'offer', sdp: pc.localDescription.sdp }));
  signaler.host(await topicFor(room), blob, async (ablob) => {
    if (ended) return;
    const txt = await decryptBlob(room, ablob);
    const ans = txt && readSdp(txt, 'answer');
    if (!ans) return; // verkeerde code of geknoeid bericht: negeren
    onstate('verbinden');
    clearTimeout(timer); timer = setTimeout(() => fail(MELDING), timeouts.connect); // het antwoord is binnen: nu telt de verbindingstijd
    try { await pc.setRemoteDescription({ type: 'answer', sdp: ans.sdp }); } catch (e) { fail('Het antwoord van je medespeler klopte niet.'); }
  });
  onstate('wacht');
  return { transport, cancel };
}

export async function joinRoom(room, env) {
  const { pcFactory = defaultPc, signaler, iceServers = ICE_SERVERS, timeouts = TIMEOUTS, onstate = () => {} } = env;
  const pc = pcFactory(iceServers);
  let ended = false, transport = null;
  const fail = (txt) => { if (!ended) { ended = true; onstate('fout', txt); cancel(); } };
  const cancel = () => { ended = true; clearTimeout(timer); try { signaler.close(); } catch (e) { /* weg */ } if (!transport || !transport.isOpen()) { try { pc.close(); } catch (e) { /* weg */ } } };
  const timer = setTimeout(() => fail('Er kwam geen verbinding tot stand. Controleer de code en of het spel open staat.'), timeouts.connect);
  const opened = new Promise((resolve) => {
    pc.ondatachannel = (e) => {
      transport = wrapChannel(e.channel, pc);
      const prev = transport.onstate;
      transport.onstate = (s) => { if (s === 'open') { ended = true; clearTimeout(timer); try { signaler.close(); } catch (er) { /* weg */ } onstate('open'); } if (prev) prev(s); };
      resolve(transport);
    };
  });
  onstate('wacht');
  signaler.join(await topicFor(room), async (blob, reply) => {
    if (ended) return;
    const txt = await decryptBlob(room, blob);
    const off = txt && readSdp(txt, 'offer');
    if (!off) { fail('De kamercode klopt niet, of het bericht is beschadigd.'); return; }
    try {
      onstate('verbinden');
      await pc.setRemoteDescription({ type: 'offer', sdp: off.sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await waitGathered(pc, timeouts.gather);
      reply(await encryptBlob(room, JSON.stringify({ type: 'answer', sdp: pc.localDescription.sdp })));
    } catch (e) { fail('Het aanbod klopte niet.'); }
  });
  return { opened, cancel };
}
