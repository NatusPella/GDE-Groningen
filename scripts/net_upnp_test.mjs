// Coöp online (#95): UPnP/NAT-PMP-client (game/js/net/upnp.js) tegen een nepper-router.
// Geen echte sockets: io is een object dat SSDP/SOAP/NAT-PMP-berichten beantwoordt.
import assert from 'node:assert/strict';
import * as U from '../game/js/net/upnp.js';

let n = 0;
const t = async (name, f) => { await f(); n++; };

const SERVICE = 'urn:schemas-upnp-org:service:WANIPConnection:1';
const DEVICE_XML = `<?xml version="1.0"?><root><URLBase>http://192.168.1.1:5000</URLBase><device><serviceList>
<service><serviceType>urn:schemas-upnp-org:service:Layer3Forwarding:1</serviceType><controlURL>/l3</controlURL></service>
<service><serviceType>${SERVICE}</serviceType><controlURL>/ctl/IPConn</controlURL></service></serviceList></device></root>`;

function fakeRouter({ externalIp = '84.12.34.56', busy = [], upnp = true, deny = false, onlyPermanent = false, pmp = false, pmpIp = '84.12.34.56' } = {}) {
  const r = { mappings: new Map(), log: [] };
  r.io = {
    localIp: () => '192.168.1.20',
    gateway: () => '192.168.1.1',
    async ssdp(msg) {
      r.log.push('ssdp'); assert.match(msg, /^M-SEARCH \* HTTP\/1\.1\r\n/);
      return upnp ? ['HTTP/1.1 200 OK\r\nST: urn:schemas-upnp-org:service:WANIPConnection:1\r\nLOCATION: http://192.168.1.1:5000/rootDesc.xml\r\n\r\n'] : [];
    },
    async httpGet(url) { assert.equal(url, 'http://192.168.1.1:5000/rootDesc.xml'); return { status: 200, body: DEVICE_XML }; },
    async httpPost(url, headers, body) {
      assert.equal(url, 'http://192.168.1.1:5000/ctl/IPConn');
      const action = /#(\w+)"/.exec(headers.SOAPAction)[1];
      r.log.push(action);
      if (action === 'GetExternalIPAddress') return { status: 200, body: `<s:Envelope><s:Body><u:R><NewExternalIPAddress>${externalIp}</NewExternalIPAddress></u:R></s:Body></s:Envelope>` };
      const ext = Number(/<NewExternalPort>(\d+)</.exec(body)[1]);
      if (action === 'AddPortMapping') {
        assert.match(body, /<NewInternalClient>192\.168\.1\.20</);
        const lease = Number(/<NewLeaseDuration>(\d+)</.exec(body)[1]);
        const fault = (code) => ({ status: 500, body: `<s:Envelope><s:Body><s:Fault><detail><UPnPError><errorCode>${code}</errorCode><errorDescription>x</errorDescription></UPnPError></detail></s:Fault></s:Body></s:Envelope>` });
        if (deny) return fault(501);
        if (busy.includes(ext)) return fault(718);
        if (onlyPermanent && lease !== 0) return fault(725);
        r.mappings.set(ext, true); return { status: 200, body: '<u:AddPortMappingResponse/>' };
      }
      if (action === 'DeletePortMapping') { r.mappings.delete(ext); return { status: 200, body: '<ok/>' }; }
      throw new Error('onbekende actie ' + action);
    },
    async pmp(gw, bytes) {
      if (!pmp) return null;
      assert.equal(gw, '192.168.1.1');
      if (bytes[1] === 0) return Uint8Array.from([0, 128, 0, 0, 0, 0, 0, 1, ...pmpIp.split('.').map(Number)]);
      const out = new Uint8Array(16); const v = new DataView(out.buffer); const q = new DataView(bytes.buffer);
      v.setUint8(1, 128 + bytes[1]); v.setUint16(8, q.getUint16(4)); v.setUint16(10, q.getUint16(6)); v.setUint32(12, q.getUint32(8));
      r.log.push(q.getUint32(8) === 0 ? 'pmp-delete' : 'pmp-map'); return out;
    },
  };
  return r;
}

