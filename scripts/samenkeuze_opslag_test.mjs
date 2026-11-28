// De opslagkeuze voor Samen spelen (28-11, launchchoiceui.js gekozenSamen) op de opslag zelf: Nieuw spel, Terug en daarna een bestaande plek kiezen
// (en andersom) laat de oude saves ongewijzigd en laat de boot nooit een bestaand spel als vers spel openen.  node scripts/samenkeuze_opslag_test.mjs
// Raakt nooit echte opslag: alles draait op een opslag in het geheugen.
import assert from 'node:assert/strict';
import { slotKey, KEYS } from '../game/js/storagekeys.js';
import { SAVE_VERSION } from '../game/js/savemigrate.js';
import { ARC_ID } from '../game/js/storyarc.js';
import * as S from '../game/js/saveslots.js';
import { samenGekozen } from '../game/js/hoofdmenu.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
class Mem {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const save = (money) => ({ v: SAVE_VERSION, arc: ARC_ID, savedAt: 1000 + money, money, speeltijd: 600, missions: { index: 1, completed: [0], seen: [0] }, character: 'tammo' });
const maak = () => { const ls = new Mem(); S.writeSlot(ls, 1, save(100)); S.writeSlot(ls, 2, save(200)); S.setActive(ls, 2); return ls; };
const ruw = (ls) => [1, 2].map((i) => ls.getItem(slotKey(i)));

// wat gekozenSamen doet, op de opslag (de pure beslissing komt uit hoofdmenu.js)
const kies = (ls, keuze) => {
  const heeft = (S.listSlots(ls).length > 0) && !S.isFresh(ls);
  const g = samenGekozen(keuze, { heeftSave: heeft, vrijePlek: !!S.freeSlot(ls) });
  if (g.actie === 'nieuwe-plek') S.createSlot(ls, 'Verse plek', 0, true);
  if (g.soort === 'plek') { S.setActive(ls, g.n); S.clearFresh(ls); S.markStay(ls, g.n); }
  return g;
};

// A: Nieuw spel gekozen, Terug uit de sessiekeuze, daarna een bestaand spel
{
  const ls = maak(); const voor = ruw(ls);
  const a = kies(ls, 'nieuw');
  ok(a.actie === 'nieuwe-plek' && S.isFresh(ls) && S.activeSlot(ls) === 3, 'Nieuw spel: een verse plek, nooit een overschrijving');
  ok(JSON.stringify(ruw(ls)) === JSON.stringify(voor), 'de oude saves zijn ongewijzigd');
  const n3 = S.listSlots(ls).length;
  const b = kies(ls, 'nieuw'); // nog eens Nieuw na Terug
  ok(b.actie === 'direct' && S.listSlots(ls).length === n3 && S.activeSlot(ls) === 3, 'Nieuw na Terug maakt geen tweede verse plek');
  kies(ls, 1); // Terug, dan een bestaand spel
  ok(!S.isFresh(ls), 'de verse-vlag is weg: de boot opent geen bestaand spel als nieuw spel');
  ok(S.pickLatest(ls) === 1 && S.activeSlot(ls) === 1, 'de boot opent de gekozen plek');
  ok(JSON.stringify(ruw(ls)) === JSON.stringify(voor), 'de oude saves zijn nog steeds ongewijzigd');
}
// B: eerst een bestaand spel, daarna Nieuw spel
{
  const ls = maak(); const voor = ruw(ls);
  kies(ls, 1);
  ok(S.pickLatest(ls) === 1, 'de gekozen plek is de plek van de boot');
  kies(ls, 'nieuw');
  const p = S.pickLatest(ls);
  ok(S.isFresh(ls) && p === 3 && S.readSlot(ls, p).state === 'leeg', 'Nieuw spel wint van de eerder gekozen plek: een lege plek, de boot begint daar');
  ok(JSON.stringify(ruw(ls)) === JSON.stringify(voor), 'de oude saves zijn ongewijzigd');
}
// C: geen vrije plek: er gebeurt niets en het menu zegt waarom
{
  const ls = new Mem(); for (let i = 1; i <= 8; i++) S.writeSlot(ls, i, save(i));
  const voor = JSON.stringify([...ls.m.entries()]);
  const g = kies(ls, 'nieuw');
  ok(g.actie === 'vol' && /Alle plekken/.test(g.tekst) && JSON.stringify([...ls.m.entries()]) === voor, 'vol: geen stille overschrijving, de opslag blijft zoals hij was');
}
console.log(`samenkeuze_opslag_test: ${n} controles ok`);
