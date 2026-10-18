// Coöp online (#95): poort openen op de eigen router met UPnP (SSDP + SOAP) en
// NAT-PMP als terugval, en het externe adres uit de router zelf lezen. Geen
// STUN, geen IP-opzoekdienst, geen centrale server: alleen de router in het
// eigen huis wordt benaderd. Dit bestand is pure logica (berichten bouwen en
// lezen, en de volgorde van pogingen); de echte sockets komen van de
// aanroeper als `io` (desktop/coopcore.cjs), zodat dit met een nepper
// router getest kan worden. Draait alleen in Electron (browsers kunnen geen UPnP).

export const SSDP_ADDR = '239.255.255.250';
export const SSDP_PORT = 1900;
export const PMP_PORT = 5351;
export const SEARCH_TARGETS = [
  'urn:schemas-upnp-org:service:WANIPConnection:1',
  'urn:schemas-upnp-org:service:WANIPConnection:2',
  'urn:schemas-upnp-org:service:WANPPPConnection:1',
  'urn:schemas-upnp-org:device:InternetGatewayDevice:1',
];
const WAN_SERVICES = ['WANIPConnection:2', 'WANIPConnection:1', 'WANPPPConnection:1'];

export const UPNP_TEXT = {
  'geen-router': 'Je router antwoordt niet op automatisch poorten openen (UPnP staat uit of ontbreekt). Zet UPnP in je router aan, of speel op hetzelfde netwerk met de lokale code.',
  'cgnat': 'Je internetaanbieder deelt één adres met meerdere huizen (CGNAT). Een medespeler buiten je netwerk kan je daardoor niet bereiken. Speel op hetzelfde netwerk met de lokale code.',
  'geweigerd': 'Je router weigerde de poort te openen. Speel op hetzelfde netwerk met de lokale code, of zet UPnP in je router aan.',
  'onbereikbaar': 'Het adres van je router kon niet gelezen worden.',
};