await t('SSDP: zoekbericht en antwoord', () => {
  assert.match(U.ssdpSearch(U.SEARCH_TARGETS[0]), /MAN: "ssdp:discover"/);
  assert.deepEqual(U.parseSsdp('HTTP/1.1 200 OK\r\nLocation: http://192.168.1.1:5000/d.xml\r\nST: x\r\n\r\n'), { location: 'http://192.168.1.1:5000/d.xml', st: 'x' });
  assert.equal(U.parseSsdp('HTTP/1.1 200 OK\r\nLOCATION: https://evil.example/x\r\n\r\n'), null, 'alleen http');
  assert.equal(U.parseSsdp('rommel'), null);
});
await t('apparaatbeschrijving: WAN-service en absolute control-URL', () => {
  const d = U.parseDeviceXml(DEVICE_XML, 'http://192.168.1.1:5000/rootDesc.xml');
  assert.deepEqual(d, { serviceType: SERVICE, controlUrl: 'http://192.168.1.1:5000/ctl/IPConn' });
  assert.equal(U.parseDeviceXml('<root/>', 'http://x/'), null);
  assert.equal(U.parseDeviceXml(DEVICE_XML.replace('<URLBase>http://192.168.1.1:5000</URLBase>', ''), 'http://10.0.0.1:80/d.xml').controlUrl, 'http://10.0.0.1:80/ctl/IPConn');
});
await t('SOAP: bericht en foutcode', () => {
  const m = U.addPortMapping(SERVICE, { extPort: 41000, intPort: 41000, intIp: '192.168.1.20' });
  assert.equal(m.headers.SOAPAction, `"${SERVICE}#AddPortMapping"`);
  assert.match(m.body, /<NewExternalPort>41000<\/NewExternalPort>/);
  assert.deepEqual(U.parseSoapResponse('<x><errorCode>718</errorCode><errorDescription>bezet</errorDescription></x>', 500), { ok: false, code: 718, desc: 'bezet' });
  assert.equal(U.parseSoapResponse('<NewExternalIPAddress>1.2.3.4</NewExternalIPAddress>').values.NewExternalIPAddress, '1.2.3.4');
});
await t('adressen: openbaar of niet', () => {
  for (const a of ['84.12.34.56', '8.8.8.8']) assert.equal(U.reachableFromOutside(a), true, a);
  for (const a of ['192.168.1.1', '10.1.1.1', '100.64.0.5', '100.127.255.1', '172.20.0.1', '169.254.1.1', '0.0.0.0', 'abc', '1.2.3']) assert.equal(U.reachableFromOutside(a), false, a);
  assert.equal(U.reachableFromOutside('100.128.0.1'), true);
});
await t('UPnP: poort geopend, extern adres uit de router, sluiten ruimt op', async () => {
  const r = fakeRouter();
  const res = await U.openPort(r.io, { port: 41000 });
  assert.equal(res.ok, true); assert.equal(res.method, 'upnp'); assert.equal(res.externalIp, '84.12.34.56'); assert.equal(res.externalPort, 41000);
  assert.ok(r.mappings.has(41000));
  await res.close(); assert.equal(r.mappings.size, 0);
});
await t('UPnP: bezette poort (718) schuift op naar de volgende', async () => {
  const r = fakeRouter({ busy: [41000, 41001] });
  const res = await U.openPort(r.io, { port: 41000 });
  assert.equal(res.externalPort, 41002); assert.ok(r.mappings.has(41002));
});
await t('UPnP: router die alleen permanente mappings kent (725)', async () => {
  const r = fakeRouter({ onlyPermanent: true });
  const res = await U.openPort(r.io, { port: 41000 });
  assert.equal(res.ok, true); await res.close(); assert.equal(r.mappings.size, 0);
});
await t('weigering geeft Nederlandse tekst en terugval op lokaal', async () => {
  const res = await U.openPort(fakeRouter({ deny: true }).io, { port: 41000 });
  assert.equal(res.ok, false); assert.equal(res.reason, 'geweigerd'); assert.match(res.text, /lokale code/);
});
await t('CGNAT: router meldt privé/gedeeld extern adres', async () => {
  const r = fakeRouter({ externalIp: '100.72.3.4' });
  const res = await U.openPort(r.io, { port: 41000 });
  assert.equal(res.ok, false); assert.equal(res.reason, 'cgnat'); assert.match(res.text, /CGNAT/);
});
await t('geen UPnP en geen NAT-PMP: geen-router', async () => {
  const res = await U.openPort(fakeRouter({ upnp: false }).io, { port: 41000 });
  assert.equal(res.ok, false); assert.equal(res.reason, 'geen-router'); assert.match(res.text, /UPnP/);
});
await t('NAT-PMP als terugval als UPnP ontbreekt; sluiten stuurt delete', async () => {
  const r = fakeRouter({ upnp: false, pmp: true });
  const res = await U.openPort(r.io, { port: 41000 });
  assert.equal(res.ok, true); assert.equal(res.method, 'nat-pmp'); assert.equal(res.externalIp, '84.12.34.56'); assert.equal(res.externalPort, 41000);
  await res.close(); assert.ok(r.log.includes('pmp-delete'));
  const c = await U.openPort(fakeRouter({ upnp: false, pmp: true, pmpIp: '10.9.9.9' }).io, { port: 41000 });
  assert.equal(c.reason, 'cgnat');
});
await t('NAT-PMP-pakketten', () => {
  const m = U.pmpMapRequest('TCP', 41000, 41000, 7200);
  assert.deepEqual([...m.slice(0, 2)], [0, 2]); assert.equal(new DataView(m.buffer).getUint32(8), 7200);
  assert.equal(U.pmpParse(new Uint8Array(3)), null);
  assert.deepEqual(U.pmpParse(Uint8Array.from([0, 128, 0, 0, 0, 0, 0, 1, 1, 2, 3, 4])), { kind: 'external', result: 0, ip: '1.2.3.4' });
});
console.log(`net_upnp_test: ${n}/${n} ok`);
