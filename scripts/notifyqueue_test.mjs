// De ene meldingenwachtrij (game/js/notifyqueue.js, eigenaarsbesluit 22-11): rustig, een tegelijk, nooit tijdens laden, film, gesprek of een
// schermvullende kaart. Wachtrijgedrag (vasthouden, vrijgeven, samenvoegen, vouwen, vervallen, wegdrukken, urgent afkappen) en de bedrading
// in de bronnen.
//   node scripts/notifyqueue_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createNoticeQueue, KINDS, MAX_AGE_S, MAX_WAITING, PREEMPT_PRIO, registerNoticeHold, noticeHeld, noticeHeldBy, unregisterNoticeHold,
  kindForCard, ignoreFor, moreLabel,
} from '../game/js/notifyqueue.js';
import { noticeDuration } from '../game/js/noticetiming.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FOUT ${name}${info !== '' ? ` (${JSON.stringify(info)})` : ''}`); } };

// een wachtrij met schakelbare holds en een logboek van wat er getoond werd
function make(opts = {}) {
  const st = { loading: false, cutscene: false, screen: false, dialogue: false, mission: false };
  const names = () => Object.entries(st).filter(([, v]) => v).map(([k]) => k);
  const q = createNoticeQueue({ held: (ignore = []) => names().filter((k) => !ignore.includes(k)), ...opts });
  const log = [];
  const item = (text, extra = {}) => ({ key: text, text, show: (m) => log.push(`${text}${m.count > 1 ? 'x' + m.count : ''}${m.more > 0 ? '+' + m.more : ''}`), ...extra });
  return { st, q, log, item };
}
const run = (q, s, step = 0.5) => { for (let t = 0; t < s; t += step) q.tick(step); };

// ---- zonder hold: meteen in beeld ----
{
  const { q, log, item } = make();
  ok(q.push('discovery', item('Nieuwe streek')) === 'shown' && log.length === 1, 'zonder laadscherm komt de melding direct');
}

// ---- elke blokkade houdt vast; na het vrijgeven komt hij ----
for (const hold of ['loading', 'cutscene', 'screen', 'dialogue', 'mission']) {
  const { st, q, log, item } = make();
  st[hold] = true;
  ok(q.push('hint', item('Wacht')) === 'waiting', `${hold}: de melding wacht`);
  run(q, 10);
  ok(log.length === 0, `${hold}: tien seconden vast, niets getoond`);
  st[hold] = false;
  q.tick(0.1);
  ok(log.join() === 'Wacht', `${hold}: na het vrijgeven verschijnt hij`, log);
}

// ---- hooguit een tegelijk, op prioriteit, met de bestaande duur ----
{
  const { st, q, log, item } = make();
  st.loading = true;
  q.push('goal', item('Doel een'));
  q.push('wanted', item('Wanted twee'));
  q.push('achievement', item('Prestatie drie'));
  st.loading = false;
  q.tick(0.1);
  ok(log.join() === 'Wanted twee', 'hoogste prio eerst, hooguit een tegelijk', log);
  run(q, noticeDuration({ tekst: 'Wanted twee' }) - 0.5);
  ok(log.length === 1, 'het slot loopt nog: de volgende wacht');
  run(q, 1);
  ok(log.length === 2 && log[1] === 'Prestatie drie', 'na de duur van noticetiming komt de volgende', log);
  run(q, 8);
  ok(log.join() === 'Wanted twee,Prestatie drie,Doel een', 'volgorde wanted, prestatie, doel', log);
  ok(q.state().active === null || q.state().active === 'Doel een', 'nooit meer dan een actief');
}

// ---- samenvoegen: ontdekkingen smelten samen tot een melding met het aantal ----
{
  const { st, q, log, item } = make();
  st.loading = true;
  q.push('discovery', item('Streek A', { key: 'a' }));
  ok(q.push('discovery', item('Streek B', { key: 'b' })) === 'merged', 'twee ontdekkingen smelten samen');
  q.push('discovery', item('Streek C', { key: 'c' }));
  st.loading = false;
  q.tick(0.1);
  ok(log.join() === 'Streek Cx3', 'een melding: de laatste, met het aantal', log);
}
{
  const { st, q, log, item } = make();
  st.loading = true;
  q.push('discovery', item('Belangrijk', { key: 'a', prio: 9 }));
  q.push('discovery', item('Gewoon', { key: 'b', prio: 1 }));
  st.loading = false;
  q.tick(0.1);
  ok(log.join() === 'Belangrijkx2', 'de belangrijkste wint bij samenvoegen', log);
}
{
  const { st, q, item } = make();
  st.loading = true;
  q.push('discovery', item('Zelfde', { key: 'k' }));
  q.push('discovery', item('Zelfde', { key: 'k' }));
  ok(q.state().waiting.length === 1, 'dezelfde sleutel stapelt niet');
  q.push('achievement', item('P1')); q.push('achievement', item('P2'));
  ok(q.state().waiting.length === 3, 'prestaties worden niet samengevoegd');
}

