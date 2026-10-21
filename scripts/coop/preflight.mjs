// Samen spelen (#95): snelle controle op één computer vóór een speelsessie: internet, de openbare STUN-servers, de
// signaleringsbrokers, UPnP op je router, een vrije poort en (indicatief) het NAT-type. Hetzelfde oordeel als
// "Verbinding testen" in het spel (game/js/net/diagnose.js), maar zonder het spel te starten.
//   node scripts/coop/preflight.mjs [--out=<bestand>] [--json] [--geen-upnp] [--limiet=6000]
// Geen IP-adressen in de uitvoer (gemaskeerd). Raakt poort 9000 en de geïnstalleerde app niet; de UPnP-proef opent
// kort een tijdelijke poort tussen 41000 en 41999 en sluit die meteen weer. Exit 0 als de kamercode of het IP-adres
// zou moeten werken, 1 als geen van beide, 2 bij een fout in de controle zelf.
import dgram from 'node:dgram';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import tls from 'node:tls';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const LIMIET = Number(arg('limiet', 6000));

const D = await import(pathToFileURL(path.join(ROOT, 'game', 'js', 'net', 'diagnose.js')).href);
const CONFIG = await import(pathToFileURL(path.join(ROOT, 'game', 'js', 'net', 'netconfig.js')).href);

// ---------------------------------------------------------------- brokers: een TLS-verbinding naar de poort van de broker
function brokerBereikbaar(url) {
  const u = new URL(url);
  return new Promise((res) => {
    const s = tls.connect({ host: u.hostname, port: Number(u.port) || 443, servername: u.hostname, timeout: LIMIET }, () => { s.destroy(); res(true); });
    s.once('error', () => res(false));
    s.once('timeout', () => { s.destroy(); res(false); });
  });
}

// ---------------------------------------------------------------- STUN: een Binding Request over UDP (RFC 5389)
function stunBinding(socket, host, port, ms) {
  return new Promise((res) => {
    const id = Buffer.alloc(12); for (let i = 0; i < 12; i++) id[i] = Math.floor(Math.random() * 256);
    const req = Buffer.alloc(20); req.writeUInt16BE(0x0001, 0); req.writeUInt16BE(0, 2); req.writeUInt32BE(0x2112a442, 4); id.copy(req, 8);
    const t = setTimeout(() => { socket.off('message', on); res(null); }, ms);
    const on = (msg) => {
      if (msg.length < 20 || msg.readUInt16BE(0) !== 0x0101 || !msg.subarray(8, 20).equals(id)) return;
      clearTimeout(t); socket.off('message', on);
      for (let o = 20; o + 4 <= msg.length;) {
        const type = msg.readUInt16BE(o), len = msg.readUInt16BE(o + 2);
        if (type === 0x0020 && len >= 8 && msg[o + 5] === 0x01) return res(msg.readUInt16BE(o + 6) ^ 0x2112); // XOR-MAPPED-ADDRESS (IPv4): alleen de poort is nodig
        o += 4 + len + ((4 - (len % 4)) % 4);
      }
      res(null);
    };
    socket.on('message', on);
    dns.lookup(host, { family: 4 }).then((a) => socket.send(req, port, a.address), () => { clearTimeout(t); socket.off('message', on); res(null); });
  });
}
async function stunMeting() {
  const lijst = CONFIG.STUN_SERVERS.map((u) => { const [h, p] = u.replace(/^stun:/, '').split(':'); return [h, Number(p) || 3478]; });
  const sock = dgram.createSocket('udp4');
  await new Promise((r) => sock.bind(0, r));
  const poorten = [];
  const uitslag = [];
  // één voor één vanaf dezelfde lokale poort: zo zie je of de router per bestemming een andere poort geeft (streng NAT)
  for (const [h, p] of lijst) { const poort = await stunBinding(sock, h, p, LIMIET / 2); uitslag.push(poort != null); if (poort != null) poorten.push(poort); }
  sock.close();
  return { bereikt: uitslag.filter(Boolean).length, totaal: lijst.length, poorten };
}

// ---------------------------------------------------------------- UPnP en poort: dezelfde code als de app (desktop/coopcore.cjs)
async function desktopMeting() {
  const require = createRequire(import.meta.url);
  const { createCoopCore } = require(path.join(ROOT, 'desktop', 'coopcore.cjs'));
  const core = createCoopCore({ gameDir: path.join(ROOT, 'game'), upnp: !flag('geen-upnp'), emit: () => {} });
  return core.diagnose();
}

const metOpruim = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r({ fout: 'time-out' }), ms))]);

try {
  const t0 = Date.now();
  console.log('Controle van je verbinding voor samen spelen…\n');
  const brokers = await Promise.all([...CONFIG.TRACKERS, ...CONFIG.MQTT_BROKERS].map(brokerBereikbaar));
  const meting = {
    online: Object.values(os.networkInterfaces()).flat().some((i) => i && !i.internal),
    brokers: { bereikt: brokers.filter(Boolean).length, totaal: brokers.length },
    stun: await metOpruim(stunMeting(), LIMIET * 3),
    upnp: null, poort: null,
  };
  const d = await metOpruim(desktopMeting(), 20000);
  if (!d.fout) { meting.upnp = d.upnp; meting.poort = d.poort; } else { meting.upnp = { ok: false, reason: 'onbereikbaar' }; meting.poort = { ok: false }; }
  const b = D.beoordeel(meting);
  const teken = { ok: '[goed]    ', 'let-op': '[let op]  ', mis: '[mis]     ', overgeslagen: '[n.v.t.]  ' };
  const regels = [b.samenvatting, ''];
  for (const i of b.items) { regels.push(`${teken[i.status]}${i.titel}: ${i.tekst}`); if (i.tip) regels.push(`           Tip: ${i.tip}`); }
  regels.push('', 'Windows-firewall: bij de eerste keer uitnodigen vraagt Windows of "GDE Groningen" het netwerk mag gebruiken. Kies Toestaan (privé netwerk).', `Klaar in ${Math.round((Date.now() - t0) / 100) / 10} s. Dit is een indicatie; of jullie echt verbinden zie je pas in het spel.`);
  const tekst = D.maskeer(regels.join('\n')) + '\n';
  console.log(tekst);
  if (arg('out')) fs.writeFileSync(path.resolve(arg('out')), flag('json') ? JSON.stringify({ meting, kamer: b.kamer, direct: b.direct, items: b.items }, null, 1) : tekst);
  process.exit(b.kamer || b.direct ? 0 : 1);
} catch (e) {
  console.error('De controle zelf mislukte: ' + (e && e.message ? e.message : e));
  process.exit(2);
}
