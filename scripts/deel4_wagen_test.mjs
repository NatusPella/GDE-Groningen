// Deel 4 gekoppeld aan de wagen en de open wereld (WP7, #1130): Willemien is vaste klant van de Fjord Frituur, Jelle wacht met kopen tot panden
// goedkoper worden, M30 is de uitnodiging voor de open wereld (boerderij, pand, voetbal) en O12 sluit af; gaswinning en aardbevingen staan er niet in.
//   node scripts/deel4_wagen_test.mjs
// Wat dit niet ziet: hoe de scènes er in beeld uitzien en klinken (Electron, stemmen).
import fs from 'node:fs';
const root = new URL('../game/', import.meta.url);
const script = JSON.parse(fs.readFileSync(new URL('storydata/script.json', root), 'utf8'));
const humor = JSON.parse(fs.readFileSync(new URL('storydata/humor.akte6.json', root), 'utf8'));
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const sc = (id) => script.scenes.find((s) => s.id === id);
const textOf = (id) => ((sc(id) || {}).lines || []).map((l) => `${l.speaker || l.who || ''}: ${l.text || ''}`).join('\n');

// Willemien als vaste klant van de wagen
ok(/Ik ken jullie van het luik/.test(textOf('M27.1')) && /eierbal/i.test(textOf('M27.1')), 'M27.1: Willemien kent het duo van het luik en bestelt een eierbal');
ok(/eierbal/i.test(textOf('M29.2')) || humor.beats.some((b) => b.scene === 'M29.2'), 'M29.2: de eierbal komt terug op het buurtfeest');
// Jelle wacht tot panden goedkoper worden (hij blijft de tegenstander van de open wereld)
ok(/Sjabbe: Ik heb een pand/.test(textOf('M30.6')) && /Jelle Terpstra: Dat pand ken ik/.test(textOf('M30.6')), 'M30.6: Sjabbe biedt een pand, Jelle wacht tot de prijs zakt');
// M30 en O12 nodigen uit naar de open wereld: boerderij, panden, voetbal
const m30 = textOf('M30.6');
ok(/bieten/.test(m30) && /pand/.test(m30) && /aanvalster/.test(m30), 'M30.6: boerderij (bieten), pand en voetbal (aanvalster) als uitnodiging');
ok(sc('O12') && sc('O12').step === 'M30' && /pand/.test(textOf('O12')) && /bieten/.test(textOf('O12')) && /Veendam/.test(textOf('O12')) && /tweede wagen/.test(textOf('O12')), 'O12 sluit Deel 4 af en wijst naar pand, bieten, Veendam en een tweede wagen');
// de humorbeats staan klaar met een neutrale terugval
ok(humor.beats.length === 3 && humor.beats.every((b) => b.variants.length === 3 && b.neutral && ['0', '1', '2', 'neutral'].includes(String(b.chosen))), 'humor.akte6: drie beats met drie varianten en een neutrale terugval');
ok(humor.beats.every((b) => sc(b.scene) && textOf(b.scene).includes((b.chosen === 'neutral' ? b.neutral : b.variants[b.chosen]))), 'elke beat staat ook echt in zijn scène');
// gevoelig onderwerp: geen gaswinning, aardbevingen of echte bedrijven in Deel 4
const part4 = script.scenes.filter((s) => ['M27', 'M28', 'M29', 'T5', 'M30'].includes(s.step) || ['O11', 'O12'].includes(s.id));
const all = part4.map((s) => textOf(s.id)).join('\n');
ok(part4.length >= 20, 'Deel 4 heeft scènes', String(part4.length));
ok(!/gaswinning|aardbeving|aardgas|\bNAM\b|Gasunie|schade aan het huis|bevingsschade|winter|sneeuw/i.test(all), 'geen gaswinning, aardbevingen, echte bedrijven of winter in Deel 4');
ok(!/de Grunn\b/.test(all), 'Grunn, nooit de Grunn');
console.log(`deel4_wagen_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