// ---- te veel wachtend: het laagste vouwt samen tot "en N meer"; prestaties blijven ----
{
  const { st, q, log, item } = make();
  st.loading = true;
  for (let i = 0; i < MAX_WAITING + 3; i++) q.push('tip', item('Tip ' + i));
  ok(q.state().waiting.length === MAX_WAITING, 'meer dan het maximum wacht niet', q.state());
  ok(q.state().folded === 3, 'wat samengevouwen is wordt geteld', q.state().folded);
  st.loading = false;
  q.tick(0.1);
  ok(/\+3$/.test(log[0]) && moreLabel(3) === 'en 3 meer', 'de eerstvolgende melding krijgt "en 3 meer" mee', log);
}
{
  const { st, q, item } = make();
  st.loading = true;
  for (let i = 0; i < MAX_WAITING + 2; i++) q.push('achievement', item('Prestatie ' + i));
  ok(q.state().waiting.length === MAX_WAITING + 2, 'prestaties worden nooit samengevouwen of weggegooid', q.state().waiting.length);
  q.push('hint', item('Hint'));
  q.push('danger', item('Gevaar'));
  ok(!q.state().waiting.some((w) => w.kind === 'hint'), 'bij overvol vouwt het laagste (de hint) eerst');
}

// ---- vervallen na 20 s, behalve prestaties ----
{
  const { st, q, log, item } = make();
  st.loading = true;
  q.push('discovery', item('Oud'));
  q.push('goal', item('Oud doel'));
  q.push('achievement', item('Prestatie'));
  run(q, MAX_AGE_S + 2);
  ok(q.state().waiting.length === 1 && q.state().waiting[0].kind === 'achievement', 'na 20 s vervalt alles behalve de prestatie', q.state());
  ok(q.state().expired === 2, 'het vervallen is geteld');
  run(q, 120);
  st.loading = false;
  q.tick(0.1);
  ok(log.join() === 'Prestatie', 'de prestatie gaat niet verloren, ook niet na twee minuten laden', log);
}
{
  const { st, q, item } = make();
  st.loading = true;
  const dropped = [];
  q.push('radio', item('Radio', { maxAge: 2, onDrop: () => dropped.push('r') }));
  run(q, 3);
  ok(q.state().waiting.length === 0 && dropped.length === 1, 'een eigen maxAge en onDrop bij vervallen', dropped);
}
ok(KINDS.achievement.expires === false && KINDS.discovery.merge === true, 'soortentabel: prestatie vervalt niet, ontdekking smelt samen');

// ---- geen melding tijdens een cutscene; het slot loopt dan niet door ----
{
  const { st, q, log, item } = make();
  q.push('discovery', item('Eerste'));
  q.push('achievement', item('Tweede'));
  st.cutscene = true;
  run(q, 30);
  ok(log.join() === 'Eerste', 'tijdens de cutscene komt er niets bij en het slot staat stil', log);
  q.push('wanted', item('Mid-scene'));
  ok(log.length === 1, 'een nieuwe melding tijdens een cutscene wacht');
  st.cutscene = false;
  run(q, 20);
  ok(log.join() === 'Eerste,Mid-scene,Tweede', 'na de cutscene volgen ze een voor een', log);
}

// ---- urgente soorten negeren het gesprek, missiesoorten het missiescherm ----
{
  const { st, q, log, item } = make();
  st.dialogue = true;
  ok(q.push('police', item('Politie')) === 'shown', 'politie spreekt door een gesprek heen');
  ok(q.push('tip', item('Tip')) === 'waiting', 'een tip wacht op het gesprek');
  const m = make(); m.st.mission = true;
  ok(m.q.push('mission', m.item('Missie')) === 'shown' && m.q.push('goal', m.item('Doel')) === 'waiting', 'een missiemelding negeert het missiescherm, de rest wacht');
  ok(ignoreFor('danger').includes('dialogue') && ignoreFor('mission').includes('mission') && !ignoreFor('tip').length, 'ignoreFor volgt de soort');
}

// ---- negeer: de onthulling op de kaart speelt juist bij een open kaart, nooit tijdens het laden ----
{
  const { st, q, log, item } = make();
  st.screen = true;
  ok(q.push('reveal', item('Onthulling', { duration: 0, ignore: ['screen'] })) === 'shown', 'kaartonthulling speelt bij een open kaart');
  st.loading = true;
  ok(q.push('reveal', item('Onthulling 2', { duration: 0, ignore: ['screen'] })) === 'waiting', 'maar niet tijdens het laadscherm');
  st.loading = false; q.tick(0.1);
  ok(log.length === 2, 'en daarna wel');
}

