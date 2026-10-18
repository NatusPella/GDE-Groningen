// Coöp online (#95), main-proces: TCP-server (host) of -verbinding (gast), poort
// openen met UPnP/NAT-PMP via game/js/net/upnp.js. Geen Electron-import, zodat
// dit met gewone Node op localhost te testen is. Geen derde partijen: alleen de
// router in huis en de andere speler. Berichten zijn gebruikersgegevens-vrij.
const net = require('node:net');
const dgram = require('node:dgram');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PORT_MIN = 41000, PORT_MAX = 41999;
const KEY_TIMEOUT_MS = 5000;

function lanIp() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) return i.address;
  }
  return '127.0.0.1';
}

// Alleen de router in het eigen netwerk benaderen (geen willekeurige URL's).
function isLanHost(h) {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (!m) return false;
  const x = +m[1], y = +m[2];
  return x === 10 || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168) || (x === 169 && y === 254);
}

function request(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    if (u.protocol !== 'http:' || !isLanHost(u.hostname)) return reject(new Error('alleen lokaal netwerk'));
    const req = http.request({ host: u.hostname, port: u.port || 80, path: u.pathname + u.search, method, headers, timeout: 3000 }, (res) => {
      const chunks = []; let size = 0;
      res.on('data', (c) => { size += c.length; if (size > 262144) { req.destroy(); reject(new Error('te groot')); } else chunks.push(c); });
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('timeout', () => req.destroy(new Error('time-out')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function realIo(localIp) {
  return {
    localIp: () => localIp,
    gateway: () => { const p = localIp.split('.'); p[3] = '1'; return p.join('.'); },
    ssdp(message, ms) {
      return new Promise((resolve) => {
        const s = dgram.createSocket('udp4'); const out = [];
        const done = () => { try { s.close(); } catch (e) { /* dicht */ } resolve(out); };
        s.on('message', (m, rinfo) => { if (isLanHost(rinfo.address)) out.push(m.toString('utf8')); });
        s.on('error', done);
        s.send(message, 1900, '239.255.255.250', (err) => { if (err) done(); });
        setTimeout(done, ms);
      });
    },
    httpGet: (url) => request(url, 'GET', {}, null),
    httpPost: (url, headers, body) => request(url, 'POST', { ...headers, 'Content-Length': Buffer.byteLength(body) }, body),
    pmp(gw, bytes) {
      return new Promise((resolve) => {
        if (!isLanHost(gw)) return resolve(null);
        const s = dgram.createSocket('udp4');
        const done = (v) => { try { s.close(); } catch (e) { /* dicht */ } resolve(v); };
        s.on('message', (m) => done(new Uint8Array(m)));
        s.on('error', () => done(null));
        s.send(Buffer.from(bytes), 5351, gw, (err) => { if (err) done(null); });
        setTimeout(() => done(null), 1500);
      });
    },
  };
}

// opts: { gameDir, emit(kind, payload), localIp?, upnp? (false = geen router benaderen), io? (test) }
function createCoopCore(opts) {
  const emit = opts.emit || (() => {});
  let mods = null, server = null, sock = null, mapping = null, key = null, decoder = null, hostSide = false;

  async function load() {
    if (mods) return mods;
    const dir = path.join(opts.gameDir, 'js', 'net');
    const [upnp, pairing] = await Promise.all([import(pathToFileURL(path.join(dir, 'upnp.js')).href), import(pathToFileURL(path.join(dir, 'pairing.js')).href)]);
    mods = { upnp, pairing }; return mods;
  }
  const state = (s, extra) => emit('state', { state: s, ...extra });

  function attach(s, needKey) {
    sock = s; s.setNoDelay(true);
    decoder = new mods.pairing.FrameDecoder();
    let authed = !needKey;
    const timer = needKey ? setTimeout(() => { if (!authed) s.destroy(); }, KEY_TIMEOUT_MS) : null;
    s.on('data', (chunk) => {
      for (const f of decoder.push(new Uint8Array(chunk))) {
        if (!authed) {
          if (mods.pairing.checkKeyFrame(f, key)) { authed = true; clearTimeout(timer); state('open'); } else { s.destroy(); return; }
        } else emit('msg', f);
      }
      if (decoder.broken) s.destroy();
    });
    s.on('close', () => { clearTimeout(timer); if (sock === s) { sock = null; state('closed'); } });
    s.on('error', () => { /* close volgt */ });
  }

  async function host() {
    const m = await load();
    await stop();
    key = m.pairing.makeKey();
    hostSide = true;
    let port = 0;
    server = net.createServer((s) => {
      if (sock) { s.destroy(); return; } // één gast tegelijk
      attach(s, true);
    });
    for (let p = PORT_MIN; p <= PORT_MAX && !port; p += Math.floor(Math.random() * 7) + 1) {
      try { await new Promise((res, rej) => { server.once('error', rej); server.listen(p, '0.0.0.0', () => { server.removeListener('error', rej); res(); }); }); port = p; } catch (e) { /* bezet */ }
    }
    if (!port) { server = null; return { ok: false, text: 'Er is geen vrije poort gevonden.' }; }
    const ip = opts.localIp || lanIp();
    let ext = null;
    if (opts.upnp !== false) {
      try { ext = await m.upnp.openPort(opts.io || realIo(ip), { port }); } catch (e) { ext = { ok: false, reason: 'onbereikbaar', text: m.upnp.UPNP_TEXT.onbereikbaar }; }
    }
    if (ext && ext.ok) {
      mapping = ext;
      return { ok: true, online: true, method: ext.method, code: m.pairing.makeCode({ ip: ext.externalIp, port: ext.externalPort, key }), lanCode: m.pairing.makeCode({ ip, port, key }) };
    }
    return { ok: true, online: false, reason: ext ? ext.reason : 'uit', text: ext ? ext.text : '', code: m.pairing.makeCode({ ip, port, key }), lanCode: m.pairing.makeCode({ ip, port, key }) };
  }

  async function join(text) {
    const m = await load();
    const c = m.pairing.parseCode(text);
    if (!c.ok) return c;
    await stop();
    key = c.key; hostSide = false;
    return new Promise((resolve) => {
      const s = net.connect({ host: c.ip, port: c.port, timeout: 6000 });
      let settled = false;
      s.once('connect', () => {
        s.setTimeout(0); settled = true;
        attach(s, false);
        s.write(Buffer.from(m.pairing.frame(m.pairing.encodeKeyFrame(key))));
        state('open'); resolve({ ok: true });
      });
      const fail = () => { if (!settled) { settled = true; s.destroy(); resolve({ ok: false, reason: 'Geen verbinding met de host. Controleer de code en of de host het spel open heeft.' }); } };
      s.once('timeout', fail); s.once('error', fail);
    });
  }

  function send(bytes) {
    if (!sock || sock.destroyed || !mods) return false;
    try { sock.write(Buffer.from(mods.pairing.frame(bytes))); return true; } catch (e) { return false; }
  }

  async function stop() {
    if (sock) { try { sock.destroy(); } catch (e) { /* weg */ } sock = null; }
    if (server) { try { server.close(); } catch (e) { /* weg */ } server = null; }
    if (mapping) { const mp = mapping; mapping = null; try { await mp.close(); } catch (e) { /* router weg */ } }
  }
  return { host, join, send, stop, isConnected: () => !!sock };
}

module.exports = { createCoopCore, isLanHost, lanIp };
