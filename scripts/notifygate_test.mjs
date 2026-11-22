// De meldingenpoort (game/js/notifygate.js, eigenaarseis 22-11): meldingen pas na het laadscherm.
// Wachtrijgedrag (vasthouden, vrijgeven, samenvoegen, vervallen, prestaties nooit weg, cutscene) en de bedrading in de bronnen.
//   node scripts/notifygate_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNotifyGate, KINDS, MAX_AGE_S, registerNotifyHold, notifyHeld, notifyHeldBy, unregisterNotifyHold } from '../game/js/notifygate.js';
import { noticeDuration } from '../game/js/noticetiming.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
let n = 0, fouten = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fouten++; console.log(`FOUT ${naam}${info !== '' ? ` (${JSON.stringify(info)})` : ''}`); } };

// een poort met een schakelbare vasthouder en een logboek van wat er getoond werd
function maak(opts = {}) {
  const st = { laden: false, cut: false, scherm: false };
  const namen = () => Object.entries(st).filter(([, v]) => v).map(([k]) => k);
  const g = createNotifyGate({ held: (negeer = []) => namen().filter((k) => !negeer.includes(k)), ...opts });
  const log = [];
  const toon = (tekst, extra = {}) => ({ key: tekst, tekst, show: (m) => log.push(`${tekst}${m.aantal > 1 ? 'x' + m.aantal : ''}`), ...extra });
  return { st, g, log, toon };
}
const tikken = (g, s, stap = 0.5) => { for (let t = 0; t < s; t += stap) g.tik(stap); };

// ---- zonder vasthouder: meteen in beeld ----
{
  const { g, log, toon } = maak();
  ok(g.push('ontdekking', toon('Nieuwe streek')) === 'getoond' && log.length === 1, 'zonder laadscherm komt de melding direct');
}

// ---- vasthouden en vrijgeven na het laden ----
{
  const { st, g, log, toon } = maak();
  st.laden = true;
  ok(g.push('ontdekking', toon('Streek A')) === 'wacht', 'tijdens het laadscherm wacht de melding');
  tikken(g, 10);
  ok(log.length === 0, 'tien seconden laden: nog niets getoond');
  st.laden = false;
  g.tik(0.1);
  ok(log.join() === 'Streek A', 'na het laadscherm verschijnt hij', log);
}

// ---- een voor een, in volgorde van prio, met de bestaande duur ----
{
  const { st, g, log, toon } = maak();
  st.laden = true;
  g.push('doel', toon('Doel een'));
  g.push('wanted', toon('Wanted twee'));
  g.push('prestatie', toon('Prestatie drie'));
  st.laden = false;
  g.tik(0.1);
  ok(log.join() === 'Wanted twee', 'hoogste prio eerst, hooguit een tegelijk', log);
  tikken(g, noticeDuration({ tekst: 'Wanted twee' }) - 0.5);
  ok(log.length === 1, 'het slot loopt nog: de volgende wacht');
  tikken(g, 1);
  ok(log.length === 2 && log[1] === 'Prestatie drie', 'na de duur van noticetiming komt de volgende', log);
  tikken(g, 5);
  ok(log.join() === 'Wanted twee,Prestatie drie,Doel een', 'volgorde wanted, prestatie, doel', log);
}

// ---- samenvoegen: meerdere ontdekkingen worden een melding met de laatste ----
{
  const { st, g, log, toon } = maak();
  st.laden = true;
  g.push('ontdekking', toon('Streek A', { key: 'a' }));
  ok(g.push('ontdekking', toon('Streek B', { key: 'b' })) === 'samengevoegd', 'twee ontdekkingen smelten samen');
  g.push('ontdekking', toon('Streek C', { key: 'c' }));
  st.laden = false;
  g.tik(0.1);
  ok(log.join() === 'Streek Cx3', 'een melding: de laatste, met het aantal', log);
}
{
  const { st, g, log, toon } = maak();
  st.laden = true;
  g.push('ontdekking', toon('Belangrijk', { key: 'a', prio: 9 }));
  g.push('ontdekking', toon('Gewoon', { key: 'b', prio: 1 }));
  st.laden = false;
  g.tik(0.1);
  ok(log.join() === 'Belangrijkx2', 'de belangrijkste wint bij samenvoegen', log);
}
{
  const { st, g, log, toon } = maak();
  st.laden = true;
  g.push('ontdekking', toon('Zelfde', { key: 'k' }));
  g.push('ontdekking', toon('Zelfde', { key: 'k' }));
  ok(g.state().wacht.length === 1, 'dezelfde sleutel stapelt niet');
  g.push('prestatie', toon('P1')); g.push('prestatie', toon('P2'));
  ok(g.state().wacht.length === 3, 'prestaties worden niet samengevoegd');
}

// ---- vervallen na 20 s, behalve prestaties ----
{
  const { st, g, log, toon } = maak();
  st.laden = true;
  g.push('ontdekking', toon('Oud'));
  g.push('doel', toon('Oud doel'));
  g.push('prestatie', toon('Prestatie'));
  tikken(g, MAX_AGE_S + 2);
  ok(g.state().wacht.length === 1 && g.state().wacht[0].soort === 'prestatie', 'na 20 s vervalt alles behalve de prestatie', g.state());
  ok(g.state().vervallen === 2, 'het vervallen is geteld');
  tikken(g, 120);
  st.laden = false;
  g.tik(0.1);
  ok(log.join() === 'Prestatie', 'de prestatie gaat niet verloren, ook niet na twee minuten laden', log);
}
ok(KINDS.prestatie.vervalt === false && KINDS.ontdekking.samen === true, 'soortentabel: prestatie vervalt niet, ontdekking smelt samen');