// ---- drop: een savegame laden geeft geen melding voor wat er al was; prestaties blijven ----
{
  const { st, q, log, item } = make();
  st.loading = true;
  q.push('discovery', item('Bekende streek'));
  q.push('reveal', item('Reveal', { duration: 0 }));
  q.push('achievement', item('Prestatie'));
  q.drop(['discovery', 'area', 'reveal', 'hint']);
  st.loading = false;
  q.tick(0.1);
  ok(log.join() === 'Prestatie', 'na drop blijft alleen de prestatie over', log);
  const b = make(); b.st.loading = true; b.q.push('discovery', b.item('x')); b.q.push('achievement', b.item('p'));
  b.q.drop();
  ok(b.q.state().waiting.length === 1, 'drop zonder soorten laat alleen prestaties staan');
}

// ---- until: de bron meldt zelf wanneer hij klaar is; de veiligheidsgrens vangt een bron die dat vergeet ----
{
  const { q, log, item } = make();
  let klaar = false;
  q.push('card', item('Kaart', { until: () => klaar, duration: 4 }));
  q.push('tip', item('Daarna'));
  run(q, 10);
  ok(log.join() === 'Kaart', 'zolang until onwaar is, houdt de bron het slot (ook na zijn duur)', log);
  klaar = true; q.tick(0.1);
  ok(log.join() === 'Kaart,Daarna', 'zodra de bron klaar meldt, komt de volgende', log);
}
{
  const { q, log, item } = make();
  q.push('tip', item('Vergeet', { until: () => false, duration: 4 }));
  q.push('tip', item('Volgende', { key: 'v2' }));
  run(q, 4 + 15 + 1);
  ok(log.join() === 'Vergeet,Volgende', 'een bron die nooit klaar meldt houdt het slot niet eeuwig', log);
}

// ---- ready: de bron kan zelf wachten (kaarten volgen de aandachtsregels) ----
{
  const { q, log, item } = make();
  let kan = false;
  ok(q.push('tip', item('Pas later', { ready: () => kan })) === 'waiting', 'een bron die nog niet kan, wacht');
  q.push('hint', item('Gaat voor', { key: 'h' }));
  q.tick(0.1);
  ok(log.join() === 'Gaat voor', 'een andere melding gaat voorbij aan wie nog niet kan', log);
  run(q, 5);
  kan = true; q.tick(0.1);
  ok(log.join() === 'Gaat voor,Pas later', 'zodra ready waar is, komt hij', log);
  const f = make();
  f.q.push('tip', f.item('Kapot ready', { ready: () => { throw new Error('x'); } }));
  ok(f.log.length === 1, 'een falende ready blokkeert niet');
}

// ---- wegdrukken en urgent afkappen ----
{
  const { q, log, item } = make();
  const cut = [];
  q.push('tip', item('Tip', { cut: () => cut.push('tip') }));
  q.push('goal', item('Doel'));
  ok(q.dismiss() === true && cut.join() === 'tip', 'wegdrukken breekt de lopende melding af');
  ok(log.join() === 'Tip,Doel', 'en de volgende komt meteen', log);
  ok(make().q.dismiss() === false, 'zonder melding is er niets weg te drukken');
}
{
  const { q, log, item } = make();
  const cut = [];
  q.push('tip', item('Tip', { cut: () => cut.push('tip') }));
  q.push('danger', item('Brand!'));
  ok(KINDS.danger.prio >= PREEMPT_PRIO && cut.join() === 'tip' && log.join() === 'Tip,Brand!', 'gevaar kapt een lopende tip af', log);
  const z = make();
  z.q.push('tip', z.item('Tip zonder cut'));
  z.q.push('danger', z.item('Brand!'));
  ok(z.log.join() === 'Tip zonder cut' && z.q.state().waiting.length === 1, 'zonder cut wacht ook gevaar op het slot');
}

// ---- een kapotte show houdt de rij niet op ----
{
  const { q, log } = make();
  q.push('goal', { key: 'a', text: 'kapot', show: () => { throw new Error('boem'); } });
  q.push('goal', { key: 'b', text: 'heel', show: () => log.push('heel') });
  run(q, 10);
  ok(log.join() === 'heel', 'een kapotte melding houdt de rij niet op', log);
}

