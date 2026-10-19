// De nieuwsticker aan spelgebeurtenissen (#202): node scripts/nieuwslink_test.mjs
import { createNieuwsLink, nieuwsFeiten, tikNieuws } from '../game/js/nieuwslink.js';
import fs from 'node:fs';
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };
const w = { wanted: 0, police: {}, muggerChase: null, eventsNow: [] };
const bridge = { state: 'closed', name: 'Eendenbrug' };
const env = { bridges: () => [bridge] };
const L = createNieuwsLink(3);
ok(nieuwsFeiten(L, w, env).length === 0, 'rustig: geen feiten');
w.wanted = 2;
ok(nieuwsFeiten(L, w, env).map((f) => f.soort).join() === 'achtervolging', 'sterren: een achtervolging');
ok(nieuwsFeiten(L, w, env).length === 0, 'en maar één keer');
w.police.searching = true; ok(nieuwsFeiten(L, w, env).length === 0, 'zoeken is geen nieuwe achtervolging');
w.muggerChase = {}; ok(nieuwsFeiten(L, w, env)[0].soort === 'overval', 'beroving: een overval');
bridge.state = 'opening'; const f = nieuwsFeiten(L, w, env);
ok(f.length === 1 && f[0].soort === 'brug' && f[0].plaats === 'Eendenbrug', 'brug gaat open');
w.eventsNow = [{ id: 'a' }]; ok(nieuwsFeiten(L, w, env).some((x) => x.soort === 'evenement'), 'nieuw evenement');
ok(!nieuwsFeiten(L, w, env).some((x) => x.soort === 'evenement'), 'zelfde evenement niet nog eens');
{
  const M = createNieuwsLink(5), w2 = { wanted: 0, police: {}, eventsNow: [{ id: 'x' }] };
  ok(nieuwsFeiten(M, w2, {}).length === 0, 'evenement dat er al is bij het laden is geen nieuws');
}
// een tik geeft hooguit één nieuwe regel, alleen tekst, geen merken
{
  const A = createNieuwsLink(9), w3 = { wanted: 3, police: {}, eventsNow: [] };
  const r = tikNieuws(A, w3, 100, { regio: 'groningen', plaats: 'Haren' });
  ok(r && /Kiekdoar Nieuws/.test(r.tekst) && /\S/.test(r.tekst), 'achtervolging komt als tekstregel', r && r.tekst);
  ok(tikNieuws(A, w3, 101, { regio: 'groningen', plaats: 'Haren' }) === null, 'zelfde regel niet nog eens');
  const lines = []; for (let t = 0; t < 4000; t += 5) { w3.wanted = t % 40 < 20 ? 2 : 0; const x = tikNieuws(A, w3, t, { regio: 'groningen', plaats: 'Haren' }); if (x) lines.push(x.tekst); }
  ok(lines.length <= 4000 / 60 * 4 && lines.length > 0, 'dichtheid blijft beperkt', String(lines.length));
}
const code = fs.readFileSync(new URL('../game/js/regiolevenrt.js', import.meta.url), 'utf8');
ok(/tikNieuws\(/.test(code) && /showCard\(w, \{ kind: 'tip', kicker: n\.bron/.test(code), 'regiolevenrt toont de ticker als tip-kaart');
ok(/setNieuwsBronnen/.test(fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8')), 'main.js geeft de bruggen mee');
{ const K = createNieuwsLink(3), wk = { eventsNow: [] };
  nieuwsFeiten(K, wk, {}); wk.eventsNow = [{ id: 'k', kind: 'kermis', naam: 'Zomerkermis Leek', plaats: 'Leek' }];
  const f = nieuwsFeiten(K, wk, {});
  ok(f.length === 1 && f[0].soort === 'kermis' && f[0].plaats === 'Leek', 'kermis wordt kermis-nieuws met plaats'); }
console.log(`${n - fails}/${n} ok`); process.exit(fails ? 1 : 0);
