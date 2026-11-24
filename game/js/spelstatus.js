// Pure rekenregels voor het Spel-menu (ontwerp docs/ontwerp/SPEL-UI-24-11.md): de status in de kopband, de strook Aandacht,
// wat je verliest bij terugzetten, laden, overschrijven en nieuw spel, en de bon van opgepakt en buiten westen.
// Geen DOM, geen wereld, geen opslag: scripts/spelstatus_test.mjs draait het in node. De dunne laag die de wereld leest staat in
// spelovzicht.js (Overzicht) en saveslotsui.js (Opgeslagen spellen).
//
// Samen spelen: alles hier is van de speler zelf (geld, gezondheid, zoekniveau en de eigen save); er hangt geen beloning of
// voortgang aan en er gaat niets over het netwerk.

const num = (n, d = 0) => (Number.isFinite(Number(n)) ? Number(n) : d);
export const euro = (n) => '€' + Math.round(num(n)).toLocaleString('nl-NL');

// Onder deze gezondheid is het getal rood (met een woord erbij, nooit alleen kleur).
export const GEZONDHEID_LAAG = 35;
// Een spel dat zo lang niet is opgeslagen komt in de strook Aandacht (het spel bewaart ook vanzelf; dit is een zachte hint).
export const LANG_GELEDEN_MIN = 20;

// De drie blokken van de kopband. wanted: 0 tot 5 sterren.
export function kopStatus({ money = 0, health = 100, wanted = 0 } = {}) {
  const gezond = Math.max(0, Math.min(100, Math.round(num(health, 100))));
  const sterren = Math.max(0, Math.min(5, Math.round(num(wanted))));
  return {
    geld: euro(Math.max(0, num(money))),
    gezond, gezondLaag: gezond < GEZONDHEID_LAAG,
    sterren,
    gezocht: sterren ? `${sterren} ${sterren === 1 ? 'ster' : 'sterren'}` : 'Niet',
  };
}

// De strook Aandacht: hoogstens drie regels, elk { soort: 'nu' | 'vandaag' | 'nieuw', icoon, kop, sub, doel }.
// Bronnen (besluit coördinator 24-11): ongelezen berichten, het evenement van vandaag en een spel dat lang niet is opgeslagen.
// Een bron die er niet is, levert geen regel; geen regels = de strook verdwijnt.
export function aandachtRegels({ ongelezen = 0, evenement = null, minutenSindsOpslaan = null, max = 3 } = {}) {
  const uit = [];
  if (evenement && evenement.naam) uit.push({ soort: 'vandaag', icoon: 'datum', kop: `${evenement.naam} is vandaag`, sub: evenement.sub || 'Staat in de agenda', doel: 'todo' });
  const n = Math.max(0, Math.floor(num(ongelezen)));
  if (n > 0) uit.push({ soort: 'nieuw', icoon: 'bericht', kop: n === 1 ? 'Je hebt een bericht' : `Je hebt ${n} berichten`, sub: `${n} ongelezen in Verhaal`, doel: 'verhaal' });
  const m = minutenSindsOpslaan;
  if (m != null && num(m) >= LANG_GELEDEN_MIN) uit.push({ soort: 'nu', icoon: 'opslaan', kop: 'Lang niet opgeslagen', sub: `${Math.round(num(m))} min geleden`, doel: 'opslaan' });
  return { regels: uit.slice(0, max), meer: Math.max(0, uit.length - max) };
}

// Wat je verliest als je terugzet naar de laatste opslag of laadt zonder op te slaan: het verschil tussen de lopende stand en de save.
// nu en save: { speeltijd (s), money, missies, plek }. Negatieve verschillen (je hebt minder dan de save) tellen niet als verlies.
export function verliesSinds(nu = {}, save = {}) {
  const sec = Math.max(0, num(nu.speeltijd) - num(save.speeltijd));
  const min = Math.floor(sec / 60);
  const geld = Math.max(0, num(nu.money) - num(save.money));
  const missies = Math.max(0, num(nu.missies) - num(save.missies));
  return { min, geld, missies, leeg: min < 1 && geld <= 0 && missies <= 0 };
}