// ---- geen melding tijdens een cutscene; het slot loopt dan niet door ----
{
  const { st, g, log, toon } = maak();
  g.push('ontdekking', toon('Eerste'));
  g.push('prestatie', toon('Tweede'));
  st.cut = true;
  tikken(g, 30);
  ok(log.join() === 'Eerste', 'tijdens de cutscene komt er niets bij en het slot staat stil', log);
  g.push('wanted', toon('Mid-scene'));
  ok(log.length === 1, 'een nieuwe melding tijdens een cutscene wacht');
  st.cut = false;
  tikken(g, 20);
  ok(log.join() === 'Eerste,Mid-scene,Tweede', 'na de cutscene volgen ze een voor een', log);
}

// ---- negeer: de onthulling op de kaart speelt juist bij een open kaart, nooit tijdens het laden ----
{
  const { st, g, log, toon } = maak();
  st.scherm = true;
  ok(g.push('kaart', toon('Onthulling', { duur: 0, negeer: ['scherm'] })) === 'getoond', 'kaartonthulling speelt bij een open kaart');
  st.laden = true;
  ok(g.push('kaart', toon('Onthulling 2', { duur: 0, negeer: ['scherm'] })) === 'wacht', 'maar niet tijdens het laadscherm');
  st.laden = false; g.tik(0.1);
  ok(log.length === 2, 'en daarna wel');
}

// ---- drop: een savegame laden geeft geen "winner"-melding voor wat er al was; prestaties blijven ----
{
  const { st, g, log, toon } = maak();
  st.laden = true;
  g.push('ontdekking', toon('Bekende streek'));
  g.push('kaart', toon('Reveal', { duur: 0 }));
  g.push('prestatie', toon('Prestatie'));
  g.drop(['ontdekking', 'gebied', 'kaart', 'hint']);
  st.laden = false;
  g.tik(0.1);
  ok(log.join() === 'Prestatie', 'na drop blijft alleen de prestatie over', log);
  const b = maak(); b.st.laden = true; b.g.push('ontdekking', b.toon('x')); b.g.push('prestatie', b.toon('p'));
  b.g.drop();
  ok(b.g.state().wacht.length === 1, 'drop zonder soorten laat alleen prestaties staan');
}

// ---- een kapotte show houdt de rij niet op ----
{
  const { g, log } = maak();
  g.push('doel', { key: 'a', tekst: 'kapot', show: () => { throw new Error('boem'); } });
  g.push('doel', { key: 'b', tekst: 'heel', show: () => log.push('heel') });
  tikken(g, 10);
  ok(log.join() === 'heel', 'een kapotte melding houdt de rij niet op', log);
}

// ---- het register van vasthouders ----
{
  registerNotifyHold('testprobe', () => true);
  ok(notifyHeld() && notifyHeldBy().includes('testprobe') && !notifyHeld(['testprobe']), 'register: vasthouden en negeren');
  registerNotifyHold('kapot', () => { throw new Error('x'); });
  ok(!notifyHeldBy().includes('kapot'), 'een falende probe houdt niets vast');
  unregisterNotifyHold('testprobe'); unregisterNotifyHold('kapot');
  ok(!notifyHeld(), 'zonder probes houdt niets vast');
}

// ---- bedrading in de bronnen ----
const hud = lees('game/js/hud_panel.js');
ok(/onStreekOntdekt\(\(\) => \{\s*queueNotice\('ontdekking'/.test(hud) && hud.includes("from './notifygate.js'"), 'de gloed van de minimap loopt via de poort');
const mv = lees('game/js/mapview.js');
ok(/queueNotice\('kaart'/.test(mv) && /negeer: \['scherm'\]/.test(mv), 'de kaartonthulling loopt via de poort (negeert alleen het kaartscherm)');
ok(/notifyHeld\(\['scherm', 'cutscene'\]\)/.test(lees('game/js/hudcards.js')), 'HUD-kaarten wachten op laadscherm en opstart');
ok(/if \(notifyHeld\(\)\) return true;/.test(lees('game/js/achievements.js')), 'de prestatietoast wacht op de poort');
ok(/if \(notifyHeld\(\)\) return false;/.test(lees('game/js/attention.js')), 'wijkkaart en filmmomenten wachten op de poort');
const ls = lees('game/js/loadscreen.js');
ok(ls.includes("registerNotifyHold('laadscherm'") && ls.includes("registerNotifyHold('opstart'") && /kind === 'save'\) notifyGate\.drop/.test(ls), 'het laadscherm houdt vast en laat bij een save de oude ontdekkingen vallen');
ok(lees('game/js/cinematics.js').includes("registerNotifyHold('cutscene'"), 'een cutscene houdt vast');
ok(lees('game/js/overlayhold.js').includes("registerNotifyHold('scherm'"), 'een schermvullend menu houdt vast');
const gb = lees('game/js/notifygate.js');
ok(!/fetch|WebSocket|RTCPeer|XMLHttp/.test(gb), 'Samen spelen: de poort is lokaal, geen netwerkverkeer');
ok(gb.includes("from './noticetiming.js'") && gb.includes('noticeDuration'), 'de poort gebruikt de duur van noticetiming.js');

console.log(`${n - fouten}/${n} goed${fouten ? `, ${fouten} FOUT` : ''}`);
process.exit(fouten ? 1 : 0);
