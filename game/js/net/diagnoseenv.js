// Samen spelen (#95): de echte metingen voor "Verbinding testen" in de browser/Electron (net/diagnose.js beoordeelt ze).
// Alles gebeurt pas nadat de speler op "Verbinding testen" drukt; er worden alleen de openbare servers uit
// net/netconfig.js bereikt, dezelfde als bij een uitnodiging, en er gaat niets van de speler mee.
import * as CONFIG from './netconfig.js';

// Is deze websocket-broker bereikbaar? (alleen de verbinding wordt geopend en weer gesloten)
function brokerBereikbaar(url, ms) {
  return new Promise((res) => {
    let ws;
    const klaar = (v) => { try { if (ws) ws.close(); } catch (e) { /* weg */ } res(v); };
    const t = setTimeout(() => klaar(false), ms);
    try { ws = new WebSocket(url); ws.onopen = () => { clearTimeout(t); klaar(true); }; ws.onerror = () => { clearTimeout(t); klaar(false); }; } catch (e) { clearTimeout(t); res(false); }
  });
}

// Eén STUN-meting: de publieke poorten (srflx) die de servers zien, vanaf één en dezelfde lokale poort
function stunMeting(urls, ms) {
  return new Promise((res) => {
    if (typeof RTCPeerConnection === 'undefined') return res({ poorten: [], bereikt: 0 });
    let pc; const poorten = [];
    const klaar = () => { try { if (pc) pc.close(); } catch (e) { /* weg */ } res({ poorten, bereikt: poorten.length ? 1 : 0 }); };
    const t = setTimeout(klaar, ms);
    try {
      pc = new RTCPeerConnection({ iceServers: urls.map((u) => ({ urls: u })) });
      pc.createDataChannel('t');
      pc.onicecandidate = (e) => {
        if (!e.candidate) { clearTimeout(t); return klaar(); }
        const m = / typ srflx /.test(e.candidate.candidate) && /^candidate:\S+ \d+ \w+ \d+ \S+ (\d+) /.exec(e.candidate.candidate);
        if (m) poorten.push(+m[1]);
      };
      pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => { clearTimeout(t); klaar(); });
    } catch (e) { clearTimeout(t); klaar(); }
  });
}

export function maakEnv({ api = null, ms = 6000 } = {}) {
  const brokerLijst = [...CONFIG.TRACKERS, ...CONFIG.MQTT_BROKERS];
  let desktop = null; // één meting voor UPnP en poort samen
  const desk = () => (desktop = desktop || api.diagnose());
  return {
    online: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    async brokers() {
      const r = await Promise.all(brokerLijst.map((u) => brokerBereikbaar(u, ms)));
      return { bereikt: r.filter(Boolean).length, totaal: r.length };
    },
    async stun() {
      // per server apart: wie antwoordt; daarna twee servers samen voor het NAT-type
      const per = await Promise.all(CONFIG.STUN_SERVERS.map((u) => stunMeting([u], ms)));
      const samen = await stunMeting(CONFIG.STUN_SERVERS.slice(0, 2), ms);
      return { bereikt: per.filter((p) => p.bereikt).length, totaal: per.length, poorten: samen.poorten };
    },
    upnp: api && api.diagnose ? async () => (await desk()).upnp : null,
    poort: api && api.diagnose ? async () => (await desk()).poort : null,
  };
}