// ---------------------------------------------------------------- SSDP
export function ssdpSearch(st) {
  return ['M-SEARCH * HTTP/1.1', `HOST: ${SSDP_ADDR}:${SSDP_PORT}`, 'MAN: "ssdp:discover"', 'MX: 2', `ST: ${st}`, '', ''].join('\r\n');
}
export function parseSsdp(text) {
  const t = String(text);
  if (!/^HTTP\/1\.1 200|^NOTIFY/i.test(t)) return null;
  const h = (name) => { const m = new RegExp(`^${name}:\\s*(.+)$`, 'im').exec(t); return m ? m[1].trim() : null; };
  const location = h('LOCATION'), st = h('ST') || h('NT');
  if (!location || !/^http:\/\//i.test(location)) return null;
  return { location, st };
}

// ---------------------------------------------------------------- beschrijving
const tag = (xml, name) => { const m = new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`, 'i').exec(xml); return m ? m[1] : null; };

// Zoekt de WAN-service in de apparaatbeschrijving. Geeft { serviceType, controlUrl } of null.
export function parseDeviceXml(xml, location) {
  const services = String(xml).match(/<service>[\s\S]*?<\/service>/gi) || [];
  const found = [];
  for (const s of services) {
    const type = tag(s, 'serviceType'), ctl = tag(s, 'controlURL');
    if (!type || !ctl) continue;
    const rank = WAN_SERVICES.findIndex((w) => type.endsWith(w));
    if (rank >= 0) found.push({ rank, serviceType: type, controlUrl: absolute(ctl, xml, location) });
  }
  found.sort((a, b) => a.rank - b.rank);
  return found.length ? { serviceType: found[0].serviceType, controlUrl: found[0].controlUrl } : null;
}
function absolute(ctl, xml, location) {
  if (/^http:\/\//i.test(ctl)) return ctl;
  const base = (tag(xml, 'URLBase') || '').replace(/\/$/, '');
  if (base) return base + (ctl.startsWith('/') ? ctl : '/' + ctl);
  const u = /^(http:\/\/[^/]+)/i.exec(location);
  return u ? u[1] + (ctl.startsWith('/') ? ctl : '/' + ctl) : ctl;
}

// ---------------------------------------------------------------- SOAP
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function soap(serviceType, action, args = {}) {
  const inner = Object.entries(args).map(([k, v]) => `<${k}>${esc(v)}</${k}>`).join('');
  return {
    headers: { 'Content-Type': 'text/xml; charset="utf-8"', SOAPAction: `"${serviceType}#${action}"` },
    body: `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:${action} xmlns:u="${serviceType}">${inner}</u:${action}></s:Body></s:Envelope>`,
  };
}
export function addPortMapping(serviceType, { extPort, intPort, intIp, proto = 'TCP', desc = 'GDE coop', lease = 7200 }) {
  return soap(serviceType, 'AddPortMapping', {
    NewRemoteHost: '', NewExternalPort: extPort, NewProtocol: proto, NewInternalPort: intPort, NewInternalClient: intIp,
    NewEnabled: 1, NewPortMappingDescription: desc, NewLeaseDuration: lease,
  });
}
export const deletePortMapping = (serviceType, { extPort, proto = 'TCP' }) => soap(serviceType, 'DeletePortMapping', { NewRemoteHost: '', NewExternalPort: extPort, NewProtocol: proto });
export const getExternalIp = (serviceType) => soap(serviceType, 'GetExternalIPAddress');

// Antwoord lezen: { ok, values } of { ok:false, code, desc }.
export function parseSoapResponse(xml, status = 200) {
  const x = String(xml);
  if (status >= 400 || /<(\w+:)?Fault>/i.test(x)) {
    const code = Number(tag(x, 'errorCode'));
    return { ok: false, code: Number.isFinite(code) ? code : 0, desc: tag(x, 'errorDescription') || '' };
  }
  const values = {};
  const re = /<(New\w+)>([^<]*)<\/\1>/g;
  let m; while ((m = re.exec(x))) values[m[1]] = m[2];
  return { ok: true, values };
}

// ---------------------------------------------------------------- adressen
export function isIPv4(a) {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(a || '');
  return !!m && m.slice(1).every((v) => +v <= 255 && String(+v) === v);
}
export function isPrivateOrShared(a) {
  if (!isIPv4(a)) return true;
  const [x, y] = a.split('.').map(Number);
  return x === 10 || x === 127 || x === 0 || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168) || (x === 169 && y === 254) || (x === 100 && y >= 64 && y <= 127) || x >= 224;
}
// Een extern adres dat zelf privé of CGNAT (100.64/10) is, is niet bereikbaar van buiten.
export const reachableFromOutside = (a) => isIPv4(a) && !isPrivateOrShared(a);

// ---------------------------------------------------------------- NAT-PMP (RFC 6886)
export const pmpExternalRequest = () => Uint8Array.from([0, 0]);
export function pmpMapRequest(proto, intPort, extPort, lifetime = 7200) {
  const b = new Uint8Array(12); const v = new DataView(b.buffer);
  v.setUint8(0, 0); v.setUint8(1, proto === 'UDP' ? 1 : 2); v.setUint16(4, intPort); v.setUint16(6, extPort); v.setUint32(8, lifetime);
  return b;
}
export const pmpDeleteRequest = (proto, intPort) => pmpMapRequest(proto, intPort, 0, 0);
export function pmpParse(buf) {
  if (!(buf instanceof Uint8Array) || buf.length < 8) return null;
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (v.getUint8(0) !== 0) return null;
  const op = v.getUint8(1), result = v.getUint16(2);
  if (op === 128) return buf.length >= 12 ? { kind: 'external', result, ip: `${buf[8]}.${buf[9]}.${buf[10]}.${buf[11]}` } : null;
  if (op === 129 || op === 130) return buf.length >= 16 ? { kind: 'map', proto: op === 129 ? 'UDP' : 'TCP', result, intPort: v.getUint16(8), extPort: v.getUint16(10), lifetime: v.getUint32(12) } : null;
  return null;
}

// ---------------------------------------------------------------- orchestratie
// io: { ssdp(message, ms) -> [antwoordtekst], httpGet(url) -> {status, body},
//       httpPost(url, headers, body) -> {status, body}, pmp(gatewayIp, bytes) -> bytes|null,
//       gateway() -> ip|null, localIp() -> ip }
// Geeft { ok, method, externalIp, externalPort, close() } of { ok:false, reason, text }.
export async function openPort(io, { port, proto = 'TCP', desc = 'GDE coop', lease = 7200, tries = 5 }) {
  const localIp = io.localIp();
  const upnp = await tryUpnp(io, { port, proto, desc, lease, tries, localIp });
  if (upnp.ok || upnp.reason === 'cgnat' || upnp.reason === 'geweigerd') {
    if (upnp.ok && !reachableFromOutside(upnp.externalIp)) return fail('cgnat');
    return upnp.ok ? upnp : fail(upnp.reason);
  }
  const pmp = await tryPmp(io, { port, proto, lease });
  if (pmp.ok && !reachableFromOutside(pmp.externalIp)) { await pmp.close(); return fail('cgnat'); }
  return pmp.ok ? pmp : fail(pmp.reason === 'geweigerd' ? 'geweigerd' : 'geen-router');
}
const fail = (reason) => ({ ok: false, reason, text: UPNP_TEXT[reason] || UPNP_TEXT.onbereikbaar });

async function tryUpnp(io, { port, proto, desc, lease, tries, localIp }) {
  let dev = null;
  for (const st of SEARCH_TARGETS) {
    let answers = [];
    try { answers = await io.ssdp(ssdpSearch(st), 2000); } catch (e) { answers = []; }
    for (const a of answers) {
      const r = parseSsdp(a); if (!r) continue;
      try {
        const d = await io.httpGet(r.location);
        const info = d && d.status < 400 ? parseDeviceXml(d.body, r.location) : null;
        if (info) { dev = info; break; }
      } catch (e) { /* volgende antwoord */ }
    }
    if (dev) break;
  }
  if (!dev) return { ok: false, reason: 'geen-router' };
  let ip;
  try {
    const q = getExternalIp(dev.serviceType), r = await io.httpPost(dev.controlUrl, q.headers, q.body);
    const p = parseSoapResponse(r.body, r.status);
    if (!p.ok || !p.values.NewExternalIPAddress) return { ok: false, reason: 'onbereikbaar' };
    ip = p.values.NewExternalIPAddress;
  } catch (e) { return { ok: false, reason: 'onbereikbaar' }; }
  let ext = port;
  for (let i = 0; i < tries; i++, ext++) {
    const m = addPortMapping(dev.serviceType, { extPort: ext, intPort: port, intIp: localIp, proto, desc, lease });
    let p;
    try { const r = await io.httpPost(dev.controlUrl, m.headers, m.body); p = parseSoapResponse(r.body, r.status); } catch (e) { return { ok: false, reason: 'onbereikbaar' }; }
    if (p.ok) {
      const closeReq = deletePortMapping(dev.serviceType, { extPort: ext, proto });
      return {
        ok: true, method: 'upnp', externalIp: ip, externalPort: ext,
        close: async () => { try { await io.httpPost(dev.controlUrl, closeReq.headers, closeReq.body); } catch (e) { /* router is al weg */ } },
      };
    }
    if (p.code === 725) { // alleen permanente mappings: lease 0 proberen
      const m0 = addPortMapping(dev.serviceType, { extPort: ext, intPort: port, intIp: localIp, proto, desc, lease: 0 });
      try { const r0 = parseSoapResponse((await io.httpPost(dev.controlUrl, m0.headers, m0.body)).body); if (r0.ok) { const c = deletePortMapping(dev.serviceType, { extPort: ext, proto }); return { ok: true, method: 'upnp', externalIp: ip, externalPort: ext, close: async () => { try { await io.httpPost(dev.controlUrl, c.headers, c.body); } catch (e) { /* weg */ } } }; } } catch (e) { /* door */ }
    }
    if (p.code !== 718) return { ok: false, reason: 'geweigerd' }; // 718 = poort bezet: volgende poort
  }
  return { ok: false, reason: 'geweigerd' };
}

async function tryPmp(io, { port, proto, lease }) {
  const gw = io.gateway && io.gateway();
  if (!gw || !io.pmp) return { ok: false, reason: 'geen-router' };
  let ext;
  try { ext = pmpParse(await io.pmp(gw, pmpExternalRequest())); } catch (e) { ext = null; }
  if (!ext || ext.kind !== 'external' || ext.result !== 0) return { ok: false, reason: 'geen-router' };
  let map;
  try { map = pmpParse(await io.pmp(gw, pmpMapRequest(proto, port, port, lease))); } catch (e) { map = null; }
  if (!map || map.kind !== 'map') return { ok: false, reason: 'geen-router' };
  if (map.result !== 0) return { ok: false, reason: 'geweigerd' };
  return {
    ok: true, method: 'nat-pmp', externalIp: ext.ip, externalPort: map.extPort,
    close: async () => { try { await io.pmp(gw, pmpDeleteRequest(proto, port)); } catch (e) { /* weg */ } },
  };
}
