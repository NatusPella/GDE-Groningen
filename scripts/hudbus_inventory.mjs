// Inventory per channel of the one attention planner (#104, input for #92): what asks for the
// player's eyes, on which scale, with which rationing. Reads the tables of game/js/hudbus.js.
//   node scripts/hudbus_inventory.mjs
const B = await import('../game/js/hudbus.js');

console.log('Kanaal hud (kaarten op de P-schaal, zone A berichten, E prestatie/radio):');
for (const [k, v] of Object.entries(B.KINDS)) console.log(`  ${k.padEnd(10)} P${v.p}  zone ${v.zone}  ${v.level ? 'niveau ' + v.level + ' (' + B.LEVEL[v.level] + ')' : 'niet op de aandachtsschaal'}`);
console.log('Kanaal narrative (verhaal, praat, toasts; een tegelijk):');
console.log(`  praat: ${B.NARRATIVE.TALK.join(', ')}  (tussenruimte ${B.NARRATIVE.GAP} s, na een scene ${B.NARRATIVE.AFTER_SCENE} s, banter ${B.NARRATIVE.BANTER_GAP} s)`);
console.log(`  toasts: ${B.NARRATIVE.TOASTS.join(', ')}  (na een scene ${B.NARRATIVE.TOAST_AFTER_SCENE} s, tussenruimte ${B.NARRATIVE.TOAST_GAP} s)`);
console.log('Kanaal moment (filmische momenten, gerantsoeneerd):');
for (const [k, m] of Object.entries(B.MOMENTS)) console.log(`  ${k.padEnd(11)} niveau ${m.level}  groep ${m.group}  afkoeling ${m.cooldown} s  ${m.fast ? 'ook bij hoge snelheid' : 'niet boven ' + Math.round(B.RATION.FAST * 3.6) + ' km/u'}`);
console.log(`  tussen twee onderbrekingen ${B.RATION.GLOBAL_GAP} s, een lager niveau wacht na een hoger nog ${B.RATION.AFTER_HIGHER} s`);
console.log(`Kanaal tip: een per ${B.RATION.TIP_GAP} s`);
console.log('Kanaal voice (telefoonberichten voorgelezen): ' + Object.entries(B.VOICE_GAP).map(([k, s]) => `${k} om de ${s} s`).join(', ') + '; een personage altijd');
// every channel of CHANNELS has a rule set that answers
const bad = Object.values(B.CHANNELS).filter((c) => { try { B.mayShow(c, { kind: 'x', p: 3, now: 0, last: -Infinity, voicedAt: {}, view: { isOn: () => false, pending: () => false, since: () => 99, sinceAny: () => 99, toastAgo: 99 }, last_: {} }); return false; } catch (e) { return c !== 'moment'; } });
if (bad.length) { console.log('kanalen zonder antwoord: ' + bad.join(', ')); process.exit(1); }
console.log(`${Object.keys(B.CHANNELS).length} kanalen, ${Object.keys(B.KINDS).length} soorten kaarten, ${Object.keys(B.MOMENTS).length} momenten`);