// De regels van de verlieslijst als gewone tekst (de view zet er een icoon voor).
export function verliesTekst(v, { missieNaam = '' } = {}) {
  if (!v || v.leeg) return 'Je hebt sinds je laatste opslag niets gedaan dat verloren kan gaan.';
  const d = [];
  if (v.min >= 1) d.push(`${v.min} min speeltijd`);
  if (v.geld > 0) d.push(`+${euro(v.geld)}`);
  if (v.missies > 0) d.push(v.missies === 1 && missieNaam ? `de missie “${missieNaam}”` : `${v.missies} ${v.missies === 1 ? 'missie' : 'missies'}`);
  return d.join(' · ');
}

// Vergelijking bij overschrijven: oud (wat in de plek staat) tegenover nieuw (de lopende stand).
// Geeft ook of het veilig is: dezelfde speler en minstens evenveel speeltijd in het nieuwe spel.
export function slotVergelijk(oud = {}, nieuw = {}) {
  const meerInOud = num(oud.speeltijd) > num(nieuw.speeltijd);
  const anderVerhaal = !!(oud.character && nieuw.character && oud.character !== nieuw.character);
  const veilig = !meerInOud && !anderVerhaal;
  let waarschuwing = '';
  if (meerInOud) waarschuwing = 'Dit spel heeft meer speeltijd dan je huidige spel.';
  else if (anderVerhaal) waarschuwing = 'Dit is een ander spel dan je huidige spel.';
  return { veilig, meerInOud, anderVerhaal, waarschuwing };
}

// Vasthouden is alleen voor wat onomkeerbaar is (besluit 24-11): overschrijven en verwijderen van een save en de laatste opslag terugzetten.
export const VASTHOUD_MS = 600;
export const vraagtVasthouden = (soort) => ['overschrijven', 'verwijderen', 'terugzetten'].includes(soort);

// De bon van opgepakt en buiten westen. Alles komt uit de bestaande regels (economy.js bustFine, respawn.js): opgepakt kost een boete,
// wist het zoekniveau en laat een lopende missie mislukken; neergaan kost niets behalve een total loss van de Escapade.
export function uitslagBon({ busted = false, boete = 0, geld = 0, missieNaam = '', herstelEscapade = 0 } = {}) {
  const regels = [];
  const g = Math.max(0, num(geld));
  if (busted) {
    const b = Math.max(0, num(boete));
    regels.push({ label: 'Boete', waarde: b > 0 ? `−${euro(b)}` : 'geen', soort: b > 0 ? 'min' : 'goed' });
    regels.push({ label: 'Zoekniveau', waarde: 'gewist', soort: 'goed' });
    if (missieNaam) regels.push({ label: `Missie “${missieNaam}”`, waarde: 'opnieuw te starten', soort: '' });
    return { regels, over: euro(Math.max(0, g - b)), opnieuw: !!missieNaam };
  }
  regels.push({ label: 'Ziekenhuis', waarde: 'gratis', soort: 'goed' });
  regels.push({ label: 'Gezondheid', waarde: 'weer 100%', soort: 'goed' });
  if (missieNaam) regels.push({ label: `Missie “${missieNaam}”`, waarde: 'opnieuw te starten', soort: '' });
  if (num(herstelEscapade) > 0) regels.push({ label: 'Je Escapade', waarde: `nieuw ${euro(herstelEscapade)}`, soort: 'min' });
  else regels.push({ label: 'Je Escapade', waarde: 'staat bij de voordeur', soort: '' });
  return { regels, over: euro(g), opnieuw: !!missieNaam };
}

// De naam van de gekozen hoofdpersoon voor de recap (opts.character van models3d_people: 'tammo' of 'anita'). De recap noemt de speelbare
// hoofdpersoon bij zijn eigen naam en nooit de spreker van de verhaalregel ("Anita: ..." hoort bij de dialoogmarkering van de stap).
export function sprekerNaam(character) {
  return character === 'anita' ? 'Anita' : 'Tammo';
}

// De verhaalregel zonder het voorvoegsel van de spreker ("Anita: Honderdvijftig euro ..." wordt "Honderdvijftig euro ...").
export function zonderSpreker(lead) {
  return String(lead || '').replace(/^\s*(Tammo|Anita|Tessa)\s*:\s*/, '').trim();
}
