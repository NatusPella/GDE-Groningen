// Bijbanen: het startvlak (zeshoek), de badge en het kaarticoon krijgen een dekkende kleur (hertest 24-11). job.color is een
// CSS-accent (color-mix met var); een canvas en THREE.Color lezen dat niet, zodat het startvlak een witte zeshoek op de klinkers
// werd (Vismarkt). Elke baan heeft nu een #rrggbb die geen (bijna) wit is.   node scripts/sidejob_kleur_test.mjs
import './node3d.mjs';
const mem = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) } });
const THREE = await import('three');
const SJ = await import('../game/js/sidejobs.js');
const CS = await import('../game/js/carrieresfeer.js');

let n = 0, bad = 0;
const ok = (c, msg) => { n++; if (!c) { bad++; console.log('FAIL ' + msg); } };
const lum = (hex) => { const c = new THREE.Color(hex); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; };

ok(SJ.SIDE_JOBS.length > 10, 'er zijn bijbanen');
for (const job of SJ.SIDE_JOBS) {
  const k = SJ.vasteKleur(job);
  ok(/^#[0-9a-f]{6}$/i.test(k) || /^rgba?\(/.test(k), `${job.id}: een kleur die canvas en THREE lezen (${k})`);
  if (/^#/.test(k)) ok(lum(k) < 0.8, `${job.id}: geen wit startvlak (${k})`);
}
ok(SJ.vasteKleur({ id: 'x', color: '#123456' }) === '#123456', 'een gewone hex blijft');
ok(SJ.vasteKleur({ id: 'x', color: 'rgba(1, 2, 3, 0.5)' }) === 'rgba(1, 2, 3, 0.5)', 'een rgba blijft');
ok(/^#/.test(SJ.vasteKleur({ id: 'vismarktkoerier', color: 'color-mix(in srgb, var(--ds-c-glas) 62%, transparent)' })), 'een color-mix wordt een hex');
for (const vak of CS.SFEER_IDS) ok(/^#[0-9a-f]{6}$/i.test(CS.sfeerKleurVast(vak)), `sfeer ${vak}: vaste kleur`);

console.log(bad ? `sidejob_kleur_test: ${bad} van ${n} FAILED` : `sidejob_kleur_test: ${n}/${n} ok`);
process.exit(bad ? 1 : 0);
