// Coöp fase 4 (#95): transport in het geheugen voor tests (en voor lokale
// coöp zonder netwerk). Twee uiteinden met een gesimuleerde tijdlijn:
// vertraging, jitter, verlies en omwisseling van pakketten, deterministisch
// via een eigen RNG. Een uiteinde heeft de vorm van elk transport:
//   send(bytes, reliable), onmessage = (bytes) => {}, close(), isOpen().
// 'reliable' wordt hier niet extra gegarandeerd: de Reliable-laag in
// protocol.js doet dat, zodat verlies echt getest wordt.

export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

export function createLink({ latency = 0.03, jitter = 0, loss = 0, seed = 1 } = {}) {
  const rng = makeRng(seed);
  const net = { now: 0, queue: [], open: true, cfg: { latency, jitter, loss }, sent: 0, dropped: 0 };
  const end = (name, peerName) => ({
    name,
    onmessage: null,
    isOpen: () => net.open,
    close() { net.open = false; },
    send(bytes) {
      if (!net.open) return false;
      net.sent++;
      if (rng() < net.cfg.loss) { net.dropped++; return true; }
      const at = net.now + net.cfg.latency + rng() * net.cfg.jitter;
      net.queue.push({ at, to: peerName, bytes: bytes.slice() });
      return true;
    },
  });
  const ends = { a: end('a', 'b'), b: end('b', 'a') };
  // zet de tijd vooruit en lever wat aan de beurt is (op aankomsttijd, dus jitter wisselt om)
  function advance(dt) {
    net.now += dt;
    net.queue.sort((x, y) => x.at - y.at);
    while (net.queue.length && net.queue[0].at <= net.now) {
      const m = net.queue.shift();
      const h = ends[m.to].onmessage;
      if (net.open && h) h(m.bytes);
    }
  }
  return { a: ends.a, b: ends.b, advance, net, set: (cfg) => Object.assign(net.cfg, cfg), cut: () => { net.open = false; net.queue.length = 0; }, restore: () => { net.open = true; } };
}