// ---- de hulpstanden ----
{
  const { st, q, item } = make();
  st.loading = true;
  q.push('tip', item('T', { surface: 'card' }));
  ok(q.hasSurface('card') && !q.hasSurface('phone') && q.has('tip') && q.busy() && !q.shown(), 'has, hasSurface, busy en shown');
  st.loading = false; q.tick(0.1);
  ok(q.shown(), 'shown is waar zolang een melding in het slot staat');
  ok(kindForCard('politie') === 'police' && kindForCard('gevaar') === 'danger' && kindForCard('onbekend') === 'tip', 'kaartsoorten op wachtrijsoorten');
}

// ---- het register van holds ----
{
  registerNoticeHold('testprobe', () => true);
  ok(noticeHeld() && noticeHeldBy().includes('testprobe') && !noticeHeld(['testprobe']), 'register: vasthouden en negeren');
  registerNoticeHold('kapot', () => { throw new Error('x'); });
  ok(!noticeHeldBy().includes('kapot'), 'een falende probe houdt niets vast');
  unregisterNoticeHold('testprobe'); unregisterNoticeHold('kapot');
  ok(!noticeHeld(), 'zonder probes houdt niets vast');
}

// ---- bedrading in de bronnen ----
const sink = (file, re, name) => ok(re.test(read(file)), name);
const hud = read('game/js/hud_panel.js');
ok(/onStreekOntdekt\(\(\) => \{\s*enqueueNotice\('discovery'/.test(hud) && hud.includes("from './notifyqueue.js'"), 'de gloed van de minimap loopt via de wachtrij');
ok(/enqueueNotice\('radio'/.test(hud), 'de radiokaart loopt via de wachtrij');
const mv = read('game/js/mapview.js');
ok(/enqueueNotice\('reveal'/.test(mv) && /ignore: \['screen'\]/.test(mv), 'de kaartonthulling loopt via de wachtrij (negeert alleen het kaartscherm)');
const hc = read('game/js/hudcards.js');
ok(/enqueueNotice\(kindForCard\(/.test(hc) && /placeCard\(card\)/.test(hc), 'HUD-kaarten lopen via de wachtrij');
ok(/noticeHeld\(\['screen', 'cutscene', 'dialogue', 'mission'\]\)/.test(hc), 'HUD-kaarten wachten op laadscherm en opstart (de interne bevriezing)');
sink('game/js/achievements.js', /enqueueNotice\('achievement'/, 'de prestatietoast loopt via de wachtrij');
sink('game/js/phonefeed.js', /enqueueNotice\('phone'/, 'telefoonmeldingen lopen via de wachtrij');
sink('game/js/namecard.js', /enqueueNotice\('namecard'/, 'de naamkaart loopt via de wachtrij');
sink('game/js/menumelding.js', /enqueueNotice\('menu'/, 'de menumelding loopt via de wachtrij');
sink('game/js/cinematics.js', /enqueueNotice\('area'/, 'de wijkkaart loopt via de wachtrij');
sink('game/js/attention.js', /noticeQueue\.shown\(\)/, 'filmmomenten wachten op een melding in beeld');
sink('game/js/attention.js', /noticeHeld\(\['dialogue', 'mission'\]\)\) return false;/, 'wijkkaart en filmmomenten wachten op de holds');
const ls = read('game/js/loadscreen.js');
ok(ls.includes("registerNoticeHold('loading'") && ls.includes("registerNoticeHold('startup'") && /kind === 'save'\) noticeQueue\.drop/.test(ls), 'het laadscherm houdt vast en laat bij een save de oude ontdekkingen vallen');
sink('game/js/cinematics.js', /registerNoticeHold\('cutscene'/, 'een cutscene houdt vast');
const oh = read('game/js/overlayhold.js');
ok(oh.includes("registerNoticeHold('screen'") && oh.includes("registerNoticeHold('mission'"), 'een schermvullend menu en de resultaatkaart houden vast');
sink('game/js/narrative.js', /registerNoticeHold\('dialogue'/, 'een gesprek houdt vast');
const gb = read('game/js/notifyqueue.js');
ok(!/fetch|WebSocket|RTCPeer|XMLHttp/.test(gb), 'Samen spelen: de wachtrij is lokaal, geen netwerkverkeer');
ok(gb.includes("from './noticetiming.js'") && gb.includes('noticeDuration'), 'de wachtrij gebruikt de duur van noticetiming.js');
ok(/isContentEditable[^\n]*input\|textarea[\s\S]{0,120}return;[\s\S]{0,120}e\.key === 'Delete'/.test(gb), 'Delete wordt niet afgevangen als de focus in een tekstveld staat (ook niet in het schermtoetsenbord-veld)');
ok(!fs.existsSync(path.join(ROOT, 'game/js/notifygate.js')), 'de oude meldingenpoort is vervangen door notifyqueue.js');

console.log(`${n - fails}/${n} goed${fails ? `, ${fails} FOUT` : ''}`);
process.exit(fails ? 1 : 0);
