// Pure regels rond munitie en wapenwissel (verfijnronde 22-11, spullen en wapens): hoeveel een pak echt bijvult, wat een bijna
// vol magazijn kost, en welke wapens het muiswiel en de terugval na het laatste stuk meenemen. Geen DOM, geen wereld:
// combat.js en shops.js geven de feiten mee. Test: scripts/ammorules_test.mjs.
// Samen spelen: het wapen in je hand en je munitie zijn per speler; dit raakt alleen de eigen voorraad van wie de winkel of het wiel gebruikt.

// Hoeveel patronen een pak werkelijk toevoegt: nooit meer dan er in de zak past, nooit negatief.
export function munitieWinst(have, pack, cap) {
  const h = Math.max(0, Number.isFinite(have) ? have : 0);
  const p = Math.max(0, Math.floor(Number(pack) || 0));
  const c = Number.isFinite(cap) ? cap : h + p;
  return Math.max(0, Math.min(p, Math.floor(c - h)));
}

// De prijs van een bijna-vol pak: een heel pak kost de volle prijs, een deel een evenredig deel (minstens 1 euro, nooit meer
// dan de volle prijs). Zo betaal je niet 25 euro voor 3 patronen die er nog bij passen. Als je niets krijgt (winst <= 0),
// betaal je ook niets (#1285).
export function munitiePrijs(price, pack, winst) {
  const pr = Math.max(0, Math.floor(Number(price) || 0));
  const p = Math.max(1, Math.floor(Number(pack) || 1));
  if (winst >= p || pr === 0) return pr;
  if (winst <= 0) return 0;
  return Math.min(pr, Math.max(1, Math.ceil((pr * winst) / p)));
}

// De wapens die het muiswiel doorloopt: alles wat van jou is en nog iets heeft om mee te schieten of te slaan. Een leeg
// wapen blijft van jou (#437) en kies je met het cijfer, maar het wiel stopt er niet meer. Is er niets met patronen, dan
// blijven de vuisten over (die zitten altijd in de lijst).
export function wielWapens(keys, hasWeapon, hasAmmo, huidig) {
  const pool = keys.filter((k) => hasWeapon(k) && (hasAmmo(k) || k === huidig));
  return pool;
}

// Na het laatste stuk van een werpding of de laatste druppel water: het wapen dat je daarna in de hand krijgt. Het
// laatst gebruikte slagwapen of anders het eerste wapen met patronen, anders de vuisten.
export function terugvalWapen(keys, hasWeapon, hasAmmo, huidig, voorkeur = []) {
  for (const k of voorkeur) if (k !== huidig && hasWeapon(k) && hasAmmo(k)) return k;
  const rest = keys.filter((k) => k !== huidig && k !== 'fists' && hasWeapon(k) && hasAmmo(k));
  return rest[0] || 'fists';
}

// De melding bij een cijfertoets: niets in dat slot (de toets deed stil niets), of het gekozen wapen is leeg. Een gewone wissel zegt
// niets (het wapen in de HUD verandert al). '' = geen melding.
export function slotMessage(slot, gelukt, leeg) {
  if (!gelukt) return `Niets in slot ${slot}`;
  if (leeg) return 'Dit wapen is leeg. Munitie koop je bij Pang & Zo';
  return '';
}

// What the pawn shop pays for a gun with n rounds: 30% of the gun, and per round never more than a round costs in the shop.
// The flat 0.4 per round paid 240 euro for 600 squirts of water that cost 15 (5 per 150): buy, sell, repeat was free money.
export function gunResale(w, n) {
  const gun = Math.max(0, Number(w && w.gun) || 0);
  if (w && w.melee) return Math.round(gun * 0.4);
  const pack = Math.max(1, Math.floor(Number(w && w.ammo) || 1));
  const perRound = Math.min(0.4, Math.max(0, Number(w && w.ammoPrice) || 0) / pack);
  return Math.round(gun * 0.3 + Math.max(0, Number.isFinite(n) ? n : 0) * perRound);
}

// What the pawn shop pays for your armour (#1296). Armour from the big blue bag (1 euro for +10) is no vest: it is not
// bought back, or ten bags for 10 euro sold for 60 and every round between the two shops made 50 euro. The bag part
// stays on you (keep); a sale needs at least 10 points of real vest. bagArmor is clamped to the armour you still have.
export function vestResale(armor, bagArmor) {
  const a = Math.max(0, Number.isFinite(armor) ? armor : 0);
  const keep = Math.min(a, Math.max(0, Number.isFinite(bagArmor) ? bagArmor : 0));
  const vest = a - keep;
  return { vest, keep, income: vest >= 10 ? Math.round(vest * 0.6) : 0 };
}
