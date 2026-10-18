// Coöp fase 4 (#95): dunne WebRTC-laag voor één datakanaal tussen twee spelers.
// Bewust ZONDER iceServers: geen STUN, geen TURN, geen signaling-server. Alleen
// host-kandidaten van het lokale netwerk; de koppelcodes (signal.js) wisselen
// de spelers zelf uit. Dit bestand is NIET getest in Node (daar bestaat geen
// RTCPeerConnection); de logica eromheen staat in signal.js en session.js.
// Het kanaal is onbetrouwbaar en ongeordend: de Reliable-laag (protocol.js)
// regelt volgorde en herhaling voor gebeurtenissen.

import { extractSignal, buildSdp, packSignal, unpackSignal } from './signal.js';

const GATHER_TIMEOUT_MS = 4000;

export const rtcSupported = () => typeof RTCPeerConnection !== 'undefined';

function newPeer() {
  // iceServers leeg: er wordt niets naar buiten het lokale netwerk gestuurd
  return new RTCPeerConnection({ iceServers: [], iceCandidatePoolSize: 0 });
}

function waitGathered(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const done = () => { pc.removeEventListener('icegatheringstatechange', on); clearTimeout(t); resolve(); };
    const on = () => { if (pc.iceGatheringState === 'complete') done(); };
    const t = setTimeout(done, GATHER_TIMEOUT_MS);
    pc.addEventListener('icegatheringstatechange', on);
  });
}

// Transport met de vorm van memtransport: send(bytes), onmessage, close(), isOpen().
function wrapChannel(ch, pc) {
  ch.binaryType = 'arraybuffer';
  const tr = {
    onmessage: null, onopen: null, onclose: null,
    isOpen: () => ch.readyState === 'open',
    send(bytes) { if (ch.readyState !== 'open') return false; try { ch.send(bytes); return true; } catch (e) { return false; } },
    close() { try { ch.close(); pc.close(); } catch (e) { /* al dicht */ } },
  };
  ch.onmessage = (e) => { if (tr.onmessage) tr.onmessage(new Uint8Array(e.data)); };
  ch.onopen = () => { if (tr.onopen) tr.onopen(); };
  ch.onclose = () => { if (tr.onclose) tr.onclose(); };
  return tr;
}

// Host: maakt de aanbiedingscode; daarna acceptAnswer(code) met het antwoord van de gast.
export async function hostStart() {
  if (!rtcSupported()) throw new Error('Dit spel kan hier geen directe verbinding maken.');
  const pc = newPeer();
  const ch = pc.createDataChannel('gde-coop', { ordered: false, maxRetransmits: 0 });
  const transport = wrapChannel(ch, pc);
  await pc.setLocalDescription(await pc.createOffer());
  await waitGathered(pc);
  const sig = extractSignal(pc.localDescription.sdp);
  if (!sig || !sig.c.length) { pc.close(); throw new Error('Geen adres op het lokale netwerk gevonden. Ben je verbonden met wifi of een kabel?'); }
  return {
    code: packSignal(sig, 'offer'),
    transport,
    async acceptAnswer(text) {
      const r = unpackSignal(text);
      if (!r.ok) return r;
      if (r.kind !== 'answer') return { ok: false, reason: 'Dit is de code van de host. Plak hier de code van de gast.' };
      await pc.setRemoteDescription({ type: 'answer', sdp: buildSdp(r.sig, 'answer') });
      return { ok: true };
    },
    cancel() { transport.close(); },
  };
}

// Gast: leest de code van de host en maakt het antwoord.
export async function guestJoin(text) {
  if (!rtcSupported()) throw new Error('Dit spel kan hier geen directe verbinding maken.');
  const r = unpackSignal(text);
  if (!r.ok) return r;
  if (r.kind !== 'offer') return { ok: false, reason: 'Dit is een antwoordcode. Plak hier de code van de host.' };
  const pc = newPeer();
  let transport = null;
  const opened = new Promise((resolve) => { pc.ondatachannel = (e) => { transport = wrapChannel(e.channel, pc); resolve(transport); }; });
  await pc.setRemoteDescription({ type: 'offer', sdp: buildSdp(r.sig, 'offer') });
  await pc.setLocalDescription(await pc.createAnswer());
  await waitGathered(pc);
  const sig = extractSignal(pc.localDescription.sdp);
  if (!sig || !sig.c.length) { pc.close(); return { ok: false, reason: 'Geen adres op het lokale netwerk gevonden. Ben je verbonden met wifi of een kabel?' }; }
  return { ok: true, code: packSignal(sig, 'answer'), opened, cancel() { if (transport) transport.close(); else pc.close(); } };
}
